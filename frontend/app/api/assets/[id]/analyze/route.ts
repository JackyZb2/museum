import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { imageFileName, readImage, readTags } from '../../../../../lib/assets';
import { getAIProvider } from '../../../../../lib/ai';
import { withApiErrors } from '../../../../../lib/api-errors';

export const runtime = 'nodejs';
export const maxDuration = 90;
type Context = { params: Promise<{ id: string }> };

export const POST = withApiErrors(async (_request: NextRequest, context: Context) => {
  const { id } = await context.params;
  const asset = await prisma.museumAsset.findUnique({
    where: { id },
    include: { sourceDocuments: { orderBy: { createdAt: 'asc' } }, metadata: true },
  });
  if (!asset) return NextResponse.json({ error: '未找到文物。' }, { status: 404 });
  if (asset.status === 'PUBLISHED')
    return NextResponse.json({ error: '已发布文物不能直接重新分析。' }, { status: 409 });
  const fileName = imageFileName(asset.imageUrl);
  if (!fileName) return NextResponse.json({ error: '请先上传文物图片。' }, { status: 400 });

  const claimTime = new Date();
  const previousStatus = asset.status === 'PROCESSING' ? 'DRAFT' : asset.status;
  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.museumAsset.updateMany({
      where: {
        id,
        OR: [
          { status: { notIn: ['PROCESSING', 'PUBLISHED'] } },
          { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
        ],
      },
      data: { status: 'PROCESSING', updatedAt: claimTime },
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
    return NextResponse.json(
      { error: '该文物正在分析，请勿重复提交。若服务曾中断，五分钟后可重新分析。' },
      { status: 409 },
    );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let disconnected = false;
      const emit = (
        step: string,
        status: 'started' | 'done' | 'error' = 'done',
        message?: string,
      ) => {
        if (!disconnected) {
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify({ step, status, message })}\n`));
          } catch {
            disconnected = true;
          }
        }
      };
      try {
        emit('读取图片', 'started');
        const { bytes, mime } = await readImage(fileName).catch(() => {
          throw new Error('无法读取文物图片，文件可能已丢失或损坏。请核对本地图片存储后重试。');
        });
        const imageUrl = `data:${mime};base64,${bytes.toString('base64')}`;
        emit('读取图片');

        emit('解析资料', 'started');
        const sourceText = asset.sourceDocuments
          .filter((document) => Boolean(document.extractedText?.trim()))
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
          visual.source === 'fallback'
            ? 'AI 服务不可用、返回空结果或结构无效；已安全回退，请人工核对。'
            : provider.name === 'mock'
              ? '当前使用模拟模型（演示模式或未配置密钥），不代表真实识图。'
              : undefined,
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
        let entries: [string, string][] = [
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
        if (
          visual.source === 'fallback' &&
          asset.metadata.some((item) => item.key === 'visualDescription' && item.value.trim())
        ) {
          entries = [
            ['lastAnalysisWarning', '本次模型分析失败，已保留上次知识卡结果，请人工核对。'],
            ['lastFailedImageRawOutput', visual.rawOutput || ''],
          ];
        }
        await prisma.$transaction(async (tx) => {
          const completed = await tx.museumAsset.updateMany({
            where: { id, status: 'PROCESSING', updatedAt: claimTime },
            data: { status: 'REVIEW_REQUIRED' },
          });
          if (completed.count !== 1) throw new Error('分析任务状态已变化');
          await tx.assetMetadata.deleteMany({
            where: { museumAssetId: id, key: { in: entries.map(([key]) => key) } },
          });
          await tx.assetMetadata.createMany({
            data: entries.map(([key, value]) => ({ museumAssetId: id, key, value })),
          });
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
      } catch (error) {
        await prisma
          .$transaction(async (tx) => {
            await tx.museumAsset.updateMany({
              where: { id, status: 'PROCESSING', updatedAt: claimTime },
              data: { status: previousStatus },
            });
            await tx.auditLog.create({
              data: {
                action: 'AI_ANALYSIS_FAILED',
                entityType: 'MuseumAsset',
                entityId: id,
                actor: '系统',
                details: '分析未完成，已尝试恢复分析前状态，已有元数据未覆盖。',
              },
            });
          })
          .catch(() => {});
        emit(
          '分析失败',
          'error',
          error instanceof Error && error.message.startsWith('无法读取文物图片')
            ? error.message
            : '分析未完成，请检查图片和本地数据库后重试。已有资料未清空；若仍显示处理中，请恢复数据库连接后刷新确认。',
        );
      } finally {
        try {
          controller.close();
        } catch {
          /* The client may have disconnected. */
        }
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
});
