import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { apiFailure, withApiErrors } from '../../../../../../lib/api-errors';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string; narrationId: string }> };

async function input(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

export const PATCH = withApiErrors(async (request: NextRequest, context: Context) => {
  const { id, narrationId } = await context.params;
  const body = await input(request);
  const content = body?.content;
  const updatedAt = body?.updatedAt;
  if (
    typeof content !== 'string' ||
    !content.trim() ||
    content.length > 10_000 ||
    typeof updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(updatedAt))
  ) {
    return NextResponse.json({ error: '讲解内容或版本信息无效。' }, { status: 400 });
  }
  const narration = await prisma.narration.findFirst({
    where: { id: narrationId, museumAssetId: id },
  });
  if (!narration) return NextResponse.json({ error: '未找到讲解版本。' }, { status: 404 });
  if (narration.status === 'APPROVED')
    return NextResponse.json(
      { error: '已审核版本不能修改。请重新生成新版本后编辑。' },
      { status: 409 },
    );
  if (narration.status !== 'AI_GENERATED' && narration.status !== 'EDITED')
    return NextResponse.json({ error: '此讲解版本不可编辑。' }, { status: 409 });
  const trimmed = content.trim();
  if (trimmed === narration.content)
    return NextResponse.json({ error: '内容没有变化，无需保存。' }, { status: 400 });
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.narration.updateMany({
        where: {
          id: narrationId,
          museumAssetId: id,
          updatedAt: new Date(updatedAt),
          status: { in: ['AI_GENERATED', 'EDITED'] },
        },
        data: { content: trimmed, status: 'EDITED' },
      });
      if (result.count !== 1) throw new Error('conflict');
      await tx.auditLog.create({
        data: {
          action: 'NARRATION_EDITED',
          entityType: 'MuseumAsset',
          entityId: id,
          actor: '本地工作人员',
          details: JSON.stringify({
            narrationId,
            variant: narration.variant,
            version: narration.version,
          }),
        },
      });
    });
    return NextResponse.json({ success: true, status: 'EDITED' });
  } catch (error) {
    if (error instanceof Error && error.message === 'conflict')
      return NextResponse.json(
        { error: '版本已发生变化，请先复制保留当前文字，再刷新核对。' },
        { status: 409 },
      );
    return apiFailure(error);
  }
});

export const POST = withApiErrors(async (request: NextRequest, context: Context) => {
  const { id, narrationId } = await context.params;
  const body = await input(request);
  const updatedAt = body?.updatedAt;
  if (typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt)))
    return NextResponse.json({ error: '讲解版本信息无效。' }, { status: 400 });
  const narration = await prisma.narration.findFirst({
    where: { id: narrationId, museumAssetId: id },
  });
  if (!narration) return NextResponse.json({ error: '未找到讲解版本。' }, { status: 404 });
  if (narration.status === 'APPROVED')
    return NextResponse.json({ error: '此版本已经审核通过。' }, { status: 409 });
  if (narration.status !== 'AI_GENERATED' && narration.status !== 'EDITED')
    return NextResponse.json({ error: '此讲解版本不可审核。' }, { status: 409 });
  try {
    await prisma.$transaction(async (tx) => {
      const result = await tx.narration.updateMany({
        where: {
          id: narrationId,
          museumAssetId: id,
          updatedAt: new Date(updatedAt),
          status: { in: ['AI_GENERATED', 'EDITED'] },
        },
        data: { status: 'APPROVED' },
      });
      if (result.count !== 1) throw new Error('conflict');
      await tx.auditLog.create({
        data: {
          action: 'NARRATION_APPROVED',
          entityType: 'MuseumAsset',
          entityId: id,
          actor: '本地工作人员',
          details: JSON.stringify({
            narrationId,
            variant: narration.variant,
            version: narration.version,
          }),
        },
      });
    });
    return NextResponse.json({ success: true, status: 'APPROVED' });
  } catch (error) {
    if (error instanceof Error && error.message === 'conflict')
      return NextResponse.json({ error: '版本已发生变化，请刷新后重新审核。' }, { status: 409 });
    return apiFailure(error);
  }
});
