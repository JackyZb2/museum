'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PublishControl } from '../../../../components/PublishControl';

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
const statusLabels: Record<string, string> = {
  AI_GENERATED: 'AI生成 · 待人工审核',
  EDITED: '已人工编辑 · 待审核',
  APPROVED: '已审核',
};
const eventLabels: Record<string, string> = {
  NARRATION_GENERATED: '生成四种讲解',
  NARRATION_EDITED: '人工编辑讲解',
  NARRATION_APPROVED: '人工审核通过',
  ASSET_PUBLISHED: '发布文物',
  AI_ANALYSIS_STARTED: '开始 AI 分析',
  AI_ANALYSIS_COMPLETED: '完成 AI 分析',
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
    void load().catch((reason) => setError(String(reason)));
  }, [load]);

  async function mutate(item: Narration, action: 'edit' | 'approve') {
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
      setEditId(null);
      await load();
      setNotice(
        action === 'edit' ? '人工修改已保存，仍需审核通过。' : '此版本已审核通过，内容已锁定。',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败。');
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(variant?: string) {
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
      setEditId(null);
      setStaffSourceText('');
      await load();
      setNotice(
        variant
          ? '已生成此讲解的新版本；原有已审核版本仍保留，新版本需要重新人工审核。'
          : '已生成四个新版本；原有已审核版本仍保留，新版本需要重新人工审核。',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '重新生成失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href={`/assets/${id}`} className="text-sm text-cyan-700">
        ← 返回文物知识卡
      </Link>
      <header>
        <h1 className="mt-3 text-3xl font-bold">AI 讲解人工审核</h1>
        <p className="muted mt-2">
          {assetName || '正在加载文物……'} · AI 生成内容不会自动审核或发布。
        </p>
      </header>
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-bold">
            发布状态：{assetStatus === 'PUBLISHED' ? '已发布' : '未发布'}
          </h2>
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
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-cyan-50 p-4 text-cyan-800">
          {notice}
        </p>
      )}
      {variants.map(([variant, title]) => {
        const versions = items
          .filter((item) => item.variant === variant)
          .sort((a, b) => b.version - a.version);
        return (
          <section key={variant} className="card p-6">
            <h2 className="text-xl font-bold">{title}</h2>
            {versions.length === 0 && <p className="muted mt-4">尚无讲解版本，请先生成。</p>}
            <div className="mt-4 space-y-5">
              {versions.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-lg border p-5 ${item.status === 'APPROVED' ? 'border-emerald-300 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/30'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-bold">第 {item.version} 版</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        item.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'EDITED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {statusLabels[item.status] || '状态待确认'}
                    </span>
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
                      onChange={(event) => setDraft(event.target.value)}
                    />
                  ) : (
                    <p className="mt-4 whitespace-pre-wrap leading-8">{item.content}</p>
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
                  <div className="mt-5 border-t pt-4 text-sm">
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
      <section className="card p-6">
        <h2 className="text-xl font-bold">处理记录</h2>
        {events.length === 0 ? (
          <p className="muted mt-3">暂无记录。</p>
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
                  {new Date(event.createdAt).toLocaleString('zh-CN')} · {event.actor || '系统'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
