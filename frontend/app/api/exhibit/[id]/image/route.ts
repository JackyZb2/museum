import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { readImage } from '../../../../../lib/assets';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  const asset = await prisma.museumAsset.findFirst({
    where: { id, status: 'PUBLISHED' },
    select: { imageUrl: true },
  });
  const prefix = `/api/assets/${id}/image/`;
  if (!asset?.imageUrl?.startsWith(prefix)) return new NextResponse(null, { status: 404 });
  try {
    const { bytes, mime } = await readImage(asset.imageUrl.slice(prefix.length));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=60',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
