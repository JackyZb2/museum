import { StatusBadge } from './StatusBadge';

export type WorkflowStep = { title: string; state: 'WAITING' | 'PROCESSING' | 'DONE' | 'ERROR' };
export function WorkflowProgress({ steps, label }: { steps: WorkflowStep[]; label: string }) {
  const done = steps.filter((step) => step.state === 'DONE').length;
  return (
    <div aria-label={label}>
      <div className="mb-4 flex items-center justify-between gap-4 text-sm">
        <p className="muted">{label}</p>
        <span className="font-medium tabular-nums">
          {done} / {steps.length} 步完成
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-stone-100"
      >
        <div
          className="h-full bg-[#547d58]"
          style={{ width: `${(done / Math.max(steps.length, 1)) * 100}%` }}
        />
      </div>
      <ol aria-live="polite" className="grid gap-3 sm:grid-cols-2">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${step.state === 'PROCESSING' ? 'border-cyan-300 bg-cyan-50' : step.state === 'ERROR' ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white'}`}
          >
            <span className="flex min-w-0 items-center gap-3 text-sm">
              <span aria-hidden="true" className="text-xs tabular-nums text-stone-400">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="font-medium">{step.title}</span>
            </span>
            <StatusBadge status={step.state} />
          </li>
        ))}
      </ol>
    </div>
  );
}
