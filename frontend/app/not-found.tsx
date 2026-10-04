export default function NotFound() {
  return (
    <main className="card mx-auto my-12 max-w-xl p-6 sm:p-8">
      <p className="eyebrow mb-3">访问提示 / 未开放</p>
      <h1 className="museum-title text-2xl font-semibold">页面不存在或展品尚未开放</h1>
      <p className="mt-4 text-stone-600">请确认链接是否正确。未发布的文物不能通过游客页面访问。</p>
    </main>
  );
}
