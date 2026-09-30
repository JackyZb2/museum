import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '../../lib/prisma';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  PROCESSING: '处理中',
  REVIEW_REQUIRED: '待人工审核',
  APPROVED: '已通过',
  PUBLISHED: '已发布',
};

export default async function AssetsPage() {
  const assets = await prisma.museumAsset.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI 文物知识卡</h1>
          <p className="muted mt-2">上传文物图片和来源资料，生成待审核的结构化知识卡。</p>
        </div>
        <Link className="button primary" href="/assets/new">
          ＋ 上传文物
        </Link>
      </header>
      {assets.length === 0 ? (
        <div className="card p-10 text-center muted">还没有文物知识卡。点击“上传文物”开始。</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/assets/${asset.id}`}
              className="card overflow-hidden hover:shadow-md"
            >
              {asset.imageUrl && (
                <Image
                  src={asset.imageUrl}
                  alt={asset.name}
                  width={600}
                  height={400}
                  unoptimized
                  className="h-44 w-full object-cover bg-slate-100"
                />
              )}
              <div className="p-5">
                <div className="text-lg font-semibold">{asset.name}</div>
                <div className="muted mt-2 text-sm">
                  {asset.category || '类别待补充'} · {statusLabels[asset.status] || asset.status}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
