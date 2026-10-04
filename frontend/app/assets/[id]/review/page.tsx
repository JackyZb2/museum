'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { PublishControl } from '../../../../components/PublishControl';
import { userError } from '../../../../lib/client-errors';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { Feedback } from '../../../../components/ui/Feedback';
import { EmptyState } from '../../../../components/ui/PageState';

type Narration = {
  id: string;
  variant: string;
  title: string;
  version: number;
  content: string;
  status: string;
  updatedAt: string;
  generationSource: string;
  isLimited: boolean;
  sourceDocuments: { id: string; name: string }[];
  sourceReference: { sourceDocumentId: string; quote: string }[];
};
type Event = {
  id: string;
  action: string;
  actor: string | null;
  createdAt: string;
  variant: string | null;
  version: number | null;
  variants: { variant: string; version: number }[];
};
const variants = [
  ['GENERAL', '普通游客版'],
  ['CHILDREN', '儿童版'],
  ['PROFESSIONAL', '专业版'],
  ['SHORT', '30 秒短讲解'],
] as const;
const eventLabels: Record<string, string> = {
  DEMO_ASSET_UPLOADED: '载入演示文物',
  NARRATION_GENERATED: '生成四种讲解',
  NARRATION_EDITED: '人工编辑讲解',
  NARRATION_APPROVED: '人工审核通过',
  ASSET_PUBLISHED: '发布文物',
  AI_ANALYSIS_STARTED: '开始 AI 分析',
  AI_ANALYSIS_COMPLETED: '完成 AI 分析',
  AI_ANALYSIS_FAILED: 'AI 分析失败，未覆盖已有资料',
  ASSET_UPDATED: '修改文物基本信息',
};

async function readError(response: Response) {
  const data: { error?: string } = await response.json().catch(() => ({}));
  return data.error || '操作失败，请稍后重试。';
}

