import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '../../lib/prisma';
import { ServiceUnavailable } from '../../components/ServiceUnavailable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/PageState';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const assets = await prisma.museumAsset
    .findMany({ orderBy: { createdAt: 'desc' } })
    .catch(() => null);
  if (!assets) return <ServiceUnavailable retryPath="/assets" />;
  return (
    <>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">馆藏档案 / 数字资产</p>
          <h1 className="museum-title mt-2 text-3xl font-semibold">文物资产</h1>
          <p className="muted mt-3 text-sm">图片、来源、知识与讲解，在一张可核对的知识卡中连接。</p>
        </div>
        <Link className="button primary" href="/assets/new">
          ＋ 新增文物
        </Link>
      </header>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">全部文物 · {assets.length} 件</span>
        <span className="muted">每件文物均保留独立的处理与审核状态。</span>
      </div>
      {assets.length === 0 ? (
        <EmptyState
          title="数字馆藏，从第一件文物开始"
          description="上传图片，填写基本信息，并提供可核实的馆藏资料。保存草稿后，再启动 AI 分析与人工审核。"
          action={
            <>
              <Link className="button primary" href="/assets/new">
                新增文物
              </Link>
              <Link className="button secondary" href="/demo">
                先体验演示
              </Link>
            </>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="card overflow-hidden hover:border-[#b9c9b2]"
            >
              {asset.imageUrl && (
                <Image
                  src={asset.imageUrl}
                  alt={asset.name}
                  width={600}
                  height={400}
                  unoptimized
                  className="h-52 w-full object-contain bg-[#eeeae0] p-3"
                />
              )}
              {!asset.imageUrl && (
                <div className="flex h-52 items-center justify-center bg-[#eeeae0] text-sm text-stone-500">
                  暂无文物图片
                </div>
              )}
              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={asset.status} />
                  {asset.authorizationStatus === 'DEMO_ONLY' && <StatusBadge status="DEMO" />}
                </div>
                <h2 className="museum-title text-xl font-semibold">{asset.name}</h2>
                <p className="muted mt-2 text-sm">
                  {asset.category || '类别待补充'} · {asset.inventoryNumber || '未填写藏品编号'}
                </p>
                <div className="mt-5 flex justify-between border-t border-stone-100 pt-3 text-xs">
                  <span className="muted">知识卡与来源资料</span>
                  <span className="text-cyan-700">查看档案 →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
