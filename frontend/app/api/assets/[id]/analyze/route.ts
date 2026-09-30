import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { imageFileName, readImage, readTags } from '../../../../../lib/assets';
import { getAIProvider } from '../../../../../lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 90;
type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const asset = await prisma.museumAsset.findUnique({
    where: { id },
    include: { sourceDocuments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!asset) return NextResponse.json({ error: '未找到文物。' }, { status: 404 });
  if (asset.status === 'PUBLISHED')
    return NextResponse.json({ error: '已发布文物不能直接重新分析。' }, { status: 409 });
  const fileName = imageFileName(asset.imageUrl);
  if (!fileName) return NextResponse.json({ error: '请先上传文物图片。' }, { status: 400 });

  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.museumAsset.updateMany({
      where: { id, status: { notIn: ['PROCESSING', 'PUBLISHED'] } },
      data: { status: 'PROCESSING' },
    });
    if (updated.count)
      await tx.auditLog.create({
        data: {
          action: 'AI_ANALYSIS_STARTED',
          entityType: 'MuseumAsset',
          entityId: id,
          actor: '本地工作人员',
        },
      });
    return updated.count;
  });
  if (!changed)
    return NextResponse.json({ error: '该文物正在分析，请稍后再试。' }, { status: 409 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (
        step: string,
        status: 'started' | 'done' | 'error' = 'done',
        message?: string,
      ) => {
        controller.enqueue(encoder.encode(`${JSON.stringify({ step, status, message })}\n`));
      };
      try {
        emit('读取图片', 'started');
        const { bytes, mime } = await readImage(fileName);
        const imageUrl = `data:${mime};base64,${bytes.toString('base64')}`;
        emit('读取图片');

        emit('解析资料', 'started');
        const sourceText = asset.sourceDocuments
          .map((document) => `${document.title}：${document.extractedText ?? ''}`)
          .join('\n\n')
          .slice(0, 16_000);
        emit('解析资料', 'done', sourceText.trim() ? undefined : '暂无来源资料，仅分析图片。');

        const provider = getAIProvider();
        emit('AI视觉分析', 'started');
        const visual = await provider.analyzeArtifactImage({
          imageUrl,
          context: sourceText.slice(0, 2_000),
        });
        emit(
          'AI视觉分析',
          'done',
          visual.source === 'fallback' ? '模型未返回可信结构，已使用安全回退结果。' : undefined,
        );

        emit('提取标签', 'started');
        const documentMetadata = sourceText.trim()
          ? await provider.extractMetadata({ sourceText })
          : null;
        const aiTags = [...new Set([...visual.tags, ...(documentMetadata?.tags ?? [])])].slice(
          0,
          20,
        );
        emit('提取标签');

        emit('生成结构化元数据', 'started');
        const entries: [string, string][] = [
          ['aiCategory', visual.category],
          ['aiMaterial', visual.material],
          ['visualDescription', visual.visualDescription],
          ['shapeFeatures', visual.shapeFeatures],
          ['patternFeatures', visual.patternFeatures],
          ['aiTags', JSON.stringify(aiTags)],
          ['confidence', String(visual.confidence)],
          ['analysisSource', visual.source],
          ['imageRawOutput', visual.rawOutput ?? ''],
          ['documentRawOutput', documentMetadata?.rawOutput ?? ''],
          ['documentSummary', documentMetadata?.description ?? '资料中未提供'],
        ];
        await prisma.$transaction(async (tx) => {
          await tx.assetMetadata.deleteMany({
            where: { museumAssetId: id, key: { in: entries.map(([key]) => key) } },
          });
          await tx.assetMetadata.createMany({
            data: entries.map(([key, value]) => ({ museumAssetId: id, key, value })),
          });
          await tx.museumAsset.update({ where: { id }, data: { status: 'REVIEW_REQUIRED' } });
          await tx.auditLog.create({
            data: {
              action: 'AI_ANALYSIS_COMPLETED',
              entityType: 'MuseumAsset',
              entityId: id,
              actor: 'AI Provider',
              details: JSON.stringify({
                provider: provider.name,
                source: visual.source,
                confidence: visual.confidence,
              }),
            },
          });
        });
        emit('生成结构化元数据');
        emit('完成');
      } catch {
        await prisma
          .$transaction(async (tx) => {
            await tx.museumAsset.update({ where: { id }, data: { status: 'DRAFT' } });
            await tx.auditLog.create({
              data: {
                action: 'AI_ANALYSIS_FAILED',
                entityType: 'MuseumAsset',
                entityId: id,
                actor: '系统',
                details: '分析未完成，已恢复草稿状态。',
              },
            });
          })
          .catch(() => {});
        emit('分析失败', 'error', '分析未完成，请检查图片和服务配置后重试。');
      } finally {
        controller.close();
      }
    },
  });
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
