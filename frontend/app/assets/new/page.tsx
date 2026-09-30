'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewAssetPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setError(reason instanceof Error ? reason.message : '上传失败。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link href="/assets" className="text-cyan-700 text-sm">
        ← 返回知识卡列表
      </Link>
      <h1 className="mt-3 mb-2 text-3xl font-bold">上传文物</h1>
      <p className="muted mb-8">
        图片与人工填写的信息会先保存为草稿；AI 分析需要在详情页手动开始。
      </p>
      <form onSubmit={submit} className="card max-w-3xl space-y-5 p-7">
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
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <button type="submit" disabled={saving} className="button primary disabled:opacity-50">
          {saving ? '正在上传……' : '保存文物草稿'}
        </button>
      </form>
    </>
  );
}
