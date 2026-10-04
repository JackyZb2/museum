import Link from 'next/link';
import { prisma } from '../../lib/prisma';
import { ServiceUnavailable } from '../../components/ServiceUnavailable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/PageState';

export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const data = await prisma
    .$transaction([
      prisma.museumAsset.count(),
      prisma.museumAsset.count({ where: { status: 'REVIEW_REQUIRED' } }),
      prisma.museumAsset.count({ where: { status: 'PUBLISHED' } }),
      prisma.sourceDocument.count(),
      prisma.museumAsset.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          status: true,
          authorizationStatus: true,
          updatedAt: true,
        },
      }),
    ])
    .catch(() => null);
  if (!data) return <ServiceUnavailable retryPath="/dashboard" />;
  const [total, review, published, documents, recent] = data;
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">馆藏工作空间</p>
          <h1 className="museum-title mt-2 text-3xl font-semibold">工作台概览</h1>
          <p className="muted mt-3 text-sm">从资料整理到人工审核，清晰掌握每一件文物的处理进度。</p>
        </div>
        <Link href="/assets/new" className="button primary">
          ＋ 新增文物
        </Link>
      </header>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: '文物资产', value: total, note: '现有知识卡', href: '/assets' },
          { label: '待人工审核', value: review, note: '请核对资料与 AI 内容', href: '/assets' },
          { label: '已公开展品', value: published, note: '已发布到游客页面', href: '/assets' },
          { label: '来源资料', value: documents, note: '结构化内容的依据', href: '/assets' },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="card p-5 hover:border-[#bbcbb5]">
            <p className="text-sm text-stone-600">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{item.value}</p>
            <p className="muted mt-2 text-xs">{item.note}</p>
          </Link>
        ))}
      </div>
      <p className="muted -mt-3 text-xs">统计来自当前数据库，包含明确标记的演示样本。</p>
      <section className="card p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">最近处理的文物</h2>
            <p className="muted mt-1 text-xs">从知识卡继续分析、审核或发布。</p>
          </div>
          <Link href="/assets" className="text-sm text-cyan-700">
            全部文物 →
          </Link>
        </div>
        {recent.length ? (
          <ul className="mt-5 divide-y divide-stone-100">
            {recent.map((asset) => (
              <li key={asset.id}>
                <Link
                  href={`/assets/${asset.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <span className="font-semibold">{asset.name}</span>
                    <p className="muted mt-1 text-xs">
                      {asset.category || '类别待补充'} · 最近更新{' '}
                      {new Date(asset.updatedAt).toLocaleDateString('zh-CN')}
                      {asset.authorizationStatus === 'DEMO_ONLY' ? ' · 演示数据' : ''}
                    </p>
                  </div>
                  <StatusBadge status={asset.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="尚未建立文物知识卡"
              description="上传第一件文物和可核实的来源资料，开始整理数字馆藏。也可以先通过离线演示熟悉流程。"
              action={
                <>
                  <Link href="/assets/new" className="button primary">
                    新增文物
                  </Link>
                  <Link href="/demo" className="button secondary">
                    体验演示
                  </Link>
                </>
              }
            />
          </div>
        )}
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ['01', '整理馆藏', '保存图片、基本字段与来源资料。', '/assets/new', '新增文物'],
          ['02', '生成与审核', 'AI 辅助整理知识，工作人员核对讲解。', '/assets', '查看知识卡'],
          ['03', '发布与展示', '已审核内容才能进入游客数字展厅。', '/demo', '查看完整演示'],
        ].map(([number, title, description, href, link]) => (
          <div key={number} className="rounded-xl border border-stone-200 bg-[#eef1e9] p-6">
            <p className="eyebrow">{number} / 标准工作流程</p>
            <h2 className="mt-3 font-semibold">{title}</h2>
            <p className="muted mt-2 text-sm">{description}</p>
            <Link href={href} className="mt-4 inline-block text-sm font-medium text-cyan-700">
              {link} →
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
