'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { userError } from '../../../lib/client-errors';
import { Feedback } from '../../../components/ui/Feedback';

export default function NewAssetPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        body: new FormData(event.currentTarget),
      });
      const data: { id?: string; error?: string } = await response.json();
      if (!response.ok || !data.id) throw new Error(data.error || '上传失败。');
      router.push(`/assets/${data.id}`);
      router.refresh();
    } catch (reason) {
      setError(userError(reason, '上传失败，已填写内容和所选图片保留。'));
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <Link href="/assets" className="text-cyan-700 text-sm">
        ← 返回知识卡列表
      </Link>
      <p className="eyebrow mt-5">建立馆藏档案</p>
      <h1 className="museum-title mt-2 mb-2 text-3xl font-semibold">新增文物</h1>
      <p className="muted mb-6 text-sm">
        图片与人工填写的信息会先保存为草稿；AI 分析需要在详情页手动开始。
      </p>
      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        {[
          ['01', '填写基本信息', '名称和图片为必填项'],
          ['02', '补充来源资料', '只填写可核实的信息'],
          ['03', '保存为草稿', '随后手动开始 AI 分析'],
        ].map(([number, title, hint]) => (
          <div key={number} className="rounded-lg border border-stone-200 bg-[#eef1e9] p-4">
            <p className="text-sm font-semibold">
              <span className="mr-2 text-[#86613f]">{number}</span>
              {title}
            </p>
            <p className="muted mt-1 text-xs">{hint}</p>
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <form onSubmit={submit} aria-busy={saving} className="card space-y-5 p-5 sm:p-7">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-lg font-semibold">基本信息与图片</h2>
            <p className="muted mt-1 text-xs">标记 * 的信息必填。其他字段可以稍后补充。</p>
          </div>
          <label className="block text-sm font-semibold">
            文物名称 *
            <input
              name="name"
              required
              maxLength={120}
              className="mt-2 w-full rounded-lg border p-3 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            文物图片 *
            <input
              name="image"
              type="file"
              required
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="mt-2 block w-full rounded-lg border p-3 font-normal"
            />
            <span className="muted mt-1 block font-normal">支持 JPEG、PNG、WebP，最大 8 MB。</span>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold">
              藏品编号
              <input
                name="inventoryNumber"
                maxLength={120}
                className="mt-2 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              类别（人工填写）
              <input
                name="category"
                maxLength={120}
                className="mt-2 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              材质（人工填写）
              <input
                name="material"
                maxLength={120}
                className="mt-2 w-full rounded-lg border p-3 font-normal"
              />
            </label>
            <label className="block text-sm font-semibold">
              朝代（有来源时填写）
              <input
                name="dynasty"
                maxLength={120}
                className="mt-2 w-full rounded-lg border p-3 font-normal"
              />
            </label>
          </div>
          <label className="block text-sm font-semibold">
            基本描述
            <textarea
              name="description"
              rows={3}
              maxLength={5000}
              className="mt-2 w-full rounded-lg border p-3 font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            来源资料（可选）
            <textarea
              name="sourceText"
              rows={6}
              maxLength={16000}
              className="mt-2 w-full rounded-lg border p-3 font-normal"
              placeholder="粘贴馆藏登记、研究资料等可核实的文字。没有资料可留空。"
            />
            <span className="muted mt-1 block font-normal">
              AI 只会从这里提取有依据的信息；不会仅凭图片推断精确年代或作者。
            </span>
          </label>
          {error && (
            <Feedback tone="error" title="草稿尚未保存">
              {error}
            </Feedback>
          )}
          <div className="flex flex-wrap items-center gap-4 border-t border-stone-100 pt-5">
            <button type="submit" disabled={saving} className="button primary disabled:opacity-50">
              {saving ? '正在上传……' : '保存文物草稿'}
            </button>
            <span className="muted text-xs">保存后进入知识卡，不会自动分析或发布。</span>
          </div>
        </form>
        <aside className="card p-6 xl:sticky xl:top-8">
          <p className="eyebrow">资料填写提示</p>
          <h2 className="mt-3 font-semibold">可信内容，始于可信来源</h2>
          <ul className="muted mt-4 list-disc space-y-3 pl-4 text-sm">
            <li>图片保留完整器型与主要纹饰。</li>
            <li>年代、作者等信息须有资料支持，不确定可留空。</li>
            <li>可粘贴馆藏登记或研究资料中的文字。</li>
            <li>当前不自动解析 PDF，请手动提供可核实文字。</li>
          </ul>
          <p className="mt-5 border-t border-stone-100 pt-4 text-xs text-stone-500">
            AI 负责辅助整理，工作人员负责核对。
          </p>
        </aside>
      </div>
    </>
  );
}
