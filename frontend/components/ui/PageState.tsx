import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-stone-300 bg-[#fafaf7] px-6 py-10 text-center">
      <span
        aria-hidden="true"
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <path d="m3 8 9-5 9 5M4 10h16M6 10v8m6-8v8m6-8v8M3 21h18" />
        </svg>
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="muted mx-auto mt-2 max-w-lg text-sm leading-7">{description}</p>
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = '正在读取馆藏资料…' }: { label?: string }) {
  return (
    <section role="status" aria-busy="true" className="card p-6">
      <p className="muted mb-6 text-sm">{label}</p>
      <div aria-hidden="true" className="space-y-4">
        <div className="h-5 w-2/5 rounded bg-stone-100" />
        <div className="h-24 rounded bg-stone-50" />
        <div className="h-4 w-4/5 rounded bg-stone-100" />
      </div>
      <p className="muted mt-6 text-xs">资料将在加载完成后显示，请稍候。</p>
    </section>
  );
}
