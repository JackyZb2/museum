'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <main role="alert">
          <h1>网页暂时无法加载</h1>
          <p>请检查本地服务后重试。已保存的数据不会因页面加载失败而被清空。</p>
          <button onClick={reset}>重试</button>
        </main>
      </body>
    </html>
  );
}
