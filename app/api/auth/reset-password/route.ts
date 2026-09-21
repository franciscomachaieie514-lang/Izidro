import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordWithToken } from '../../../../lib/platform-auth';

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function clientKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}
function rateLimited(key: string, limit: number) {
  const now = Date.now();
  const row = rateBuckets.get(key);
  if (!row || row.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  row.count += 1;
  return row.count > limit;
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (rateLimited('reset:' + clientKey(request), 12)) {
      return NextResponse.json({ error: 'Demasiadas tentativas. Tente novamente mais tarde.' }, { status: 429 });
    }

    const body = await request.json();
    const token = String(body?.token || '');
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!token) return NextResponse.json({ error: 'Link de recuperação inválido.' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'A password deve ter pelo menos 8 caracteres.' }, { status: 400 });
    if (password !== confirmPassword) return NextResponse.json({ error: 'As passwords não coincidem.' }, { status: 400 });

    const ok = await resetPasswordWithToken(token, password);
    if (!ok) return NextResponse.json({ error: 'Este link expirou ou já foi utilizado.' }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Izidro] password reset failed', error);
    return NextResponse.json({ error: 'Não foi possível redefinir a password.' }, { status: 500 });
  }
}
