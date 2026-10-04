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
        <h2 className="museum-title text-2xl font-semibold text-stone-900">阅读文物讲解</h2>
        <p className="mt-2 text-sm text-stone-500">
          选择适合您的阅读方式。以下内容均已由馆方工作人员审核。
        </p>
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
                tabIndex={active === variant ? 0 : -1}
                disabled={!available}
                onClick={() => setActive(variant)}
                onKeyDown={(event) => {
                  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const options = tabs.filter(([key]) =>
                    narrations.some((item) => item.variant === key),
                  );
                  const index = options.findIndex(([key]) => key === variant);
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? options.length - 1
                        : (index + (event.key === 'ArrowRight' ? 1 : -1) + options.length) %
                          options.length;
                  const target = options[next]?.[0];
                  if (target) {
                    setActive(target);
                    document.getElementById(`tab-${target}`)?.focus();
                  }
                }}
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
        <p className="reading-copy whitespace-pre-wrap text-base text-stone-700 sm:text-lg">
          {current?.content || '暂无已审核讲解。'}
        </p>
        {current && (
          <p className="mt-6 border-t border-stone-100 pt-4 text-xs text-stone-500">
            馆方已审核 · 第 {current.version} 版 · 未审核内容不会公开展示
          </p>
        )}
      </div>
    </section>
  );
}
