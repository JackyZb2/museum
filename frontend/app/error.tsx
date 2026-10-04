'use client';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section role="alert" className="card p-8">
      <p className="eyebrow mb-3">服务连接提示</p>
      <h1 className="museum-title text-2xl font-semibold">页面暂时无法加载</h1>
      <p className="muted mt-4">
        本地数据服务可能暂不可用。请检查服务和数据库后重试，不要删除数据库或清空已有资料。
      </p>
      <button onClick={reset} className="button primary mt-5">
        重新加载
      </button>
      <a href="/demo" className="ml-5 text-cyan-700 underline">
        返回演示入口
      </a>
    </section>
  );
}
