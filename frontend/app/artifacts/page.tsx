'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Artifact } from '../../types';
import { deleteArtifact, getArtifacts } from '../../lib/api';
export default function Artifacts() {
  const [items, setItems] = useState<Artifact[]>([]),
    [q, setQ] = useState('');
  const [error, setError] = useState('');
  const locked = useRef(false);
  const load = useCallback(
    () =>
      getArtifacts(q)
        .then(setItems)
        .catch((reason) => setError(reason instanceof Error ? reason.message : '列表加载失败。')),
    [q],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <>
      {error && (
        <p role="alert" className="mb-4 text-red-700">
          {error}
        </p>
      )}
      <header className="flex justify-between mb-8">
        <div>
          <p className="eyebrow">旧版馆藏管理</p>
          <h1 className="museum-title mt-2 text-3xl font-semibold">文物藏品</h1>
          <p className="muted mt-2 text-sm">此处为旧版记录。AI 分析与审核流程请使用“文物资产”。</p>
        </div>
        <Link href="/artifacts/new" className="button primary">
          + 新建文物
        </Link>
      </header>
      <div className="card p-4 mb-4">
        <input
          className="w-full border rounded-lg p-3"
          placeholder="按文物名称或藏品编号搜索……"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-sm muted">
            <tr>
              {['名称', '朝代', '类别', '材质', '藏品编号', '操作'].map((h) => (
                <th className="p-4" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr className="border-t" key={a.id}>
                <td className="p-4 font-semibold">{a.name}</td>
                <td className="p-4">{a.dynasty || '—'}</td>
                <td className="p-4">{a.category || '—'}</td>
                <td className="p-4">{a.material || '—'}</td>
                <td className="p-4">{a.inventory_number || '—'}</td>
                <td className="p-4 space-x-3">
                  <Link className="text-cyan-700" href={`/artifacts/${a.id}`}>
                    查看
                  </Link>
                  <Link className="text-cyan-700" href={`/artifacts/${a.id}/edit`}>
                    编辑
                  </Link>
                  <button
                    className="text-red-600"
                    onClick={async () => {
                      if (locked.current) return;
                      if (confirm('确定删除这件文物吗？')) {
                        locked.current = true;
                        try {
                          await deleteArtifact(a.id);
                          await load();
                          setError('');
                        } catch (reason) {
                          setError(
                            reason instanceof Error ? reason.message : '删除失败，原数据保留。',
                          );
                        } finally {
                          locked.current = false;
                        }
                      }
                    }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <div className="p-10 text-center muted">
            暂无文物记录。
            <br />
            新建第一件文物，开始建立数字馆藏。
          </div>
        )}
      </div>
    </>
  );
}
