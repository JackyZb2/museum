import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { readImage } from '../../../../../../lib/assets';
import { withApiErrors } from '../../../../../../lib/api-errors';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string; fileName: string }> };

export const GET = withApiErrors(async (_request: NextRequest, context: Context) => {
  const { id, fileName } = await context.params;
  const asset = await prisma.museumAsset.findUnique({ where: { id }, select: { imageUrl: true } });
  if (!asset || asset.imageUrl !== `/api/assets/${id}/image/${fileName}`)
    return new NextResponse(null, { status: 404 });
  try {
    const { bytes, mime } = await readImage(fileName);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, max-age=60',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
});
