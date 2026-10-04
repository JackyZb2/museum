import { NextResponse } from 'next/server';

export function apiFailure(error: unknown): NextResponse {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'P2025')
    return NextResponse.json({ error: '数据不存在或已被删除，请返回列表确认。' }, { status: 404 });
  if (code === 'P2002')
    return NextResponse.json(
      { error: '藏品编号或版本已存在，请检查后重试。原有内容未修改。' },
      { status: 409 },
    );
  if (code === 'P2003')
    return NextResponse.json(
      { error: '关联数据正在使用或已变化，操作未完成，请刷新后确认。' },
      { status: 409 },
    );
  return NextResponse.json(
    { error: '本地数据服务暂不可用，操作未完成。请保留已填写内容，检查数据库后重试。' },
    { status: 503 },
  );
}

export function withApiErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      return apiFailure(error);
    }
  };
}
