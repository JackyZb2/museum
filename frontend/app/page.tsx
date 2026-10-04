import Image from 'next/image';
import Link from 'next/link';

const capabilities = [
  {
    number: '01',
    title: 'AI资产治理',
    description: '从图片与馆藏资料出发，整理类别、材质、外观与标签，构建可人工核对的文物知识卡。',
  },
  {
    number: '02',
    title: '可信内容生成',
    description: '依据已提供资料生成四种讲解，保留内容来源。AI 草稿与人工审核内容明确区分。',
  },
  {
    number: '03',
    title: '多场景数字输出',
    description: '已审核讲解可用于普通游客、儿童、专业阅读与快速介绍，并在游客数字展厅展示。',
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-12 pt-12 sm:px-8 sm:pt-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <p className="eyebrow">面向博物馆的数字资产与内容工作空间</p>
          <h1 className="museum-title mt-5 max-w-2xl text-4xl font-semibold leading-[1.4] sm:text-5xl">
            文博数字资产 AI 工作台
          </h1>
          <p className="mt-6 text-xl leading-8 text-stone-600">
            让馆藏数字资产从‘存起来’走向‘用起来’
          </p>
          <p className="muted mt-5 max-w-xl text-sm leading-7">
            以馆藏资料为依据，以人工审核为关口。将文物图片、结构化知识与可信讲解连接起来，让数字馆藏更易整理、更易理解、更易使用。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="button primary">
              进入工作台 <span aria-hidden="true">→</span>
            </Link>
            <Link href="/demo" className="button secondary">
              查看 Demo
            </Link>
          </div>
          <p className="muted mt-6 text-xs">支持本地演示 · 无密钥可体验 · AI 内容需人工确认</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#d9dfd3] bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
            <span className="eyebrow">数字馆藏档案</span>
            <span className="text-xs text-stone-500">演示示意</span>
          </div>
          <Image
            src="/demo-images/bronze-ding.svg"
            alt="青铜鼎演示示意图，非真实馆藏照片"
            width={900}
            height={700}
            unoptimized
            priority
            className="h-64 w-full object-contain sm:h-72"
          />
          <div className="border-t border-stone-200 px-6 py-5">
            <div className="flex items-center justify-between">
              <h2 className="museum-title text-2xl">青铜鼎</h2>
              <span className="text-xs text-stone-500">演示样本</span>
            </div>
            <p className="muted mt-2 text-xs">演示数据，仅用于产品功能展示。</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#48614b]">
              {['图片', '知识卡', '来源资料', '审核讲解'].map((item) => (
                <span
                  key={item}
                  className="rounded border border-[#dce4d7] bg-[#f5f7f1] px-2.5 py-1"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section
        aria-label="平台核心能力"
        className="mt-16 grid gap-5 border-t border-stone-200 pt-9 sm:grid-cols-3"
      >
        {capabilities.map((item) => (
          <article key={item.number} className="card p-6">
            <span className="eyebrow">{item.number}</span>
            <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
            <p className="muted mt-3 text-sm leading-7">{item.description}</p>
          </article>
        ))}
      </section>
      <footer className="muted mt-10 flex flex-wrap justify-between gap-3 text-xs">
        <span>文博数字资产 AI 工作台</span>
        <span>资料有据 · 内容可审 · 输出可信</span>
      </footer>
    </div>
  );
}
