import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const port = 33154;
const base = `http://127.0.0.1:${port}`;
let app: ChildProcess | null = null;
let assetId: string | null = null;
let imagePath: string | null = null;

async function start() {
  const child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MUSEUMAI_BUILD_DIR: '.next-publish-test',
        DEMO_MODE: 'true',
        AI_API_KEY: '',
      },
      stdio: 'ignore',
    },
  );
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(`测试服务提前退出：${child.exitCode}`);
    try {
      if ((await fetch(`${base}/api/assets`)).ok) return child;
    } catch {
      /* 等待服务 */
    }
    await delay(250);
  }
  child.kill();
  throw new Error('测试服务未启动。');
}

async function main() {
  try {
    const build = spawnSync(process.execPath, ['node_modules/next/dist/bin/next', 'build'], {
      cwd: process.cwd(),
      env: { ...process.env, MUSEUMAI_BUILD_DIR: '.next-publish-test' },
      stdio: 'inherit',
    });
    if (build.status !== 0) throw new Error('独立测试构建失败。');
    const museum = await db.museum.upsert({
      where: { id: 'museum-main' },
      update: {},
      create: { id: 'museum-main', name: '博物馆工作区' },
    });
    const asset = await db.museumAsset.create({
      data: {
        museumId: museum.id,
        name: '游客展示测试文物',
        dynasty: '宋代',
        material: '陶',
        description: '馆藏登记中的基础介绍。',
        status: 'REVIEW_REQUIRED',
        sourceDocuments: {
          create: {
            title: '馆藏登记',
            fileName: '馆藏登记.txt',
            extractedText: '馆藏登记记载：器物材质为陶。',
          },
        },
      },
    });
    assetId = asset.id;
    const imageName = `${randomUUID()}.png`;
    imagePath = path.join(process.cwd(), '.local-uploads', imageName);
    await mkdir(path.dirname(imagePath), { recursive: true });
    await writeFile(
      imagePath,
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
        'base64',
      ),
    );
    await db.museumAsset.update({
      where: { id: assetId },
      data: { imageUrl: `/api/assets/${assetId}/image/${imageName}` },
    });
    app = await start();
    const prefix = `${base}/api/assets/${assetId}`;
    const exhibit = `${base}/exhibit/${assetId}`;
    assert.equal((await fetch(exhibit)).status, 404);
    assert.equal((await fetch(`${base}/api/exhibit/${assetId}/image`)).status, 404);
    let response = await fetch(`${prefix}/publish`, { method: 'POST' });
    assert.equal(response.status, 409);
    assert.match(await response.text(), /至少审核通过一个讲解版本/);

    response = await fetch(`${prefix}/narrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffSourceText: '' }),
    });
    assert.equal(response.status, 200, await response.text());
    const narrations = await db.narration.findMany({ where: { museumAssetId: assetId } });
    assert.equal(narrations.length, 4);
    const general = narrations.find((item) => item.variant === 'GENERAL')!;
    const children = narrations.find((item) => item.variant === 'CHILDREN')!;
    const approvedText = `${general.content}\n经工作人员核对的公开文字。`;
    response = await fetch(`${prefix}/narrations/${general.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: approvedText, updatedAt: general.updatedAt.toISOString() }),
    });
    assert.equal(response.status, 200, await response.text());
    const edited = await db.narration.findUniqueOrThrow({ where: { id: general.id } });
    response = await fetch(`${prefix}/narrations/${general.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedAt: edited.updatedAt.toISOString() }),
    });
    assert.equal(response.status, 200, await response.text());
    assert.equal((await fetch(exhibit)).status, 404);
    response = await fetch(`${prefix}/publish`, { method: 'POST' });
    assert.equal(response.status, 200, await response.text());
    assert.equal(
      (await db.museumAsset.findUniqueOrThrow({ where: { id: assetId } })).status,
      'PUBLISHED',
    );
    assert.equal(
      await db.auditLog.count({ where: { entityId: assetId, action: 'ASSET_PUBLISHED' } }),
      1,
    );
    assert.equal((await fetch(`${prefix}/publish`, { method: 'POST' })).status, 409);
    assert.equal((await fetch(`${prefix}/analyze`, { method: 'POST' })).status, 409);
    assert.equal(
      (await db.museumAsset.findUniqueOrThrow({ where: { id: assetId } })).status,
      'PUBLISHED',
    );

    response = await fetch(exhibit);
    assert.equal(response.status, 200);
    let html = await response.text();
    assert.match(html, /游客展示测试文物/);
    assert.match(html, /宋代/);
    assert.match(html, /馆藏登记中的基础介绍/);
    assert.match(html, /经工作人员核对的公开文字/);
    assert.ok(!html.includes(children.content), '未审核儿童讲解不应出现在公开页面');
    assert.ok(!html.includes('新增文物'), '游客页面不应包含后台导航');
    assert.ok(!html.includes('审核通过'), '游客页面不应包含后台审核按钮');
    response = await fetch(`${base}/api/exhibit/${assetId}/image`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /image\/png/);

    response = await fetch(`${prefix}/narrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffSourceText: '新的馆藏登记：此器物为陶。', variant: 'GENERAL' }),
    });
    assert.equal(response.status, 200, await response.text());
    html = await (await fetch(exhibit)).text();
    assert.ok(html.includes('经工作人员核对的公开文字'), '未审核新版本不能替代已审核旧版本');
    assert.equal(
      await db.narration.count({ where: { museumAssetId: assetId, status: 'APPROVED' } }),
      1,
    );
    console.info(
      '发布闭环通过：未审核禁止发布、审核后发布、公开页仅显示已审核讲解、图片访问、旧审核版本保留。',
    );
  } finally {
    app?.kill();
    if (assetId) {
      await db.auditLog.deleteMany({ where: { entityId: assetId } });
      await db.sourceDocument.deleteMany({ where: { museumAssetId: assetId } });
      await db.museumAsset.delete({ where: { id: assetId } });
    }
    if (imagePath) await unlink(imagePath).catch(() => {});
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
