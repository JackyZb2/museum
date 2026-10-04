'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEMO_CATALOG, DEMO_NOTICE, DEMO_STEPS } from '../../lib/demo/catalog';
import { userError } from '../../lib/client-errors';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Feedback } from '../../components/ui/Feedback';
import { WorkflowProgress } from '../../components/ui/WorkflowProgress';

type DemoAsset = {
  id: string;
  step: number;
  visualDescription: string;
  narrations: { variant: string; status: string; content: string }[];
};
const titles: Record<string, string> = {
  GENERAL: '普通游客版',
  CHILDREN: '儿童版',
  PROFESSIONAL: '专业版',
  SHORT: '30秒讲解',
};
const delay = () => new Promise((resolve) => setTimeout(resolve, 800));

export default function DemoPage() {
  const [assets, setAssets] = useState<DemoAsset[]>([]);
  const [selected, setSelected] = useState<string>(DEMO_CATALOG[0].id);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  const locked = useRef(false);
  const asset = assets.find((item) => item.id === selected);
  const sample = DEMO_CATALOG.find((item) => item.id === selected)!;
  const step = asset?.step || 0;
  const request = useCallback(async (body: object): Promise<DemoAsset[]> => {
    let failure: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch('/api/demo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '本地演示暂时不可用，请重试。');
        if (mounted.current) setAssets(data);
        return data;
      } catch (cause) {
        failure = cause;
      }
    }
    throw failure;
  }, []);
  useEffect(() => {
    mounted.current = true;
    request({ action: 'initialize' })
      .then(() => {
        if (mounted.current) setReady(true);
      })
      .catch(() => {
        if (mounted.current) setError('本地数据初始化失败，请检查数据库后点击重置演示。');
      });
    return () => {
      mounted.current = false;
    };
  }, [request]);
  async function run(confirmed = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      let current = step;
      while (current < (confirmed ? 8 : 6) && mounted.current) {
        const next = current + 1;
        setActive(next);
        const [result] = await Promise.all([
          request({ action: 'step', id: selected, step: next, confirmed: confirmed && next === 7 }),
          delay(),
        ]);
        current = result.find((item) => item.id === selected)?.step || next;
      }
    } catch (cause) {
      setError(userError(cause, '演示暂停，请点击继续演示。'));
    } finally {
      locked.current = false;
      if (mounted.current) {
        setBusy(false);
        setActive(0);
      }
    }
  }
  async function reset() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await request({ action: 'reset' });
      setReady(true);
    } catch {
      setError('重置失败，请检查本地数据库后重试。');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">创业项目答辩 · 离线演示</p>
        <h1 className="museum-title mt-2 text-3xl font-semibold">从一件文物，到一个数字展厅</h1>
        <p className="muted mt-3 text-sm">
          本地图片、本地资料、模拟模型，无需互联网或 AI 密钥。可在三分钟内展示完整流程。
        </p>
      </header>
      <Feedback tone="warning" title="演示用途说明">
        {DEMO_NOTICE} 图片为示意图，并非真实馆藏照片。审核和发布仅作用于演示样本。
      </Feedback>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">第一步 · 选择一件演示文物</h2>
        <span className="muted text-xs">选择样本 → 生成知识与讲解 → 人工确认 → 游客展示</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {DEMO_CATALOG.map((item) => (
          <button
            key={item.id}
            disabled={busy}
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
            className={`card overflow-hidden text-left ${selected === item.id ? 'ring-2 ring-[#547d58]' : 'hover:border-[#b9c9b2]'}`}
          >
            <Image
              src={item.image}
              alt={`${item.name}演示示意图`}
              width={900}
              height={700}
              unoptimized
              className="h-44 w-full bg-[#eeeae0] object-contain"
            />
            <span className="block p-4">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="museum-title text-xl font-semibold">{item.name}</span>
                <StatusBadge status="DEMO" />
              </span>
              <span className="muted mt-2 block text-xs">
                {selected === item.id ? '当前已选择' : '点击选择此样本'}
              </span>
            </span>
          </button>
        ))}
      </div>
      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">
            {sample.name} · 流程进度 {step}/8
          </h2>
          <div className="flex flex-wrap gap-3">
            {step < 6 && (
              <button
                className="button primary disabled:opacity-50"
                disabled={busy || !ready}
                onClick={() => run()}
              >
                {busy ? '正在演示…' : step ? '继续演示' : '开始演示'}
              </button>
            )}
            {step >= 6 && step < 8 && (
              <button
                className="button primary disabled:opacity-50"
                disabled={busy}
                onClick={() => run(true)}
              >
                {busy ? '正在处理…' : step === 6 ? '我已核对讲解，确认审核并发布' : '继续发布'}
              </button>
            )}
            <button
              className="button border border-slate-300 disabled:opacity-50"
              disabled={busy}
              onClick={reset}
            >
              重置演示
            </button>
          </div>
        </div>
        <p className="muted mt-3 text-sm">重置会清空三件演示样本的进度和讲解，不影响正常馆藏。</p>
        {!ready && !error && (
          <p role="status" className="muted mt-4 text-sm">
            正在准备本地演示资料，请稍候…
          </p>
        )}
        <div className="mt-6">
          <WorkflowProgress
            label="完整产品演示"
            steps={DEMO_STEPS.map((title, index) => ({
              title,
              state: active === index + 1 ? 'PROCESSING' : step >= index + 1 ? 'DONE' : 'WAITING',
            }))}
          />
        </div>
        {error && (
          <div className="mt-4">
            <Feedback tone="error" title="演示暂时暂停">
              {error}
            </Feedback>
          </div>
        )}
        {step === 6 && !busy && (
          <div className="mt-5">
            <Feedback tone="warning" title="请由您完成人工确认">
              四种讲解目前均为 AI
              生成草稿。请查看下方内容和来源，由您明确确认审核后才能发布；系统不会自动批准。
            </Feedback>
          </div>
        )}
        {step === 8 && (
          <div className="mt-5 space-y-4">
            <Feedback tone="success" title="演示完成，游客页面已开放">
              知识卡、四种讲解、人工审核和发布记录均已保存。游客页只显示已审核的讲解。
            </Feedback>
            <div className="flex flex-wrap gap-3">
              <Link className="button primary" href={`/exhibit/${selected}`}>
                进入游客展示页 →
              </Link>
              <Link className="button secondary" href={`/assets/${selected}`}>
                查看文物知识卡与处理记录
              </Link>
            </div>
          </div>
        )}
      </section>
      {step >= 2 && (
        <section className="card p-6">
          <h2 className="text-xl font-semibold">内容依据 · {sample.name}演示资料.txt</h2>
          <p className="muted mt-3">{DEMO_NOTICE}</p>
          <p className="mt-3 leading-7">{sample.description}</p>
        </section>
      )}
      {step >= 5 && (
        <section className="card p-6">
          <h2 className="text-xl font-semibold">文物知识卡</h2>
          <p className="mt-3 leading-7">{asset?.visualDescription}</p>
          <p className="mt-3">
            类别：{sample.category} · 材质：{sample.material} · 年代：资料中未提供
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sample.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-cyan-50 px-3 py-1 text-sm text-cyan-800">
                {tag}
              </span>
            ))}
          </div>
          <p className="muted mt-3 text-sm">
            模拟置信度：50%。仅用于演示界面，不代表真实识别准确率。
          </p>
        </section>
      )}
      {!!asset?.narrations.length && (
        <section className="card p-6">
          <h2 className="text-xl font-semibold">四种讲解 · 明确区分草稿与人工确认</h2>
          {asset.narrations.map((item) => (
            <details key={item.variant} className="mt-4 rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">
                <span className="inline-flex flex-wrap items-center gap-3">
                  {titles[item.variant]}
                  <StatusBadge
                    status={item.status}
                    label={item.status === 'APPROVED' ? '已人工审核（演示）' : undefined}
                  />
                </span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap leading-7">{item.content}</p>
              <p className="muted mt-3 text-sm">
                内容依据：{sample.name}演示资料.txt · {DEMO_NOTICE}
              </p>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
