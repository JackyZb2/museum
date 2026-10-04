'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { NarrationPanel } from '../../../components/NarrationPanel';
import { PublishControl } from '../../../components/PublishControl';
import { userError } from '../../../lib/client-errors';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Feedback } from '../../../components/ui/Feedback';
import { EmptyState, LoadingState } from '../../../components/ui/PageState';
import { WorkflowProgress } from '../../../components/ui/WorkflowProgress';

type KnowledgeCard = {
  id: string;
  name: string;
  inventoryNumber: string | null;
  category: string | null;
  dynasty: string | null;
  material: string | null;
  dimensions: string | null;
  description: string | null;
  imageUrl: string | null;
  status: string;
  authorizationStatus: string;
  approvedNarrationCount: number;
  narrationReview: { variant: string; version: number | null; status: string | null }[];
  metadata: {
    visualDescription: string | null;
    shapeFeatures: string | null;
    patternFeatures: string | null;
    aiCategory: string | null;
    aiMaterial: string | null;
    confidence: number | null;
    source: string | null;
    aiTags: string[];
    manualTags: string[];
    reviewedTags: string[] | null;
    documentSummary: string | null;
  };
  sourceDocuments: {
    id: string;
    title: string;
    extractedText: string | null;
    source: string | null;
  }[];
};

const steps = ['读取图片', '解析资料', 'AI视觉分析', '提取标签', '生成结构化元数据', '完成'];
const fields = [
  ['name', '文物名称'],
  ['inventoryNumber', '藏品编号'],
  ['category', '类别'],
  ['material', '材质'],
  ['dynasty', '朝代'],
  ['dimensions', '尺寸'],
] as const;
type Field = (typeof fields)[number][0] | 'description';
type EditValues = Record<Field, string>;

async function responseError(response: Response): Promise<string> {
  const data: { error?: string } = await response.json().catch(() => ({}));
  return data.error || '操作失败，请稍后重试。';
}

