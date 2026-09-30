'use client';

import Link from 'next/link';
import { useState } from 'react';

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
  const published = status === 'PUBLISHED';
  const reason =
    approvedCount === 0
      ? '至少审核通过一个讲解版本后才能发布。'
      : status === 'PROCESSING'
        ? '文物正在处理，暂不能发布。'
        : '';

  async function publish() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/assets/${assetId}/publish`, { method: 'POST' });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || '发布失败。');
      await onPublished();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '发布失败。');
    } finally {
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
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
