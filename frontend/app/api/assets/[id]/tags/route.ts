import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { apiFailure } from '../../../../../lib/api-errors';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    !Array.isArray((body as Record<string, unknown>).tags)
  ) {
    return NextResponse.json({ error: '标签格式无效。' }, { status: 400 });
  }
  const tags: unknown[] = (body as { tags: unknown[] }).tags;
  if (
    tags.length > 30 ||
    tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 50)
  ) {
    return NextResponse.json({ error: '最多 30 个标签，每个不超过 50 字。' }, { status: 400 });
  }
  const cleaned = [...new Set((tags as string[]).map((tag) => tag.trim()))];
  try {
    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.museumAsset.findUnique({ where: { id }, select: { id: true } });
      if (!asset) return null;
      await tx.assetMetadata.upsert({
        where: { museumAssetId_key: { museumAssetId: id, key: 'reviewedTags' } },
        create: { museumAssetId: id, key: 'reviewedTags', value: JSON.stringify(cleaned) },
        update: { value: JSON.stringify(cleaned) },
      });
      await tx.auditLog.create({
        data: {
          action: 'ASSET_TAGS_UPDATED',
          entityType: 'MuseumAsset',
          entityId: id,
          actor: '本地工作人员',
          details: JSON.stringify({ tags: cleaned }),
        },
      });
      return cleaned;
    });
    return result
      ? NextResponse.json({ tags: result })
      : NextResponse.json({ error: '未找到文物。' }, { status: 404 });
  } catch (error) {
    return apiFailure(error);
  }
}