export default function KnowledgeCardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<KnowledgeCard | null>(null);
  const [form, setForm] = useState<EditValues | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = useRef(false);
  const analysisLock = useRef(false);
  const saveLock = useRef(false);
  const currentId = useRef(id);

  const load = useCallback(async () => {
    const response = await fetch(`/api/assets/${id}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await responseError(response));
    const data: KnowledgeCard = await response.json();
    if (currentId.current !== id) return;
    setAsset(data);
    if (!dirty.current)
      setForm({
        name: data.name,
        inventoryNumber: data.inventoryNumber || '',
        category: data.category || '',
        dynasty: data.dynasty || '',
        material: data.material || '',
        dimensions: data.dimensions || '',
        description: data.description || '',
      });
    setTags(
      data.metadata.reviewedTags ?? [
        ...new Set([...data.metadata.aiTags, ...data.metadata.manualTags]),
      ],
    );
  }, [id]);

  useEffect(() => {
    currentId.current = id;
    dirty.current = false;
    setAsset(null);
    setForm(null);
    void load().catch((reason) =>
      setError(userError(reason, '文物加载失败，请检查链接和本地服务。')),
    );
  }, [load, id]);

  async function analyze() {
    if (analysisLock.current) return;
    analysisLock.current = true;
    setError('');
    setNotice('');
    setProgress({});
    setBusy(true);
    try {
      const response = await fetch(`/api/assets/${id}/analyze`, { method: 'POST' });
      if (!response.ok) throw new Error(await responseError(response));
      if (!response.body) throw new Error('无法读取分析进度。');
      setAsset((current) => (current ? { ...current, status: 'PROCESSING' } : current));
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      let warning = '';
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const event: { step: string; status: string; message?: string } = JSON.parse(line);
          setProgress((current) => ({ ...current, [event.step]: event.status }));
          if (event.message) {
            warning = event.message;
            setNotice(event.message);
          }
          if (event.status === 'error') throw new Error(event.message || '分析失败。');
          if (event.step === '完成') completed = true;
        }
        if (done) break;
      }
      if (!completed) throw new Error('分析连接中断，请刷新页面查看状态。');
      await load();
      router.refresh();
      setNotice(
        `${warning ? warning + ' ' : ''}分析完成。请人工核对后再使用知识卡内容。未保存的表单内容已保留。`,
      );
    } catch (reason) {
      setError(userError(reason, '分析失败，已填写内容保留。'));
      await load().catch(() => {});
    } finally {
      analysisLock.current = false;
      setBusy(false);
    }
  }

  async function saveFields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saveLock.current) return;
    saveLock.current = true;
    setError('');
    setSaving(true);
    try {
      const response = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await responseError(response));
      dirty.current = false;
      await load();
      router.refresh();
      setNotice('基本信息已保存。');
    } catch (reason) {
      setError(userError(reason, '保存失败，已填写内容保留。'));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }

  async function saveTags(nextTags: string[]) {
    setError('');
    const response = await fetch(`/api/assets/${id}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: nextTags }),
    });
    if (!response.ok) throw new Error(await responseError(response));
    setTags(nextTags);
    setNotice('标签已保存。');
  }

  if (!asset || !form)
    return error ? (
      <Feedback tone="error" title="文物暂时无法读取">
        {error}
        <Link href="/assets" className="mt-3 block underline">
          返回文物列表
        </Link>
      </Feedback>
    ) : (
      <LoadingState label="正在加载文物知识卡…" />
    );
  return (
    <>
      <Link href="/assets" className="text-cyan-700 text-sm">
        ← 返回知识卡列表
      </Link>
      <header className="mt-3 mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">文物知识卡 / 资料与人工确认</p>
          <h1 className="museum-title mt-2 text-3xl font-semibold">{asset.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={asset.status} />
            {asset.authorizationStatus === 'DEMO_ONLY' && <StatusBadge status="DEMO" />}
          </div>
          <p className="muted mt-3 text-sm">
            讲解审核：{asset.narrationReview.filter((item) => item.status === 'APPROVED').length}/4
            个最新版本已审核
          </p>
          <Link href={`/assets/${id}/review`} className="mt-2 inline-block text-cyan-700 underline">
            查看讲解审核状态与处理记录 →
          </Link>
        </div>
        <div className="flex flex-col items-start gap-3">
          <PublishControl
            assetId={id}
            status={asset.status}
            approvedCount={asset.approvedNarrationCount}
            onPublished={load}
          />
          <button
            type="button"
            onClick={() => void analyze()}
            disabled={busy || asset.status === 'PUBLISHED'}
            className="button border bg-white disabled:opacity-50"
          >
            {busy ? '正在分析……' : '开始 AI 分析'}
          </button>
        </div>
      </header>
      {error && (
        <div className="mb-5">
          <Feedback tone="error" title="操作未完成">
            {error}
          </Feedback>
        </div>
      )}
      {notice && (
        <div className="mb-5">
          <Feedback
            tone={notice.includes('回退') || notice.includes('模拟') ? 'warning' : 'success'}
          >
            {notice}
          </Feedback>
        </div>
      )}
      {asset.status === 'PROCESSING' && !busy && (
        <p className="mb-5 rounded-lg bg-amber-50 p-4 text-amber-800">
          分析正在进行；如果进度长时间未更新，请稍后刷新。
        </p>
      )}
      {Object.keys(progress).length > 0 && (
        <section className="card mb-6 p-6" aria-label="AI 分析进度">
          <h2 className="mb-2 text-lg font-semibold">AI 处理进度</h2>
          <p className="muted mb-5 text-xs">完成分析后进入待审核状态，不会自动确认历史事实。</p>
          <WorkflowProgress
            label="文物分析"
            steps={steps.map((title) => ({
              title,
              state:
                progress[title] === 'done'
                  ? 'DONE'
                  : progress[title] === 'started'
                    ? error
                      ? 'ERROR'
                      : 'PROCESSING'
                    : 'WAITING',
            }))}
          />
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          <section className="card overflow-hidden">
            <h2 className="p-5 text-lg font-bold">文物图片</h2>
            {asset.imageUrl && (
              <Image
                src={asset.imageUrl}
                alt={asset.name}
                width={900}
                height={700}
                unoptimized
                className="w-full object-contain bg-slate-100"
              />
            )}
            {!asset.imageUrl && (
              <div className="px-5 pb-5">
                <EmptyState title="暂无文物图片" description="图片尚未提供，暂不能进行视觉分析。" />
              </div>
            )}
          </section>
          <section className="card p-6">
            <h2 className="mb-3 text-lg font-bold">来源资料</h2>
            {asset.sourceDocuments.length ? (
              asset.sourceDocuments.map((document) => (
                <div key={document.id} className="mb-4 border-t pt-3">
                  <h3 className="font-semibold">{document.title}</h3>
                  <p className="muted mt-2 whitespace-pre-wrap text-sm">
                    {document.extractedText || '资料中未提供'}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="尚无来源资料"
                description="未提供资料时，讲解只能使用受限内容，不推断精确年代或历史背景。"
              />
            )}
          </section>
        </div>
        <div className="space-y-6 xl:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-bold">基本信息（人工填写）</h2>
            <form onSubmit={saveFields} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(([key, label]) => (
                  <label key={key} className="block text-sm font-semibold">
                    {label}
                    <input
                      required={key === 'name'}
                      maxLength={120}
                      className="mt-2 w-full rounded-lg border p-3 font-normal"
                      value={form[key]}
                      disabled={saving}
                      onChange={(event) => {
                        dirty.current = true;
                        setForm({ ...form, [key]: event.target.value });
                      }}
                    />
                  </label>
                ))}
              </div>
              <label className="block text-sm font-semibold">
                文物描述
                <textarea
                  rows={3}
                  maxLength={5000}
                  className="mt-2 w-full rounded-lg border p-3 font-normal"
                  value={form.description}
                  disabled={saving}
                  onChange={(event) => {
                    dirty.current = true;
                    setForm({ ...form, description: event.target.value });
                  }}
                />
              </label>
              <button disabled={saving} className="button border bg-white disabled:opacity-50">
                {saving ? '保存中……' : '保存基本信息'}
              </button>
            </form>
          </section>
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-bold">AI 视觉分析</h2>
            {asset.metadata.visualDescription ? (
              <>
                <p className="muted mb-4">
                  {asset.metadata.source === 'mock'
                    ? '模拟分析结果，未对图片进行真实识别。'
                    : asset.metadata.source === 'fallback'
                      ? '分析结果未通过校验，请人工核对。'
                      : 'AI 辅助分析结果，需人工核对。'}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['建议类别', asset.metadata.aiCategory],
                    ['可能材质', asset.metadata.aiMaterial],
                    ['器型特征', asset.metadata.shapeFeatures],
                    ['纹样特征', asset.metadata.patternFeatures],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div className="muted text-sm">{label}</div>
                      <div className="mt-1 font-medium">{value || '未知'}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <div className="muted text-sm">视觉描述</div>
                  <p className="mt-1 whitespace-pre-wrap">{asset.metadata.visualDescription}</p>
                </div>
                <p className="muted mt-5 text-sm">
                  AI 分析置信度：
                  {asset.metadata.confidence === null
                    ? '未知'
                    : `${Math.round(asset.metadata.confidence * 100)}%`}
                  。这是模型输出的信心值，不代表文物鉴定准确率。
                </p>
              </>
            ) : (
              <EmptyState
                title="尚未生成视觉分析"
                description="点击页面上方的“开始 AI 分析”，整理器型、纹样与推荐标签；所有结果仍需人工核对。"
              />
            )}
          </section>
          <section className="card p-6">
            <h2 className="mb-3 text-lg font-bold">标签（可人工增删）</h2>
            {asset.metadata.aiTags.length > 0 && (
              <p className="muted mb-3 text-sm">
                AI 推荐：{asset.metadata.aiTags.join('、')}。当前标签以人工修订结果为准。
              </p>
            )}
            <div className="mb-4 flex flex-wrap gap-2">
              {tags.length ? (
                tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-cyan-50 px-3 py-1 text-sm text-cyan-900"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`删除标签 ${tag}`}
                      className="ml-2 font-bold"
                      onClick={() =>
                        void saveTags(tags.filter((item) => item !== tag)).catch((reason) =>
                          setError(userError(reason, '保存标签失败。')),
                        )
                      }
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="muted">暂无标签</span>
              )}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const tag = newTag.trim();
                if (!tag || tags.includes(tag)) return;
                void saveTags([...tags, tag])
                  .then(() => setNewTag(''))
                  .catch((reason) => setError(userError(reason, '保存标签失败。')));
              }}
              className="flex gap-2"
            >
              <input
                aria-label="新标签"
                value={newTag}
                maxLength={50}
                onChange={(event) => setNewTag(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border p-3"
                placeholder="输入新标签"
              />
              <button className="button border bg-white">添加标签</button>
            </form>
          </section>
          <section className="card p-6">
            <h2 className="mb-3 text-lg font-bold">资料提取摘要</h2>
            <p className="muted whitespace-pre-wrap">
              {asset.metadata.documentSummary || '资料中未提供'}
            </p>
            <p className="muted mt-4 text-sm">
              精确年代、作者、出土地、历史事件和具体用途不会仅凭图片确定；未知信息请以来源资料与人工审核为准。
            </p>
          </section>
        </div>
      </div>
      <NarrationPanel assetId={id} />
    </>
  );
}
