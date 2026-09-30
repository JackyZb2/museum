'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navigation = [
  { href: '/', label: '工作台' },
  { href: '/artifacts', label: '文物资产' },
  { href: '/artifacts/new', label: '新增文物' },
  { href: '/assets', label: 'AI 文物知识卡' },
  { href: '/demo', label: '功能演示' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/exhibit/')) return <main className="min-h-screen">{children}</main>;
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 bg-[#102a43] p-6 text-white">
        <Link className="mb-12 block text-xl font-bold" href="/">
          MuseumAI <span className="text-cyan-300">Studio</span>
        </Link>
        <nav aria-label="主导航" className="space-y-2">
          {navigation.map((item) => (
            <Link className="block rounded p-3 hover:bg-white/10" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-16 text-xs text-blue-200">中文开发示范项目</div>
      </aside>
      <main className="max-w-7xl flex-1 p-8">{children}</main>
    </div>
  );
}
