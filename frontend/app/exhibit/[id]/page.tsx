import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ExhibitTabs } from '../../../components/ExhibitTabs';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
const order = ['GENERAL', 'CHILDREN', 'PROFESSIONAL', 'SHORT'];

async function findPublished(id: string) {
  return prisma.museumAsset.findFirst({
    where: { id, status: 'PUBLISHED' },
    select: {
      id: true,
      name: true,
      dynasty: true,
      material: true,
      description: true,
      imageUrl: true,
      museum: { select: { name: true } },
      narrations: {
        where: { status: 'APPROVED' },
        orderBy: { version: 'desc' },
        select: { variant: true, version: true, content: true },
      },
    },
  });
}

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const { id } = await params;
  const asset = await findPublished(id);
  return {
    title: asset ? `${asset.name}｜数字展厅` : '展品未开放｜数字展厅',
    description: asset ? `了解${asset.name}的馆藏信息与人工审核讲解。` : '此展品尚未开放。',
  };
}

export default async function ExhibitPage({ params }: Context) {
  const { id } = await params;
  const asset = await findPublished(id);
  if (!asset || asset.narrations.length === 0) notFound();
  const latest = order.flatMap((variant) => {
    const item = asset.narrations.find((narration) => narration.variant === variant);
    return item ? [item] : [];
  });

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-stone-900">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-7 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between border-b border-stone-300 pb-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-[#865d3b]">数字馆藏</p>
            <p className="mt-1 font-serif text-lg text-stone-800 sm:text-xl">{asset.museum.name}</p>
          </div>
          <span className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600">
            线上展厅
          </span>
        </header>
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-[#eee9df]">
            {asset.imageUrl ? (
              <Image
                src={`/api/exhibit/${id}/image`}
                alt={`${asset.name}高清图片`}
                width={1600}
                height={1200}
                unoptimized
                priority
                className="h-auto max-h-[70vh] w-full object-contain"
              />
            ) : (
              <div className="flex min-h-72 items-center justify-center text-stone-500">
                暂无文物图片
              </div>
            )}
          </div>
          <section className="pt-1 lg:pt-8">
            <p className="text-sm tracking-[0.2em] text-[#865d3b]">馆藏文物</p>
            <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              {asset.name}
            </h1>
            <div className="mt-8 grid grid-cols-2 gap-5 border-y border-stone-300 py-6">
              <div>
                <h2 className="text-sm text-stone-500">年代</h2>
                <p className="mt-2 text-lg">{asset.dynasty || '资料中未提供'}</p>
              </div>
              <div>
                <h2 className="text-sm text-stone-500">材质</h2>
                <p className="mt-2 text-lg">{asset.material || '资料中未提供'}</p>
              </div>
            </div>
            <h2 className="mt-8 font-serif text-2xl font-semibold">基础介绍</h2>
            <p className="mt-4 whitespace-pre-wrap leading-8 text-stone-700">
              {asset.description || '资料中未提供相关信息。'}
            </p>
          </section>
        </div>
        <div className="mt-10 lg:mt-14">
          <ExhibitTabs narrations={latest} />
        </div>
        <footer className="mt-14 border-t border-stone-300 pt-6 text-sm text-stone-500">
          本页仅展示已公开的馆藏信息与经人工审核的讲解。
        </footer>
      </div>
    </div>
  );
}
