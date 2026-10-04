const states: Record<string, { text: string; style: string }> = {
  DRAFT: { text: '草稿', style: 'border-stone-200 bg-stone-50 text-stone-600' },
  PROCESSING: { text: '处理中', style: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
  REVIEW_REQUIRED: { text: '待人工审核', style: 'border-amber-200 bg-amber-50 text-amber-900' },
  APPROVED: { text: '已审核', style: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  PUBLISHED: { text: '已发布', style: 'border-slate-300 bg-slate-100 text-slate-800' },
  AI_GENERATED: { text: 'AI 生成 · 待审核', style: 'border-amber-200 bg-amber-50 text-amber-900' },
  EDITED: { text: '已人工编辑 · 待审核', style: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
  DEMO: { text: '演示数据', style: 'border-stone-200 bg-stone-50 text-stone-600' },
  WAITING: { text: '等待', style: 'border-stone-200 bg-stone-50 text-stone-600' },
  DONE: { text: '完成', style: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  ERROR: { text: '未完成', style: 'border-red-200 bg-red-50 text-red-800' },
};
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const state = states[status] || {
    text: '状态待确认',
    style: 'border-stone-200 bg-stone-50 text-stone-600',
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-4 ${state.style}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || state.text}
    </span>
  );
}
