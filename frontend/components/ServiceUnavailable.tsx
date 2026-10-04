export function ServiceUnavailable({ retryPath }: { retryPath: string }) {
  return (
    <section role="alert" className="card mx-auto max-w-2xl p-6 sm:p-8">
      <p className="eyebrow mb-3">服务连接提示</p>
      <h1 className="museum-title text-2xl font-semibold">页面暂时无法加载</h1>
      <p className="mt-4 text-stone-600">
        本地数据服务暂不可用。请检查数据库和服务后重试，已有数据不会被清空。
      </p>
      <a className="button secondary mt-5" href={retryPath}>
        重新加载
      </a>
    </section>
  );
}
