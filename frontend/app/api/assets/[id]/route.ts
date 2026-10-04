import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { metadataMap, readTags } from '../../../../lib/assets';
import { apiFailure, withApiErrors } from '../../../../lib/api-errors';

export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };

export const GET = withApiErrors(async (_request: NextRequest, context: Context) => {
  const { id } = await context.params;
  const asset = await prisma.museumAsset.findUnique({
    where: { id },
    include: {
      metadata: true,
      sourceDocuments: { orderBy: { createdAt: 'asc' } },
      narrations: { select: { variant: true, version: true, status: true } },
    },
  });
  if (!asset) return NextResponse.json({ error: '未找到文物。' }, { status: 404 });
  const metadata = metadataMap(asset.metadata);
  return NextResponse.json({
    id: asset.id,
    name: asset.name,
    inventoryNumber: asset.inventoryNumber,
    category: asset.category,
    dynasty: asset.dynasty,
    material: asset.material,
    dimensions: asset.dimensions,
    description: asset.description,
    imageUrl: asset.imageUrl,
    status: asset.status,
    authorizationStatus: asset.authorizationStatus,
    approvedNarrationCount: asset.narrations.filter((item) => item.status === 'APPROVED').length,
    narrationReview: ['GENERAL', 'CHILDREN', 'PROFESSIONAL', 'SHORT'].map((variant) => {
      const current = asset.narrations
        .filter((item) => item.variant === variant)
        .sort((a, b) => b.version - a.version)[0];
      return { variant, version: current?.version ?? null, status: current?.status ?? null };
    }),
    metadata: {
      visualDescription: metadata.visualDescription ?? null,
      shapeFeatures: metadata.shapeFeatures ?? null,
      patternFeatures: metadata.patternFeatures ?? null,
      aiCategory: metadata.aiCategory ?? null,
      aiMaterial: metadata.aiMaterial ?? null,
      confidence: metadata.confidence ? Number(metadata.confidence) : null,
      source: metadata.analysisSource ?? null,
      aiTags: readTags(metadata.aiTags),
      manualTags: readTags(metadata.manualTags),
      reviewedTags: metadata.reviewedTags === undefined ? null : readTags(metadata.reviewedTags),
      documentSummary: metadata.documentSummary ?? null,
    },
    sourceDocuments: asset.sourceDocuments.map(
      ({ id: documentId, title, extractedText, source }) => ({
        id: documentId,
        title,
        extractedText,
        source,
      }),
    ),
  });
});

export async function PATCH(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return NextResponse.json({ error: '提交内容无效。' }, { status: 400 });
  const values = body as Record<string, unknown>;
  const fields = [
    'name',
    'inventoryNumber',
    'category',
    'dynasty',
    'material',
    'dimensions',
    'description',
  ] as const;
  const data: Record<string, string | null> = {};
  for (const key of fields) {
    if (!(key in values)) continue;
    if (
      typeof values[key] !== 'string' ||
      values[key].length > (key === 'description' ? 5000 : 120)
    ) {
      return NextResponse.json({ error: '字段内容无效或过长。' }, { status: 400 });
    }
    data[key] = values[key].trim() || null;
  }
  if ('name' in data && !data.name)
    return NextResponse.json({ error: '文物名称不能为空。' }, { status: 400 });
  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: '没有需要保存的字段。' }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.museumAsset.findUnique({ where: { id }, select: { status: true } });
      if (current?.status === 'PROCESSING') throw new Error('processing');
      await tx.museumAsset.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          action: 'ASSET_UPDATED',
          entityType: 'MuseumAsset',
          entityId: id,
          actor: '本地工作人员',
          details: JSON.stringify(Object.keys(data)),
        },
      });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'processing')
      return NextResponse.json(
        { error: '文物正在分析，暂不能保存基本字段。已填写内容保留，请分析完成后保存。' },
        { status: 409 },
      );
    return apiFailure(error);
  }
}
