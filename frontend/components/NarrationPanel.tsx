'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type NarrationItem = {
  id: string;
  variant: string;
  title: string;
  version: number;
  content: string;
  status: string;
  isLimited: boolean;
  generationSource: string;
  createdAt: string;
  sourceDocuments: { id: string; name: string }[];
  sourceReference: { sourceDocumentId: string; quote: string }[];
};

export function NarrationPanel({ assetId }: { assetId: string }) {
  const [items, setItems] = useState<NarrationItem[]>([]);
  const [staffSourceText, setStaffSourceText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    const response = await fetch(`/api/assets/${assetId}/narrations`, { cache: 'no-store' });
    if (!response.ok) throw new Error('讲解加载失败。');
    setItems((await response.json()) as NarrationItem[]);
  }, [assetId]);

  useEffect(() => {
    void load().catch((reason) =>
      setError(reason instanceof Error ? reason.message : '讲解加载失败。'),
    );
  }, [load]);

  async function generate() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/assets/${assetId}/narrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffSourceText }),
      });
      const result: { error?: string; count?: number; limited?: boolean; source?: string } =
        await response.json();
      if (!response.ok) throw new Error(result.error || '讲解生成失败。');
      await load();
      setStaffSourceText('');
      setNotice(
        result.limited
          ? '已保存四个受限版本。缺少可核实资料，内容较短且不包含历史推断。'
          : result.source === 'mock'
            ? '已保存四个模拟演示版本。内容仍需工作人员审核。'
            : '已保存四个 AI 讲解版本。请按来源资料逐条审核。',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '讲解生成失败。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mt-6 p-6">
      <h2 className="text-xl font-bold">AI 讲解</h2>
      <Link
        href={`/assets/${assetId}/review`}
        className="mt-2 inline-block text-cyan-700 underline"
      >
        进入人工审核页面 →
      </Link>
      <p className="muted mt-2 text-sm">
        只能根据工作人员资料、来源文档和已确认字段生成；视觉分析只用于外观描述。所有版本初始为“AI
        已生成”，尚未经人工审核。
      </p>
      <label className="mt-5 block text-sm font-semibold">
        工作人员本次补充资料（优先级最高，可选）
        <textarea
          className="mt-2 w-full rounded-lg border p-3 font-normal"
          rows={5}
          maxLength={12000}
          value={staffSourceText}
          onChange={(event) => setStaffSourceText(event.target.value)}
          placeholder="粘贴可核实的馆藏资料；不要填写未经确认的历史推测。"
        />
      </label>
      <button
        type="button"
        onClick={() => void generate()}
        disabled={busy}
        className="button primary mt-4 disabled:opacity-50"
      >
        {busy ? '正在生成四种讲解……' : '生成 AI 讲解'}
      </button>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-lg bg-cyan-50 p-3 text-cyan-800">
          {notice}
        </p>
      )}
      {items.length === 0 ? (
        <p className="muted mt-6">尚未生成讲解。</p>
      ) : (
        <div className="mt-6 space-y-5">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">
                  {item.title} · 第 {item.version} 版
                </h3>
                <span
                  className={`text-sm font-semibold ${item.status === 'APPROVED' ? 'text-emerald-800' : 'text-amber-800'}`}
                >
                  {item.status === 'APPROVED'
                    ? '已审核'
                    : item.status === 'EDITED'
                      ? '已人工编辑 · 待审核'
                      : 'AI生成 · 待人工审核'}
                </span>
              </div>
              {item.isLimited && (
                <p className="mt-2 text-sm text-amber-800">
                  资料不足：此版为受限模板，未强行满足常规字数。
                </p>
              )}
              {item.generationSource === 'mock' && (
                <p className="mt-2 text-sm text-amber-800">
                  模拟演示内容，不代表真实 AI 生成或历史鉴定。
                </p>
              )}
              <p className="mt-4 whitespace-pre-wrap leading-8">{item.content}</p>
              <div className="mt-5 border-t pt-4 text-sm">
                <h4 className="font-bold">内容依据</h4>
                {item.sourceDocuments.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {item.sourceDocuments.map((document) => (
                      <li key={document.id}>{document.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted mt-2">
                    无来源文件；仅依据已确认字段或受限外观描述。若仍缺少依据，资料中未提供相关信息。
                  </p>
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
      )}
    </section>
  );
}
