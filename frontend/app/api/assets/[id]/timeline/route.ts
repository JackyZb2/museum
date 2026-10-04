import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { withApiErrors } from '../../../../../lib/api-errors';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export const GET = withApiErrors(async (_request: NextRequest, context: Context) => {
  const { id } = await context.params;
  const asset = await prisma.museumAsset.findUnique({ where: { id }, select: { id: true } });
  if (!asset) return NextResponse.json({ error: '未找到文物。' }, { status: 404 });
  const logs = await prisma.auditLog.findMany({
    where: { entityType: 'MuseumAsset', entityId: id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 100,
    select: { id: true, action: true, actor: true, details: true, createdAt: true },
  });
  return NextResponse.json(
    logs.map(({ details, ...log }) => {
      let parsed: unknown = null;
      try {
        parsed = details ? JSON.parse(details) : null;
      } catch {
        /* 旧记录可能不是 JSON */
      }
      const item =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {};
      return {
        ...log,
        variant: typeof item.variant === 'string' ? item.variant : null,
        version: typeof item.version === 'number' ? item.version : null,
        variants: Array.isArray(item.variants) ? item.variants : [],
      };
    }),
  );
});
