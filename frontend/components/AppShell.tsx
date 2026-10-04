'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const navigation = [
  { href: '/dashboard', label: '工作台概览', hint: '工作进度与最近馆藏' },
  { href: '/assets', label: '文物资产', hint: '知识卡与馆藏资料' },
  { href: '/assets/new', label: '新增文物', hint: '上传图片与来源资料' },
  { href: '/demo', label: '离线演示', hint: '三分钟完整产品流程' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const currentLabel = pathname.startsWith('/artifacts')
    ? '旧版馆藏管理'
    : navigation.find((item) => pathname === item.href)?.label ||
      (pathname.startsWith('/assets/') ? '文物知识卡' : '工作空间');
  if (pathname.startsWith('/exhibit/')) return <main className="min-h-screen">{children}</main>;
  if (pathname === '/')
    return (
      <div className="min-h-screen">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Link href="/" className="font-semibold text-[#264b3d]">
              文博数字资产{' '}
              <span className="ml-2 text-xs font-normal text-stone-500">AI 工作台</span>
            </Link>
            <nav aria-label="首页导航" className="flex gap-4 text-sm">
              <Link href="/dashboard">工作台</Link>
              <Link href="/demo">演示</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  return (
    <div className="min-h-screen lg:flex">
      <a
        href="#page-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-3"
      >
        跳转到页面内容
      </a>
      <aside className="border-b border-stone-200 bg-[#eef1e9] px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
        <Link className="mb-5 block lg:mb-10" href="/">
          <span className="eyebrow">馆藏 · 知识 · 内容</span>
          <span className="museum-title mt-2 block text-xl font-semibold">文博数字资产</span>
          <span className="muted mt-1 block text-xs">AI 工作台</span>
        </Link>
        <nav aria-label="主导航" className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === '/assets' &&
                pathname.startsWith('/assets/') &&
                pathname !== '/assets/new');
            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={`block rounded-lg border px-3 py-3 ${active ? 'border-[#cad5c7] bg-white text-[#264b3d]' : 'border-transparent text-stone-600 hover:bg-white/60'}`}
                href={item.href}
                key={item.href}
              >
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="muted mt-1 hidden text-xs lg:block">{item.hint}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 hidden border-t border-stone-300 pt-5 text-xs leading-6 text-stone-500 lg:block">
          资料有据，内容可审。
          <br />
          AI 辅助整理，工作人员确认。
          <Link
            className={`mt-5 block underline ${pathname.startsWith('/artifacts') ? 'text-[#264b3d]' : ''}`}
            href="/artifacts"
          >
            旧版馆藏管理
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-stone-200 bg-white px-5 py-3 text-xs sm:px-8">
          <nav aria-label="当前位置" className="flex flex-wrap items-center gap-2">
            <Link href="/" className="muted">
              首页
            </Link>
            <span aria-hidden="true" className="text-stone-300">
              /
            </span>
            <Link href="/dashboard" className="muted">
              工作台
            </Link>
            {pathname !== '/dashboard' && (
              <>
                <span aria-hidden="true" className="text-stone-300">
                  /
                </span>
                <span>{currentLabel}</span>
              </>
            )}
          </nav>
          <span className="text-stone-500">可信资料 · 人工审核</span>
        </header>
        <main id="page-content" className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:py-9 lg:px-10">
          {children}
        </main>
        <footer className="mx-auto max-w-7xl px-5 pb-8 text-xs text-stone-500 sm:px-8">
          文博数字资产 AI 工作台 · 辅助生成，不替代专业判断
        </footer>
      </div>
    </div>
  );
}
