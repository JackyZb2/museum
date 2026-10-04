import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { apiFailure } from '../../../../../lib/api-errors';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const asset = await tx.museumAsset.findUnique({ where: { id }, select: { status: true } });
      if (!asset) return { status: 404, error: '未找到文物。' };
      if (asset.status === 'PUBLISHED') return { status: 409, error: '此文物已经发布。' };
      if (asset.status === 'PROCESSING')
        return { status: 409, error: '文物正在处理，暂不能发布。' };
      const approved = await tx.narration.count({
        where: { museumAssetId: id, status: 'APPROVED' },
      });
      if (approved === 0) return { status: 409, error: '至少审核通过一个讲解版本后才能发布。' };
      const updated = await tx.museumAsset.updateMany({
        where: { id, status: asset.status },
        data: { status: 'PUBLISHED' },
      });
      if (updated.count !== 1) return { status: 409, error: '文物状态已变化，请刷新后重试。' };
      await tx.auditLog.create({
        data: {
          action: 'ASSET_PUBLISHED',
          entityType: 'MuseumAsset',
          entityId: id,
          actor: '本地工作人员',
          details: JSON.stringify({ approvedNarrationCount: approved }),
        },
      });
      return { status: 200, success: true };
    });
    return NextResponse.json(result, { status: result.status });
  } catch (error) {
    return apiFailure(error);
  }
}
