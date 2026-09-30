import 'server-only';

import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const UPLOAD_DIRECTORY = path.join(process.cwd(), '.local-uploads');

export function imageMime(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  return null;
}

export async function saveImage(file: File): Promise<{ fileName: string; mime: string }> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES)
    throw new Error('图片大小须在 0～8 MB 之间。');
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = imageMime(bytes);
  if (!mime) throw new Error('仅支持 JPEG、PNG 或 WebP 图片。');
  const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
  const fileName = `${randomUUID()}.${extension}`;
  await mkdir(UPLOAD_DIRECTORY, { recursive: true });
  await writeFile(path.join(UPLOAD_DIRECTORY, fileName), bytes, { flag: 'wx' });
  return { fileName, mime };
}

export async function readImage(fileName: string): Promise<{ bytes: Buffer; mime: string }> {
  if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(fileName)) throw new Error('图片路径无效。');
  const bytes = await readFile(path.join(UPLOAD_DIRECTORY, fileName));
  const mime = imageMime(bytes);
  if (!mime || bytes.length > MAX_IMAGE_BYTES) throw new Error('图片文件无效。');
  return { bytes, mime };
}

export function imageFileName(imageUrl: string | null): string | null {
  const match = imageUrl?.match(/^\/api\/assets\/[^/]+\/image\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/);
  return match?.[1] ?? null;
}

export function metadataMap(items: { key: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(items.map(({ key, value }) => [key, value]));
}

export function readTags(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter((item): item is string => typeof item === 'string' && item.length <= 50)
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
