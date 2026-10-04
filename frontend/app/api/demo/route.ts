import { NextRequest, NextResponse } from 'next/server';
import { demoState, initializeDemo, runDemoStep, DemoConflict } from '../../../lib/demo/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await demoState());
  } catch {
    return NextResponse.json(
      { error: '本地数据库尚未就绪，请先运行前端启动脚本。' },
      { status: 503 },
    );
  }
}
export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return NextResponse.json({ error: '演示请求无效。' }, { status: 400 });
  const values = body as Record<string, unknown>;
  try {
    if (values.action === 'initialize' || values.action === 'reset')
      return NextResponse.json(await initializeDemo(values.action === 'reset'));
    if (
      values.action !== 'step' ||
      typeof values.id !== 'string' ||
      typeof values.step !== 'number' ||
      !Number.isInteger(values.step) ||
      values.step < 1 ||
      values.step > 8
    )
      return NextResponse.json({ error: '演示步骤无效。' }, { status: 400 });
    return NextResponse.json(await runDemoStep(values.id, values.step, values.confirmed === true));
  } catch (reason) {
    return NextResponse.json(
      {
        error:
          reason instanceof DemoConflict
            ? reason.message
            : '本地演示暂未完成，可点击继续或重置后再试。',
      },
      { status: reason instanceof DemoConflict ? 409 : 503 },
    );
  }
}
