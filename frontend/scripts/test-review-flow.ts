import 'dotenv/config';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const port = 33153;
const base = `http://127.0.0.1:${port}`;
let app: ChildProcess | null = null;
let assetId: string | null = null;

async function start() {
  const child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '-p', String(port), '-H', '127.0.0.1'],
    {
      cwd: process.cwd(),
      env: { ...process.env, DEMO_MODE: 'true', AI_API_KEY: '' },
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
    const museum = await db.museum.upsert({
      where: { id: 'museum-main' },
      update: {},
      create: { id: 'museum-main', name: '博物馆工作区' },
    });
    const asset = await db.museumAsset.create({
      data: {
        museumId: museum.id,
        name: '人工审核流程测试文物',
        status: 'REVIEW_REQUIRED',
        sourceDocuments: {
          create: {
            title: '登记资料',
            fileName: '登记资料.txt',
            extractedText: '资料记载：器物材质为陶。',
          },
        },
      },
    });
    assetId = asset.id;
    app = await start();
    const prefix = `${base}/api/assets/${assetId}`;
    const generate = () =>
      fetch(`${prefix}/narrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffSourceText: '' }),
      });
    let response = await generate();
    assert.equal(response.status, 200, await response.text());
    const list = async () =>
      (await (await fetch(`${prefix}/narrations`)).json()) as {
        id: string;
        variant: string;
        version: number;
        content: string;
        status: string;
        updatedAt: string;
        sourceDocuments: { name: string }[];
      }[];
    const initial = await list();
    assert.equal(initial.length, 4);
    assert.ok(
      initial.every(
        (item) =>
          item.status === 'AI_GENERATED' &&
          item.sourceDocuments.some((doc) => doc.name === '登记资料.txt'),
      ),
    );
    const original = initial.find((item) => item.variant === 'GENERAL')!;
    const editedContent = `${original.content}\n人工核对：资料记载材质为陶。`;
    response = await fetch(`${prefix}/narrations/${original.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editedContent, updatedAt: original.updatedAt }),
    });
    assert.equal(response.status, 200, await response.text());
    let edited = (await list()).find((item) => item.id === original.id)!;
    assert.equal(edited.status, 'EDITED');
    assert.equal(edited.content, editedContent);
    response = await fetch(`${prefix}/narrations/${edited.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updatedAt: edited.updatedAt }),
    });
    assert.equal(response.status, 200, await response.text());
    edited = (await list()).find((item) => item.id === original.id)!;
    assert.equal(edited.status, 'APPROVED');
    assert.equal(
      (await db.museumAsset.findUniqueOrThrow({ where: { id: assetId } })).status,
      'REVIEW_REQUIRED',
    );
    response = await fetch(`${prefix}/narrations/${edited.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '不应覆盖', updatedAt: edited.updatedAt }),
    });
    assert.equal(response.status, 409);
    response = await generate();
    assert.equal(response.status, 200, await response.text());
    const all = await list();
    assert.equal(all.length, 8);
    assert.equal(
      all.filter((item) => item.version === 2 && item.status === 'AI_GENERATED').length,
      4,
    );
    assert.equal(all.find((item) => item.id === original.id)?.status, 'APPROVED');
    assert.equal(all.find((item) => item.id === original.id)?.content, editedContent);
    response = await fetch(`${prefix}/narrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffSourceText: '', variant: 'SHORT' }),
    });
    assert.equal(response.status, 200, await response.text());
    const afterSingle = await list();
    assert.equal(afterSingle.length, 9);
    assert.equal(
      afterSingle.filter((item) => item.version === 3 && item.variant === 'SHORT').length,
      1,
    );
    assert.equal(afterSingle.find((item) => item.id === original.id)?.status, 'APPROVED');
    const timeline = await fetch(`${prefix}/timeline`);
    assert.equal(timeline.status, 200);
    const events = (await timeline.json()) as { action: string }[];
    assert.equal(events.filter((event) => event.action === 'NARRATION_EDITED').length, 1);
    assert.equal(events.filter((event) => event.action === 'NARRATION_APPROVED').length, 1);
    assert.equal(events.filter((event) => event.action === 'NARRATION_GENERATED').length, 3);
    const reviewPage = await fetch(`${base}/assets/${assetId}/review`);
    assert.equal(reviewPage.status, 200);
    console.info(
      '审核流程通过：四版本展示、编辑、审核、已审核版本锁定、整体/单种重新生成、来源与处理记录。',
    );
  } finally {
    app?.kill();
    if (assetId) {
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
