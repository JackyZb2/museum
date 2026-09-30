import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../../lib/prisma';
import { saveImage, UPLOAD_DIRECTORY } from '../../../lib/assets';

export const runtime = 'nodejs';

export async function GET() {
  const assets = await prisma.museumAsset.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, category: true, imageUrl: true, status: true, createdAt: true },
  });
  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  let uploadedFileName: string | null = null;
  try {
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const inventoryNumber = String(form.get('inventoryNumber') ?? '').trim();
    const category = String(form.get('category') ?? '').trim();
    const material = String(form.get('material') ?? '').trim();
    const dynasty = String(form.get('dynasty') ?? '').trim();
    const description = String(form.get('description') ?? '').trim();
    const sourceText = String(form.get('sourceText') ?? '').trim();
    const file = form.get('image');
    if (!name || name.length > 120)
      return NextResponse.json({ error: '请填写文物名称（不超过 120 字）。' }, { status: 400 });
    if (!(file instanceof File))
      return NextResponse.json({ error: '请上传文物图片。' }, { status: 400 });
    if (
      [inventoryNumber, category, material, dynasty].some((item) => item.length > 120) ||
      description.length > 5000 ||
      sourceText.length > 16000
    ) {
      return NextResponse.json({ error: '输入内容过长，请精简后重试。' }, { status: 400 });
    }
    const uploaded = await saveImage(file);
    uploadedFileName = uploaded.fileName;
    const asset = await prisma.$transaction(async (tx) => {
      const museum = await tx.museum.upsert({
        where: { id: 'museum-main' },
        create: { id: 'museum-main', name: '博物馆工作区' },
        update: {},
      });
      const created = await tx.museumAsset.create({
        data: {
          museumId: museum.id,
          name,
          inventoryNumber: inventoryNumber || null,
          category: category || null,
          material: material || null,
          dynasty: dynasty || null,
          description: description || null,
          imageUrl: null,
          sourceDocuments: sourceText
            ? {
                create: {
                  title: '上传时提供的来源资料',
                  documentType: 'text',
                  extractedText: sourceText,
                },
              }
            : undefined,
        },
      });
      return tx.museumAsset.update({
        where: { id: created.id },
        data: { imageUrl: `/api/assets/${created.id}/image/${uploaded.fileName}` },
      });
    });
    return NextResponse.json({ id: asset.id }, { status: 201 });
  } catch (error) {
    if (uploadedFileName)
      await unlink(path.join(UPLOAD_DIRECTORY, uploadedFileName)).catch(() => {});
    const message =
      error instanceof Error &&
      (error.message.startsWith('图片') || error.message.startsWith('仅支持'))
        ? error.message
        : '创建文物失败，请检查藏品编号是否重复并重试。';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
