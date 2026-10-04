import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { readImage } from '../../../../../lib/assets';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { demoItem, DEMO_MUSEUM_ID } from '../../../../../lib/demo/catalog';
import { withApiErrors } from '../../../../../lib/api-errors';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export const GET = withApiErrors(async (_request: NextRequest, context: Context) => {
  const { id } = await context.params;
  const asset = await prisma.museumAsset.findFirst({
    where: { id, status: 'PUBLISHED' },
    select: { imageUrl: true, museumId: true },
  });
  const demo = demoItem(id);
  if (demo && asset?.museumId === DEMO_MUSEUM_ID && asset.imageUrl === demo.image) {
    try {
      const bytes = await readFile(path.join(process.cwd(), 'public', demo.image));
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch {
      return new NextResponse(null, { status: 404 });
    }
  }
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
});