export default function NarrationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Narration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [assetName, setAssetName] = useState('');
  const [assetStatus, setAssetStatus] = useState('');
  const [approvedCount, setApprovedCount] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [staffSourceText, setStaffSourceText] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const [narrationsResponse, timelineResponse, assetResponse] = await Promise.all([
      fetch(`/api/assets/${id}/narrations`, { cache: 'no-store' }),
      fetch(`/api/assets/${id}/timeline`, { cache: 'no-store' }),
      fetch(`/api/assets/${id}`, { cache: 'no-store' }),
    ]);
    if (!narrationsResponse.ok || !timelineResponse.ok || !assetResponse.ok)
      throw new Error('审核资料加载失败，请刷新页面。');
    setItems((await narrationsResponse.json()) as Narration[]);
    setEvents((await timelineResponse.json()) as Event[]);
    const asset = (await assetResponse.json()) as {
      name: string;
      status: string;
      approvedNarrationCount: number;
    };
    setAssetName(asset.name);
    setAssetStatus(asset.status);
    setApprovedCount(asset.approvedNarrationCount);
  }, [id]);

  useEffect(() => {
    void load().catch((reason) => setError(userError(reason, '审核资料加载失败。')));
  }, [load]);

  async function mutate(item: Narration, action: 'edit' | 'approve') {
    if (locked.current) return;
    locked.current = true;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const response = await fetch(`/api/assets/${id}/narrations/${item.id}`, {
        method: action === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action === 'edit'
            ? { content: draft, updatedAt: item.updatedAt }
            : { updatedAt: item.updatedAt },
        ),
      });
      if (!response.ok) throw new Error(await readError(response));
      await load();
      setEditId(null);
      setNotice(
        action === 'edit' ? '人工修改已保存，仍需审核通过。' : '此版本已审核通过，内容已锁定。',
      );
    } catch (reason) {
      setError(userError(reason));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function regenerate(variant?: string) {
    if (locked.current) return;
    locked.current = true;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const response = await fetch(`/api/assets/${id}/narrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffSourceText, variant }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await load();
      setNotice(
        variant
          ? '已生成此讲解的新版本；原有已审核版本仍保留，新版本需要重新人工审核。'
          : '已生成四个新版本；原有已审核版本仍保留，新版本需要重新人工审核。',
      );
    } catch (reason) {
      setError(userError(reason, '重新生成失败，补充资料和编辑文字已保留。'));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href={`/assets/${id}`} className="text-sm text-cyan-700">
        ← 返回文物知识卡
      </Link>
      <header>
        <p className="eyebrow mt-4">内容核对 / 人工确认</p>
        <h1 className="museum-title mt-2 text-3xl font-semibold">AI 讲解人工审核</h1>
        <p className="muted mt-3 text-sm">
          {assetName || '正在加载文物……'} · AI 生成内容不会自动审核或发布。
        </p>
      </header>
      <Feedback tone="info" title="审核前，请先核对内容依据">
        逐条确认讲解中的事实是否有资料支持。AI
        草稿不等于馆方确认，已审核版本将锁定；重新生成会保留旧版本。
      </Feedback>
      <nav aria-label="讲解版本定位" className="flex flex-wrap gap-2">
        {variants.map(([variant, title]) => (
          <a key={variant} href={`#review-${variant}`} className="button secondary">
            {title}
          </a>
        ))}
        <a href="#review-history" className="button secondary">
          处理记录
        </a>
      </nav>
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">公开展示</h2>
            <StatusBadge status={assetStatus || 'DRAFT'} />
          </div>
          <p className="muted mt-1 text-sm">
            已审核讲解版本：{approvedCount}。发布后游客只会看到已审核内容。
          </p>
        </div>
        <PublishControl
          assetId={id}
          status={assetStatus}
          approvedCount={approvedCount}
          onPublished={load}
        />
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-bold">重新生成四种讲解</h2>
        <p className="muted mt-2 text-sm">
          每次重新生成都会创建新版本，不覆盖旧版本。已审核版本保持原样。
        </p>
        <label className="mt-4 block text-sm font-semibold">
          本次补充资料（可选）
          <textarea
            className="mt-2 w-full rounded-lg border p-3 font-normal"
            rows={3}
            maxLength={12000}
            value={staffSourceText}
            onChange={(event) => setStaffSourceText(event.target.value)}
            placeholder="仅填写可以核实的馆藏资料"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void regenerate()}
          className="button primary mt-3 disabled:opacity-50"
        >
          {busy ? '处理中……' : '重新生成四种讲解'}
        </button>
      </section>
      {error && (
        <Feedback tone="error" title="审核操作未完成">
          {error}
        </Feedback>
      )}
      {notice && <Feedback tone="success">{notice}</Feedback>}
      {variants.map(([variant, title]) => {
        const versions = items
          .filter((item) => item.variant === variant)
          .sort((a, b) => b.version - a.version);
        return (
          <section key={variant} id={`review-${variant}`} className="card scroll-mt-6 p-5 sm:p-6">
            <h2 className="text-xl font-bold">{title}</h2>
            {versions.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  title="尚无此类讲解"
                  description="提供可核实资料后生成讲解，再进行编辑和人工审核。"
                />
              </div>
            )}
            <div className="mt-4 space-y-5">
              {versions.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-lg border p-4 sm:p-5 ${item.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50/20' : 'border-amber-200 bg-[#fdfcf8]'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">第 {item.version} 版</h3>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="muted mt-2 text-sm">
                    {item.status === 'APPROVED'
                      ? '工作人员已确认；此版本不可修改。'
                      : item.status === 'EDITED'
                        ? '内容已由工作人员修改，但尚未审核通过。'
                        : '以下为 AI 生成草稿，尚未经工作人员确认。'}
                  </p>
                  {item.generationSource === 'mock' && (
                    <p className="mt-2 text-sm text-amber-800">
                      模拟演示内容，不能作为真实文物鉴定依据。
                    </p>
                  )}
                  {item.isLimited && (
                    <p className="mt-2 text-sm text-amber-800">资料不足：仅生成受限内容。</p>
                  )}
                  {editId === item.id ? (
                    <textarea
                      aria-label={`编辑${title}第${item.version}版`}
                      className="mt-4 w-full rounded-lg border bg-white p-3 leading-8"
                      rows={12}
                      maxLength={10000}
                      value={draft}
                      disabled={busy}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  ) : (
                    <p className="reading-copy mt-4 whitespace-pre-wrap text-stone-700">
                      {item.content}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {item.version === versions[0].version && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void regenerate(item.variant)}
                        className="button border bg-white disabled:opacity-50"
                      >
                        重新生成此版本
                      </button>
                    )}
                    {item.status !== 'APPROVED' &&
                      (editId === item.id ? (
                        <>
                          <button
                            type="button"
                            disabled={busy || !draft.trim()}
                            onClick={() => void mutate(item, 'edit')}
                            className="button primary disabled:opacity-50"
                          >
                            保存修改
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setEditId(null)}
                            className="button border bg-white"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setEditId(item.id);
                              setDraft(item.content);
                            }}
                            className="button border bg-white"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void mutate(item, 'approve')}
                            className="button border border-emerald-500 bg-white text-emerald-800 disabled:opacity-50"
                          >
                            审核通过
                          </button>
                        </>
                      ))}
                  </div>
                  <div className="mt-5 rounded-lg border border-stone-200 bg-white p-4 text-sm">
                    <h4 className="font-bold">内容依据</h4>
                    {item.sourceDocuments.length ? (
                      <ul className="mt-2 list-disc pl-5">
                        {item.sourceDocuments.map((document) => (
                          <li key={document.id}>{document.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted mt-2">无来源文件；仅依据已确认字段或受限外观描述。</p>
                    )}
                    {item.sourceReference.length > 0 && (
                      <p className="muted mt-2">
                        可核对片段：
                        {item.sourceReference.map((reference) => `“${reference.quote}”`).join('；')}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      <section id="review-history" className="card scroll-mt-6 p-6">
        <h2 className="text-xl font-bold">处理记录</h2>
        {events.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="尚无处理记录"
              description="分析、生成、编辑、审核和发布操作会记录在这里，便于追溯。"
            />
          </div>
        ) : (
          <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-5">
            {events.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[1.65rem] top-2 h-2.5 w-2.5 rounded-full bg-cyan-700" />
                <p className="font-semibold">
                  {event.action === 'NARRATION_GENERATED' && event.variants.length === 1
                    ? '重新生成单种讲解'
                    : eventLabels[event.action] || '其他处理操作'}
                  {event.variant && event.version
                    ? ` · ${variants.find(([key]) => key === event.variant)?.[1] || '讲解'}第 ${event.version} 版`
                    : ''}
                </p>
                {event.action === 'NARRATION_GENERATED' && event.variants.length > 0 && (
                  <p className="muted text-sm">
                    生成版本：
                    {event.variants
                      .map(
                        (value) =>
                          `${variants.find(([key]) => key === value.variant)?.[1] || '讲解'}第 ${value.version} 版`,
                      )
                      .join('、')}
                  </p>
                )}
                <p className="muted text-sm">
                  {new Date(event.createdAt).toLocaleString('zh-CN')} ·{' '}
                  {(
                    {
                      mock: '模拟模型',
                      'openai-compatible': '兼容模型服务',
                      'AI Provider': 'AI 服务',
                    } as Record<string, string>
                  )[event.actor || ''] ||
                    event.actor ||
                    '系统'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
