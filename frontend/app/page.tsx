'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getArtifacts } from '../lib/api';
import { Artifact } from '../types';
export default function Home() {
  const [items, setItems] = useState<Artifact[]>([]);
  useEffect(() => {
    getArtifacts()
      .then(setItems)
      .catch(() => {});
  }, []);
  return (
    <>
      <header className="flex justify-between items-start mb-10">
        <div>
          <div className="text-sm tracking-widest text-cyan-700 font-bold">
            博物馆数字资产工作台
          </div>
          <h1 className="text-4xl font-bold mt-2">欢迎使用 MuseumAI Studio</h1>
          <p className="muted mt-2">整理馆藏文物及其数字资料。</p>
        </div>
        <Link href="/artifacts/new" className="button primary">
          + 新建文物
        </Link>
      </header>
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          ['文物', items.length, '馆藏记录'],
          ['数字资产', '—', '图片与媒体'],
          ['资料文档', '—', '研究资料'],
        ].map((x) => (
          <div className="card p-6" key={x[0] as string}>
            <div className="muted text-sm">{x[0]}</div>
            <div className="text-3xl font-bold mt-3">{x[1]}</div>
            <div className="muted text-sm mt-1">{x[2]}</div>
          </div>
        ))}
      </div>
      <section className="card p-6">
        <div className="flex justify-between mb-5">
          <h2 className="text-lg font-bold">最近新增文物</h2>
          <Link href="/artifacts" className="text-cyan-700 text-sm">
            查看全部 →
          </Link>
        </div>
        {items.slice(0, 5).map((a) => (
          <Link
            href={`/artifacts/${a.id}`}
            className="flex justify-between border-t py-4 hover:bg-slate-50"
            key={a.id}
          >
            <span className="font-semibold">{a.name}</span>
            <span className="muted">
              {a.dynasty || '—'} · {a.category || '未分类'}
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}
