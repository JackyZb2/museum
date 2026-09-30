import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const createdIds: string[] = [];
const node = process.execPath;

async function startApp(port: number, environment: Record<string, string>): Promise<ChildProcess> {
  const child = spawn(
    node,
    ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...environment },
      stdio: 'ignore',
    },
  );
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`测试前端提前退出：${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/assets`);
      if (response.ok) return child;
    } catch {
      /* 服务尚未就绪 */
    }
    await delay(250);
  }
  child.kill();
  throw new Error('测试前端未能按时启动。');
}

async function createAsset(withDocument: boolean): Promise<string> {
  const museum = await db.museum.upsert({
    where: { id: 'museum-main' },
    update: {},
    create: { id: 'museum-main', name: '博物馆工作区' },
  });
  const asset = await db.museumAsset.create({
    data: {
      museumId: museum.id,
      name: '讲解流程测试文物',
      status: 'REVIEW_REQUIRED',
      sourceDocuments: withDocument
        ? {
            create: {
              title: '馆藏登记',
              fileName: '馆藏登记.txt',
              extractedText: '登记资料载明：这是一件陶制器物。',
            },
          }
        : undefined,
    },
  });
  createdIds.push(asset.id);
  return asset.id;
}

async function generate(port: number, assetId: string, staffSourceText = '') {
  return fetch(`http://127.0.0.1:${port}/api/assets/${assetId}/narrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffSourceText }),
  });
}

async function main() {
  const mockPort = 33151;
  const realPort = 33152;
  const fakeServer = createServer((_request, response) => {
    if (mode === 'error') {
      response.writeHead(500);
      response.end('模型暂不可用');
      return;
    }
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ choices: [{ message: { content: '{不是合法JSON' } }] }));
  });
  let mode: 'error' | 'invalid' = 'error';
  await new Promise<void>((resolve) => fakeServer.listen(0, '127.0.0.1', resolve));
  const address = fakeServer.address();
  if (!address || typeof address === 'string') throw new Error('模拟模型服务启动失败。');
  let mockApp: ChildProcess | null = null;
  let realApp: ChildProcess | null = null;
  try {
    mockApp = await startApp(mockPort, { DEMO_MODE: 'true', AI_API_KEY: '' });
    const withDocs = await createAsset(true);
    const withDocsResponse = await generate(mockPort, withDocs, '工作人员记录：此器物材质为陶。');
    assert.equal(withDocsResponse.status, 200, await withDocsResponse.text());
    const first = await db.narration.findMany({ where: { museumAssetId: withDocs } });
    assert.equal(first.length, 4);
    assert.ok(first.every((item) => item.status === 'AI_GENERATED' && item.version === 1));
    assert.ok(first.every((item) => JSON.parse(item.sourceDocumentIds).length > 0));
    const sourceIds = JSON.parse(first[0].sourceDocumentIds) as string[];
    assert.ok(await db.sourceDocument.findFirst({ where: { id: sourceIds[0], source: 'STAFF' } }));
    assert.ok(
      await db.auditLog.findFirst({ where: { entityId: withDocs, action: 'NARRATION_GENERATED' } }),
    );
    const listResponse = await fetch(
      `http://127.0.0.1:${mockPort}/api/assets/${withDocs}/narrations`,
    );
    assert.equal(listResponse.status, 200);
    const listed = (await listResponse.json()) as {
      sourceDocuments: { name: string }[];
      sourceReference: { quote: string }[];
    }[];
    assert.ok(
      listed.some((item) =>
        item.sourceDocuments.some((document) => document.name === '工作人员手动输入资料'),
      ),
    );
    assert.ok(listed.every((item) => item.sourceReference.length > 0));
    const secondResponse = await generate(mockPort, withDocs);
    assert.equal(secondResponse.status, 200, await secondResponse.text());
    assert.equal(await db.narration.count({ where: { museumAssetId: withDocs, version: 2 } }), 4);

    const noDocs = await createAsset(false);
    const noDocsResponse = await generate(mockPort, noDocs);
    assert.equal(noDocsResponse.status, 200, await noDocsResponse.text());
    const limited = await db.narration.findMany({ where: { museumAssetId: noDocs } });
    assert.equal(limited.length, 4);
    assert.ok(
      limited.every(
        (item) =>
          item.isLimited &&
          item.sourceDocumentIds === '[]' &&
          item.content.includes('资料中未提供相关信息'),
      ),
    );
    mockApp.kill();
    mockApp = null;

    realApp = await startApp(realPort, {
      DEMO_MODE: 'false',
      AI_API_KEY: 'test-only',
      AI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
      AI_MODEL: 'test-model',
    });
    const errorAsset = await createAsset(true);
    const apiError = await generate(realPort, errorAsset);
    assert.equal(apiError.status, 502);
    assert.equal(await db.narration.count({ where: { museumAssetId: errorAsset } }), 0);

    mode = 'invalid';
    const invalidAsset = await createAsset(true);
    const invalidJson = await generate(realPort, invalidAsset);
    assert.equal(invalidJson.status, 502);
    assert.equal(await db.narration.count({ where: { museumAssetId: invalidAsset } }), 0);
    console.info('四种情况通过：有资料、无资料、AI API 错误、非法 JSON；版本号与审计记录已验证。');
  } finally {
    mockApp?.kill();
    realApp?.kill();
    await new Promise<void>((resolve) => fakeServer.close(() => resolve()));
    for (const assetId of createdIds) {
      await db.auditLog.deleteMany({ where: { entityId: assetId } });
      await db.sourceDocument.deleteMany({ where: { museumAssetId: assetId } });
      await db.museumAsset.delete({ where: { id: assetId } });
    }
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
