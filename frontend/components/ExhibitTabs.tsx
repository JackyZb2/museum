'use client';

import { useState } from 'react';

type ExhibitNarration = { variant: string; content: string; version: number };
const tabs = [
  ['GENERAL', '普通讲解'],
  ['CHILDREN', '儿童讲解'],
  ['PROFESSIONAL', '专业讲解'],
  ['SHORT', '30秒讲解'],
] as const;

export function ExhibitTabs({ narrations }: { narrations: ExhibitNarration[] }) {
  const [active, setActive] = useState(narrations[0]?.variant || 'GENERAL');
  const current = narrations.find((item) => item.variant === active);
  return (
    <section
      aria-label="文物讲解"
      className="rounded-2xl border border-stone-200 bg-white shadow-sm"
    >
      <div className="border-b border-stone-200 px-5 pt-6 sm:px-8">
        <h2 className="font-serif text-2xl font-semibold text-stone-900">听一段讲解</h2>
        <p className="mt-1 text-sm text-stone-500">以下内容均已由馆方工作人员审核。</p>
        <div role="tablist" aria-label="讲解版本" className="mt-6 flex gap-1 overflow-x-auto">
          {tabs.map(([variant, label]) => {
            const available = narrations.some((item) => item.variant === variant);
            return (
              <button
                key={variant}
                type="button"
                role="tab"
                id={`tab-${variant}`}
                aria-selected={active === variant}
                aria-controls="exhibit-narration"
                disabled={!available}
                onClick={() => setActive(variant)}
                className={`shrink-0 border-b-2 px-3 pb-3 text-sm font-medium transition-colors sm:px-5 ${
                  active === variant
                    ? 'border-[#865d3b] text-[#65432a]'
                    : available
                      ? 'border-transparent text-stone-600 hover:text-stone-900'
                      : 'border-transparent text-stone-400'
                }`}
              >
                {label}
                {!available && <span className="sr-only">（暂无已审核内容）</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div
        role="tabpanel"
        id="exhibit-narration"
        aria-labelledby={`tab-${active}`}
        className="px-5 py-7 sm:px-8 sm:py-9"
      >
        <p className="whitespace-pre-wrap text-base leading-8 text-stone-700 sm:text-lg sm:leading-9">
          {current?.content || '暂无已审核讲解。'}
        </p>
      </div>
    </section>
  );
}
