import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, readdir, unlink, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { DEMO_CATALOG, DEMO_MUSEUM_ID, DEMO_NOTICE } from '../lib/demo/catalog';

async function main() {
  const directory = await mkdtemp(path.join(process.cwd(), '.local-demo-test-'));
  const url = `file:${path.join(directory, 'demo.db').replaceAll('\\', '/')}`;
  const db = new PrismaClient({ datasourceUrl: url });
  const base = 'http://127.0.0.1:33156';
  let app: ChildProcess | undefined;
  let externalCalls = 0;
  const trap = createServer((_request, response) => {
    externalCalls++;
    response.writeHead(503).end();
  });
  await new Promise<void>((resolve) => trap.listen(33157, '127.0.0.1', resolve));
  try {
    await writeFile(path.join(directory, 'demo.db'), '');
    const migration = spawnSync(
      process.execPath,
      ['node_modules/prisma/build/index.js', 'migrate', 'deploy'],
      { env: { ...process.env, PRISMA_DATABASE_URL: url }, stdio: 'inherit' },
    );
    assert.equal(migration.status, 0);
    await db.museum.create({ data: { id: 'ordinary-museum', name: '正常馆藏测试' } });
    await db.museumAsset.create({
      data: {
        id: 'ordinary-asset',
        museumId: 'ordinary-museum',
        name: '不可被演示重置删除的正常文物',
      },
    });
    app = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '-p', '33156', '-H', '127.0.0.1'],
      {
        env: {
          ...process.env,
          MUSEUMAI_BUILD_DIR: '.next-publish-test',
          PRISMA_DATABASE_URL: url,
          DEMO_MODE: 'false',
          AI_API_KEY: 'test-key-never-send',
          AI_BASE_URL: 'http://127.0.0.1:33157/v1',
        },
        stdio: 'inherit',
      },
    );
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      if (app.exitCode !== null) throw new Error('测试服务提前退出');
      try {
        if ((await fetch(`${base}/api/demo`)).ok) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for local server. */
      }
      await delay(250);
    }
    assert.ok(ready, '本地服务启动超时');
    async function post(body: object, status = 200) {
      const response = await fetch(`${base}/api/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      assert.equal(response.status, status, JSON.stringify(data));
      return data;
    }
    await post({ action: 'initialize' });
    await post({ action: 'initialize' });
    assert.equal(await db.museumAsset.count({ where: { museumId: DEMO_MUSEUM_ID } }), 3);
    assert.equal(await db.sourceDocument.count({ where: { source: 'DEMO' } }), 3);
    assert.equal((await fetch(`${base}/demo`)).status, 200);
    await post({ action: 'step', id: 'ordinary-asset', step: 1 }, 409);
    await post({ action: 'step', id: DEMO_CATALOG[0].id, step: 8 }, 409);
    await post({ action: 'step', id: DEMO_CATALOG[0].id, step: 0 }, 400);
    for (const sample of DEMO_CATALOG) {
      assert.equal((await fetch(`${base}${sample.image}`)).status, 200);
      assert.equal((await fetch(`${base}/exhibit/${sample.id}`)).status, 404);
      for (let step = 1; step <= 6; step++) await post({ action: 'step', id: sample.id, step });
      await post({ action: 'step', id: sample.id, step: 6 });
      const drafts = await db.narration.findMany({ where: { museumAssetId: sample.id } });
      assert.equal(
        (await db.museumAsset.findUniqueOrThrow({ where: { id: sample.id } })).status,
        'REVIEW_REQUIRED',
      );
      const raw = await db.assetMetadata.findUniqueOrThrow({
        where: { museumAssetId_key: { museumAssetId: sample.id, key: 'imageRawOutput' } },
      });
      assert.ok(JSON.parse(raw.value).visualDescription);
      assert.equal(drafts.length, 4);
      for (const draft of drafts) {
        assert.equal(draft.status, 'AI_GENERATED');
        assert.equal(draft.generationSource, 'mock');
        assert.ok(JSON.parse(draft.sourceDocumentIds).length);
      }
      await post({ action: 'step', id: sample.id, step: 7 }, 409);
      assert.equal((await fetch(`${base}/exhibit/${sample.id}`)).status, 404);
      await post({ action: 'initialize' });
      await post({ action: 'step', id: sample.id, step: 7, confirmed: true });
      await post({ action: 'step', id: sample.id, step: 8 });
      await post({ action: 'step', id: sample.id, step: 8 });
      assert.equal(
        await db.narration.count({ where: { museumAssetId: sample.id, status: 'APPROVED' } }),
        4,
      );
      assert.equal(
        await db.auditLog.count({ where: { entityId: sample.id, action: 'ASSET_PUBLISHED' } }),
        1,
      );
      const page = await fetch(`${base}/exhibit/${sample.id}`);
      assert.equal(page.status, 200);
      assert.ok((await page.text()).includes(DEMO_NOTICE));
      const image = await fetch(`${base}/api/exhibit/${sample.id}/image`);
      assert.equal(image.status, 200);
      assert.match(image.headers.get('Content-Type') || '', /image\/svg\+xml/);
      assert.ok((await image.text()).includes('非真实馆藏照片'));
    }
    assert.equal(externalCalls, 0, '演示不能访问真实模型，即使已配置密钥');
    await post({ action: 'reset' });
    await post({ action: 'reset' });
    assert.equal(await db.narration.count(), 0);
    assert.equal(await db.museumAsset.count({ where: { museumId: DEMO_MUSEUM_ID } }), 3);
    assert.equal(await db.sourceDocument.count(), 3);
    assert.ok(await db.museumAsset.findUnique({ where: { id: 'ordinary-asset' } }));
    for (const sample of DEMO_CATALOG)
      assert.equal((await fetch(`${base}/exhibit/${sample.id}`)).status, 404);
    for (let step = 1; step <= 8; step++)
      await post({ action: 'step', id: DEMO_CATALOG[0].id, step, confirmed: step === 7 });
    assert.equal((await fetch(`${base}/exhibit/${DEMO_CATALOG[0].id}`)).status, 200);
    console.log(
      '通过：三个样本完整闭环、人工确认门槛、幂等与恢复、重复重置、正常馆藏保留、模拟模型隔离、游客页及本地图片。',
    );
  } finally {
    if (app && app.exitCode === null) {
      const stopped = new Promise<void>((resolve) => app!.once('exit', () => resolve()));
      app.kill();
      await stopped;
    }
    await new Promise<void>((resolve) => trap.close(() => resolve()));
    await db.$disconnect();
    for (const file of await readdir(directory)) await unlink(path.join(directory, file));
    await rmdir(directory);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
