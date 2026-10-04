'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { userError } from '../lib/client-errors';
import { Feedback } from './ui/Feedback';

export function PublishControl({
  assetId,
  status,
  approvedCount,
  onPublished,
}: {
  assetId: string;
  status: string;
  approvedCount: number;
  onPublished: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const published = status === 'PUBLISHED';
  const reason =
    approvedCount === 0
      ? '至少审核通过一个讲解版本后才能发布。'
      : status === 'PROCESSING'
        ? '文物正在处理，暂不能发布。'
        : '';

  async function publish() {
    if (locked.current || published || reason) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/assets/${assetId}/publish`, { method: 'POST' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || '发布失败。');
      await onPublished();
    } catch (reason) {
      setError(userError(reason, '发布结果尚未确认，请刷新状态后重试。'));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {published ? (
        <Link href={`/exhibit/${assetId}`} className="button primary">
          查看游客展示页 →
        </Link>
      ) : (
        <button
          type="button"
          disabled={busy || Boolean(reason)}
          onClick={() => void publish()}
          className="button primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? '正在发布……' : '发布文物'}
        </button>
      )}
      {!published && reason && <p className="text-sm text-amber-800">{reason}</p>}
      {error && <Feedback tone="error">{error}</Feedback>}
    </div>
  );
}
