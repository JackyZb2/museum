import type { Metadata } from 'next';
import { AppShell } from '../components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: '文博数字资产 AI 工作台',
  description: '让馆藏数字资产从存起来走向用起来，以资料为依据，以人工审核为关口。',
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
