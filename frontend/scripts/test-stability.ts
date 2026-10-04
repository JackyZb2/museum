import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, readdir, unlink, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

async function main() {
  const directory = await mkdtemp(path.join(process.cwd(), '.local-qa-test-'));
  const uploadDirectory = path.join(directory, 'uploads');
  const url = `file:${path.join(directory, 'qa.db').replaceAll('\\', '/')}`;
  const db = new PrismaClient({ datasourceUrl: url });
  const base = 'http://127.0.0.1:33158';
  let app: ChildProcess | undefined;
  let mode = 'offline';
  let modelCalls = 0;
  const model = createServer(async (request, response) => {
    modelCalls++;
    request.resume();
    if (mode === 'offline') {
      request.socket.destroy();
      return;
    }
    if (mode === 'slow') await delay(500);
    if (mode === 'http-error') {
      response.writeHead(503).end();
      return;
    }
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({
        choices: [
          { message: { content: mode === 'invalid' ? 'not-json' : mode === 'empty' ? '' : '{}' } },
        ],
      }),
    );
  });
  await new Promise<void>((resolve) => model.listen(33159, '127.0.0.1', resolve));
  async function stop() {
    if (app && app.exitCode === null) {
      const stopped = new Promise<void>((resolve) => app!.once('exit', () => resolve()));
      app.kill();
      await stopped;
    }
  }
  async function start(key: string) {
    app = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '-p', '33158', '-H', '127.0.0.1'],
      {
        env: {
          ...process.env,
          MUSEUMAI_BUILD_DIR: '.next-publish-test',
          MUSEUMAI_UPLOAD_DIRECTORY: uploadDirectory,
          PRISMA_DATABASE_URL: url,
          DEMO_MODE: 'false',
          AI_API_KEY: key,
          AI_BASE_URL: 'http://127.0.0.1:33159/v1',
        },
        stdio: 'inherit',
      },
    );
    for (let attempt = 0; attempt < 80; attempt++) {
      if (app.exitCode !== null) throw new Error('测试服务提前退出');
      try {
        if ((await fetch(`${base}/api/assets`)).ok) return;
      } catch {
        /* Local startup. */
      }
      await delay(250);
    }
    throw new Error('测试服务启动超时');
  }
  async function json(route: string, method = 'GET', body?: object, status = 200) {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#d8c5a0' } })
    .png()
    .toBuffer();
  async function upload(name: string, bytes: Uint8Array = png, status = 201) {
    const form = new FormData();
    form.set('name', name);
    form.set('image', new Blob([new Uint8Array(bytes)], { type: 'image/png' }), 'sample.png');
    const response = await fetch(`${base}/api/assets`, { method: 'POST', body: form });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  async function analyze(id: string, expected = 200) {
    const response = await fetch(`${base}/api/assets/${id}/analyze`, { method: 'POST' });
    assert.equal(response.status, expected);
    const text = await response.text();
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  }
  try {
    await writeFile(path.join(directory, 'qa.db'), '');
    assert.equal(
      spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
        env: { ...process.env, PRISMA_DATABASE_URL: url },
        stdio: 'inherit',
      }).status,
      0,
    );
    await start('qa-key');
    await upload('   ', png, 400);
    await upload('伪造图片', Buffer.from('not an image'), 400);
    await upload('损坏图片', png.subarray(0, 24), 400);
    await upload('空图片', new Uint8Array(), 400);
    await upload('超大图片', new Uint8Array(8 * 1024 * 1024 + 1), 400);
    await writeFile(uploadDirectory, 'storage failure fixture');
    await upload('存储失败', png, 503);
    await unlink(uploadDirectory);
    const { id } = await upload('异常处理测试文物');
    const route = `/api/assets/${id}`;
    assert.equal(await db.sourceDocument.count({ where: { museumAssetId: id } }), 0);
    await db.sourceDocument.create({
      data: { museumAssetId: id, title: '空来源资料', extractedText: '   ' },
    });
    await json(route, 'PATCH', { name: '  ' }, 400);
    await json('/api/assets/missing', 'GET', undefined, 404);
    await json('/api/assets/missing', 'PATCH', { name: '有效名称' }, 404);
    await json('/api/assets/missing/publish', 'POST', undefined, 404);
    await analyze('missing', 404);
    await json(`${route}/publish`, 'POST', undefined, 409);
    assert.equal((await fetch(`${base}/exhibit/${id}`)).status, 404);
    assert.equal((await fetch(`${base}/api/exhibit/${id}/image`)).status, 404);
    assert.equal((await fetch(`${base}${route}`, { method: 'DELETE' })).status, 405);
    for (const failure of ['offline', 'http-error', 'invalid', 'empty', 'structure']) {
      mode = failure;
      const events = await analyze(id);
      assert.equal(events.at(-1).step, '完成');
      assert.ok(events.some((event) => event.message?.includes('安全回退')));
      assert.equal((await json(route)).metadata.confidence, 0);
    }
    await db.assetMetadata.update({
      where: { museumAssetId_key: { museumAssetId: id, key: 'visualDescription' } },
      data: { value: '原有知识卡描述，故障时不得清空。' },
    });
    mode = 'empty';
    await analyze(id);
    assert.equal(
      (await json(route)).metadata.visualDescription,
      '原有知识卡描述，故障时不得清空。',
    );
    await json(`${route}/narrations`, 'POST', { staffSourceText: '' });
    const limited = await db.narration.findMany({ where: { museumAssetId: id } });
    assert.equal(limited.length, 4);
    assert.ok(limited.every((item) => item.isLimited && item.status === 'AI_GENERATED'));
    for (const failure of ['offline', 'invalid', 'empty']) {
      mode = failure;
      await json(`${route}/narrations`, 'POST', { staffSourceText: '资料记录材质为陶。' }, 502);
      assert.equal(await db.narration.count({ where: { museumAssetId: id } }), 4);
    }
    mode = 'slow';
    const first = fetch(`${base}${route}/analyze`, { method: 'POST' });
    for (let retry = 0; retry < 40; retry++) {
      if ((await db.museumAsset.findUniqueOrThrow({ where: { id } })).status === 'PROCESSING')
        break;
      await delay(10);
    }
    await analyze(id, 409);
    await json(route, 'PATCH', { name: '处理中不能修改' }, 409);
    assert.ok((await (await first).text()).includes('完成'));
    await db.museumAsset.update({
      where: { id },
      data: { status: 'PROCESSING', updatedAt: new Date(Date.now() - 6 * 60_000) },
    });
    mode = 'empty';
    await analyze(id);
    assert.equal(
      (await db.museumAsset.findUniqueOrThrow({ where: { id } })).status,
      'REVIEW_REQUIRED',
    );
    await db.$executeRawUnsafe(
      "CREATE TRIGGER qa_fail_create BEFORE INSERT ON museum_assets BEGIN SELECT RAISE(ABORT, 'qa write failure'); END",
    );
    const beforeFiles = (await readdir(uploadDirectory)).length;
    await upload('数据库约束拒绝写入', png, 409);
    assert.equal((await readdir(uploadDirectory)).length, beforeFiles);
    await db.$executeRawUnsafe('DROP TRIGGER qa_fail_create');
    await db.$executeRawUnsafe(
      "CREATE TRIGGER qa_fail_metadata BEFORE INSERT ON asset_metadata BEGIN SELECT RAISE(ABORT, 'qa write failure'); END",
    );
    const failed = await analyze(id);
    assert.equal(failed.at(-1).status, 'error');
    assert.equal(
      (await db.museumAsset.findUniqueOrThrow({ where: { id } })).status,
      'REVIEW_REQUIRED',
    );
    await db.$executeRawUnsafe('DROP TRIGGER qa_fail_metadata');
    const approved = limited[0];
    await json(`${route}/narrations/${approved.id}`, 'POST', {
      updatedAt: approved.updatedAt.toISOString(),
    });
    const results = await Promise.all([
      fetch(`${base}${route}/publish`, { method: 'POST' }),
      fetch(`${base}${route}/publish`, { method: 'POST' }),
    ]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
    assert.equal(
      await db.auditLog.count({ where: { entityId: id, action: 'ASSET_PUBLISHED' } }),
      1,
    );
    assert.equal((await fetch(`${base}/exhibit/${id}`)).status, 200);
    await db.$executeRawUnsafe('ALTER TABLE museum_assets RENAME TO qa_disabled_assets');
    try {
      await json('/api/assets', 'GET', undefined, 503);
      await json(route, 'GET', undefined, 503);
      await json(`${route}/timeline`, 'GET', undefined, 503);
      await json(`${route}/narrations`, 'GET', undefined, 503);
      const fileCount = (await readdir(uploadDirectory)).length;
      await upload('数据库不可写', png, 503);
      assert.equal((await readdir(uploadDirectory)).length, fileCount);
      const page = await fetch(`${base}/assets`);
      assert.ok((await page.text()).includes('页面暂时无法加载'));
      const exhibitFailure = await fetch(`${base}/exhibit/${id}`);
      assert.ok((await exhibitFailure.text()).includes('页面暂时无法加载'));
    } finally {
      await db.$executeRawUnsafe('ALTER TABLE qa_disabled_assets RENAME TO museum_assets');
    }
    await stop();
    await start('');
    const callsBefore = modelCalls;
    const noKey = await upload('无密钥文物');
    await analyze(noKey.id);
    assert.equal((await json(`/api/assets/${noKey.id}`)).metadata.source, 'mock');
    assert.equal(modelCalls, callsBefore);
    console.log(
      '通过：AI断连/错误/非法JSON/空结果、无密钥、上传异常、空名称/资料、数据库写入与读取故障、404、发布门槛、并发分析与发布、过期任务恢复、禁止核心数据直接删除。',
    );
  } finally {
    await stop();
    await new Promise<void>((resolve) => model.close(() => resolve()));
    await db.$disconnect();
    // Only remove known fixtures under the directory created by this test.
    try {
      for (const name of await readdir(uploadDirectory))
        await unlink(path.join(uploadDirectory, name));
      await rmdir(uploadDirectory);
    } catch {
      /* May not exist if startup failed. */
    }
    for (const name of await readdir(directory)) await unlink(path.join(directory, name));
    await rmdir(directory);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
