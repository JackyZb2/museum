'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { assetUrl, getArtifact, removeAsset, removeDocument, upload } from '../../../lib/api';
import { Artifact } from '../../../types';
const size = (n: number) => `${(n / 1024 / 1024).toFixed(2)} MB`;
export default function Detail() {
  const p = useParams<{ id: string }>();
  const [a, setA] = useState<Artifact | null>(null),
    [error, setError] = useState('');
  const locked = useRef(false);
  async function remove(id: number, kind: 'asset' | 'document') {
    if (locked.current || !confirm('确定删除此文件记录吗？正在引用的资料不应删除。')) return;
    locked.current = true;
    try {
      await (kind === 'asset' ? removeAsset(id) : removeDocument(id));
      await load();
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除失败，原数据保留。');
    } finally {
      locked.current = false;
    }
  }
  const load = useCallback(
    () =>
      getArtifact(p.id)
        .then(setA)
        .catch((e) => setError(e.message)),
    [p.id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  if (error && !a)
    return (
      <div role="alert" className="text-red-600">
        {error}
      </div>
    );
  if (!a) return <div className="muted">正在加载……</div>;
  return (
    <>
      {error && (
        <p role="alert" className="mb-4 text-red-700">
          {error}
        </p>
      )}
      <header className="flex justify-between mb-8">
        <div>
          <Link href="/artifacts" className="text-cyan-700 text-sm">
            ← 返回文物列表
          </Link>
          <h1 className="text-3xl font-bold mt-3">{a.name}</h1>
          <p className="muted mt-2">
            {a.dynasty || '未知年代'} · {a.category || '未分类'}
          </p>
        </div>
        <Link href={`/artifacts/${a.id}/edit`} className="button border bg-white">
          编辑文物
        </Link>
      </header>
      <div className="card p-6 mb-6 grid grid-cols-4 gap-5">
        {[
          ['朝代', a.dynasty],
          ['类别', a.category],
          ['材质', a.material],
          ['藏品编号', a.inventory_number],
        ].map((x) => (
          <div key={x[0]}>
            <div className="muted text-sm">{x[0]}</div>
            <div className="font-semibold mt-1">{x[1] || '—'}</div>
          </div>
        ))}
      </div>
      {a.description && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold mb-2">文物描述</h2>
          <p className="muted whitespace-pre-wrap">{a.description}</p>
        </div>
      )}
      <Section
        title="数字资产"
        accept=".jpg,.jpeg,.png,.webp"
        onUpload={async (f) => {
          await upload(p.id, f, 'assets');
          load();
        }}
      >
        <div className="grid grid-cols-4 gap-4">
          {(a.assets || []).map((x) => (
            <div className="border rounded-lg overflow-hidden" key={x.id}>
              <Image
                className="w-full h-32 object-cover bg-slate-100"
                src={assetUrl(x.file_path)}
                alt={x.original_filename}
                width={640}
                height={480}
                unoptimized
              />
              <div className="p-3 text-sm">
                <div className="truncate font-semibold">{x.original_filename}</div>
                <div className="muted">{size(x.file_size)}</div>
                <button className="text-red-600 mt-2" onClick={() => void remove(x.id, 'asset')}>
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section
        title="资料文档"
        accept=".pdf,.doc,.docx,.txt"
        onUpload={async (f) => {
          await upload(p.id, f, 'documents');
          load();
        }}
      >
        <div className="space-y-3">
          {(a.documents || []).map((x) => (
            <div className="border rounded-lg p-4 flex justify-between" key={x.id}>
              <div>
                <div className="font-semibold">{x.original_filename}</div>
                <div className="muted text-sm">
                  {x.mime_type} · {size(x.file_size)}
                </div>
              </div>
              <button className="text-red-600" onClick={() => void remove(x.id, 'document')}>
                删除
              </button>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
function Section({
  title,
  accept,
  onUpload,
  children,
}: {
  title: string;
  accept: string;
  onUpload: (f: File) => Promise<void>;
  children: React.ReactNode;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  return (
    <section className="card p-6 mb-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <label className="button border bg-white cursor-pointer">
          上传
          <input
            hidden
            type="file"
            accept={accept}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || locked.current) return;
              locked.current = true;
              setBusy(true);
              setError('');
              try {
                await onUpload(f);
              } catch (reason) {
                setError(reason instanceof Error ? reason.message : '上传失败，所选文件保留。');
              } finally {
                locked.current = false;
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
      {busy && <p role="status">正在上传…</p>}
      {error && (
        <p role="alert" className="mb-4 text-red-700">
          {error}
        </p>
      )}
      {title === '资料文档' && (
        <p className="muted mb-4 text-sm">
          此处仅保存文件，不解析 PDF（含扫描件）或 Word 文字。请在 AI
          知识卡中粘贴可核实文本；已上传文件不会自动成为 AI 内容依据。
        </p>
      )}
      {children}
    </section>
  );
}
