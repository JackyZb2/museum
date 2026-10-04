import assert from 'node:assert/strict';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

async function main() {
  const directory = await mkdtemp(path.join(process.cwd(), '.local-mvp-test-'));
  const url = `file:${path.join(directory, 'acceptance.db').replaceAll('\\', '/')}`;
  const db = new PrismaClient({ datasourceUrl: url });
  const base = 'http://127.0.0.1:33160';
  let app: ChildProcess | undefined;
  async function stop() {
    if (app && app.exitCode === null) {
      const stopped = new Promise<void>((resolve) => app!.once('exit', () => resolve()));
      app.kill();
      await stopped;
    }
  }
  async function start(demo: boolean, key: string) {
    app = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '-p', '33160', '-H', '127.0.0.1'],
      {
        env: {
          ...process.env,
          PRISMA_DATABASE_URL: url,
          MUSEUMAI_UPLOAD_DIRECTORY: path.join(directory, 'uploads'),
          MUSEUMAI_BUILD_DIR: '.next-publish-test',
          DEMO_MODE: String(demo),
          AI_API_KEY: key,
          AI_BASE_URL: 'http://127.0.0.1:1/v1',
        },
        stdio: 'inherit',
      },
    );
    for (let attempt = 0; attempt < 80; attempt++) {
      if (app.exitCode !== null) throw new Error('验收服务提前退出');
      try {
        if ((await fetch(`${base}/api/assets`)).ok) return;
      } catch {
        /* Startup. */
      }
      await delay(250);
    }
    throw new Error('验收服务启动超时');
  }
  async function request(route: string, method = 'GET', body?: object, status = 200) {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  try {
    await writeFile(path.join(directory, 'acceptance.db'), '');
    assert.equal(
      spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
        env: { ...process.env, PRISMA_DATABASE_URL: url },
        stdio: 'inherit',
      }).status,
      0,
    );
    const png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#846a45' },
    })
      .png()
      .toBuffer();
    for (const demo of [false, true]) {
      const started = Date.now();
      await start(demo, '');
      assert.equal((await fetch(`${base}/dashboard`)).status, 200);
      assert.equal((await fetch(`${base}/assets/new`)).status, 200);
      const form = new FormData();
      form.set('name', '青铜鼎');
      form.set('dynasty', '商代');
      form.set('material', '青铜');
      form.set(
        'sourceText',
        '验收用虚构馆藏登记：名称青铜鼎，年代商代，材质青铜。仅用于功能测试，不代表真实鉴定。',
      );
      form.set('image', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'bronze-ding.png');
      const created = await fetch(`${base}/api/assets`, { method: 'POST', body: form });
      assert.equal(created.status, 201);
      const { id } = await created.json();
      const prefix = `/api/assets/${id}`;
      assert.equal((await fetch(`${base}/exhibit/${id}`)).status, 404);
      const analysis = await fetch(`${base}${prefix}/analyze`, { method: 'POST' });
      assert.equal(analysis.status, 200);
      const progress = (await analysis.text())
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line));
      assert.ok(!progress.some((item) => item.error), JSON.stringify(progress));
      const asset = await db.museumAsset.findUniqueOrThrow({
        where: { id },
        include: { metadata: true, sourceDocuments: true },
      });
      assert.equal(asset.status, 'REVIEW_REQUIRED');
      assert.equal(asset.dynasty, '商代');
      assert.equal(asset.material, '青铜');
      assert.equal(asset.sourceDocuments.length, 1);
      assert.ok(asset.metadata.length > 0);
      const metadata = Object.fromEntries(asset.metadata.map((item) => [item.key, item.value]));
      for (const field of [
        'aiCategory',
        'aiMaterial',
        'visualDescription',
        'shapeFeatures',
        'patternFeatures',
        'imageRawOutput',
        'documentRawOutput',
      ])
        assert.ok(metadata[field]);
      assert.equal(metadata.analysisSource, 'mock');
      assert.ok(JSON.parse(metadata.aiTags).length > 0);
      assert.ok(Number(metadata.confidence) >= 0 && Number(metadata.confidence) <= 1);
      assert.equal(
        asset.authorizationStatus,
        'PENDING',
        '授权仍未确认，不能把现有闭环称为授权流程验收通过',
      );
      assert.equal((await fetch(`${base}/assets/${id}`)).status, 200);
      await request(`${prefix}/narrations`, 'POST', { staffSourceText: '' });
      const versions = await request(`${prefix}/narrations`);
      assert.equal(versions.length, 4);
      assert.ok(versions.every((item: { status: string }) => item.status === 'AI_GENERATED'));
      await request(`${prefix}/publish`, 'POST', undefined, 409);
      const general = versions.find((item: { variant: string }) => item.variant === 'GENERAL');
      const content = `${general.content}\n人工核对：本记录用于最终验收演示。`;
      await request(`${prefix}/narrations/${general.id}`, 'PATCH', {
        content,
        updatedAt: general.updatedAt,
      });
      const edited = (await request(`${prefix}/narrations`)).find(
        (item: { id: string }) => item.id === general.id,
      );
      assert.equal(edited.status, 'EDITED');
      await request(`${prefix}/narrations/${general.id}`, 'POST', { updatedAt: edited.updatedAt });
      for (const version of versions.filter((item: { id: string }) => item.id !== general.id))
        await request(`${prefix}/narrations/${version.id}`, 'POST', {
          updatedAt: version.updatedAt,
        });
      await request(`${prefix}/publish`, 'POST');
      const page = await fetch(`${base}/exhibit/${id}`);
      assert.equal(page.status, 200);
      const html = await page.text();
      for (const text of ['青铜鼎', '商代', '青铜', '人工核对：本记录用于最终验收演示。'])
        assert.ok(html.includes(text));
      assert.ok(!html.includes('新增文物'));
      assert.equal((await fetch(`${base}/api/exhibit/${id}/image`)).status, 200);
      for (const action of [
        'AI_ANALYSIS_STARTED',
        'AI_ANALYSIS_COMPLETED',
        'NARRATION_GENERATED',
        'NARRATION_EDITED',
        'NARRATION_APPROVED',
        'ASSET_PUBLISHED',
      ])
        assert.ok(await db.auditLog.count({ where: { entityId: id, action } }));
      const seconds = (Date.now() - started) / 1000;
      assert.ok(seconds < 300);
      console.log(
        `验收通过：DEMO_MODE=${demo}，无密钥，新增/图片/来源文字/分析/四版/编辑/审核/发布/游客页，${seconds.toFixed(2)}秒（接口耗时，非人工操作时间）。`,
      );
      await stop();
    }
    await start(false, 'offline-test-key');
    await request('/api/demo', 'POST', { action: 'initialize' });
    for (let step = 1; step <= 8; step++)
      await request('/api/demo', 'POST', {
        action: 'step',
        id: 'demo-bronze-ding',
        step,
        confirmed: step === 7,
      });
    assert.equal((await fetch(`${base}/exhibit/demo-bronze-ding`)).status, 200);
    console.log('验收通过：已配置密钥但 AI 地址断连，专用 Demo 仍可完成八步并公开游客页。');
    console.log(
      '未覆盖且未实现：新流程馆藏文件上传、授权确认控件；本测试不将来源文字等同文件上传。',
    );
    if (process.env.MVP_UI_PREVIEW === 'true') {
      await stop();
      await start(true, '');
      await sharp(path.join('public', 'demo-images', 'bronze-ding.svg'))
        .png()
        .toFile(path.join(directory, 'bronze-ding.png'));
      console.log(
        `浏览器验收图片：${path.join(directory, 'bronze-ding.png')}；预览地址：${base}。按回车结束并清理隔离数据。`,
      );
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve());
        process.stdin.resume();
      });
      process.stdin.pause();
    }
  } finally {
    await stop();
    await db.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
