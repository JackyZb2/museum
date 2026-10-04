export function userError(
  reason: unknown,
  fallback = '操作未完成，请检查本地服务后重试。已填写内容保留。',
): string {
  if (reason instanceof SyntaxError)
    return '服务响应格式异常，操作结果尚未确认。请保留输入内容，刷新状态后重试。';
  if (
    reason instanceof TypeError ||
    (reason instanceof Error && ['AbortError', 'TimeoutError'].includes(reason.name))
  )
    return '连接失败或请求超时，请检查本地服务。已填写内容保留；重试前请确认操作是否已保存。';
  return reason instanceof Error && /[\u4e00-\u9fff]/.test(reason.message)
    ? reason.message
    : fallback;
}
