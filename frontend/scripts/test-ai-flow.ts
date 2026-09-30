import 'dotenv/config';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3100';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lXcAAAAASUVORK5CYII=',
  'base64',
);
let createdId: string | null = null;
let savedFileName: string | null = null;

async function main() {
  const form = new FormData();
  form.set('name', 'Mock 流程测试文物');
  form.set('sourceText', '馆藏登记资料：测试文物，材质记录为陶。');
  form.set('image', new Blob([Uint8Array.from(png)], { type: 'image/png' }), 'test.png');
  const created = await fetch(`${base}/api/assets`, { method: 'POST', body: form });
  if (created.status !== 201)
    throw new Error(`创建失败：${created.status} ${await created.text()}`);
  const { id } = (await created.json()) as { id: string };
  createdId = id;

  const start = await fetch(`${base}/api/assets/${id}/analyze`, { method: 'POST' });
  if (start.status !== 200) throw new Error(`分析失败：${start.status} ${await start.text()}`);
  const events = (await start.text())
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as { step: string; status: string });
  for (const step of [
    '读取图片',
    '解析资料',
    'AI视觉分析',
    '提取标签',
    '生成结构化元数据',
    '完成',
  ]) {
    assert.ok(
      events.some((event) => event.step === step && event.status === 'done'),
      `${step} 未完成`,
    );
  }

  const detailResponse = await fetch(`${base}/api/assets/${id}`);
  assert.equal(detailResponse.status, 200);
  const detail = (await detailResponse.json()) as {
    status: string;
    metadata: { source: string; shapeFeatures: string; patternFeatures: string; aiTags: string[] };
  };
  assert.equal(detail.status, 'REVIEW_REQUIRED');
  assert.equal(detail.metadata.source, 'mock');
  assert.ok(detail.metadata.shapeFeatures);
  assert.ok(detail.metadata.patternFeatures);
  assert.ok(detail.metadata.aiTags.length);

  const tagResponse = await fetch(`${base}/api/assets/${id}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: ['人工核对'] }),
  });
  if (tagResponse.status !== 200) throw new Error(`标签保存失败：${await tagResponse.text()}`);
  const editResponse = await fetch(`${base}/api/assets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: '人工修订类别' }),
  });
  if (editResponse.status !== 200)
    throw new Error(`基本字段保存失败：${await editResponse.text()}`);

  const metadata = await db.assetMetadata.findMany({ where: { museumAssetId: id } });
  assert.ok(metadata.some((item) => item.key === 'imageRawOutput' && item.value.length > 0));
  assert.ok(metadata.some((item) => item.key === 'documentRawOutput' && item.value.length > 0));
  const actions = await db.auditLog.findMany({ where: { entityId: id }, select: { action: true } });
  assert.ok(actions.some((item) => item.action === 'AI_ANALYSIS_STARTED'));
  assert.ok(actions.some((item) => item.action === 'AI_ANALYSIS_COMPLETED'));
  console.info('Mock 全流程通过：上传、六阶段进度、元数据、人工编辑与审计记录。');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (createdId) {
      const asset = await db.museumAsset.findUnique({
        where: { id: createdId },
        select: { imageUrl: true },
      });
      savedFileName = asset?.imageUrl?.match(/\/image\/([0-9a-f-]{36}\.png)$/)?.[1] ?? null;
      await db.auditLog.deleteMany({ where: { entityId: createdId } });
      await db.museumAsset.delete({ where: { id: createdId } });
    }
    if (savedFileName) await unlink(path.join(process.cwd(), '.local-uploads', savedFileName));
    await db.$disconnect();
  });
