import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '../../../../lib/platform-auth';
import { sendPasswordResetEmail } from '../../../../lib/email';

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
    if (rateLimited('forgot:' + clientKey(request), 8)) {
      return NextResponse.json({ ok: true, message: 'Se existir uma conta com este email, enviámos as instruções para redefinir a password.' });
    }

    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    const reset = await createPasswordResetToken(email);
    if (reset) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://izitrader.app';
      const resetUrl = baseUrl.replace(/\/$/, '') + '/reset-password?token=' + encodeURIComponent(reset.token);
      try {
        await sendPasswordResetEmail(reset.user.email, resetUrl);
      } catch (error) {
        console.error('[Izidro] password reset email delivery failed', error);
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Se existir uma conta com este email, enviámos as instruções para redefinir a password.'
    });
  } catch (error) {
    console.error('[Izidro] password reset request failed', error);
    return NextResponse.json({
      ok: true,
      message: 'Se existir uma conta com este email, enviámos as instruções para redefinir a password.'
    });
  }
}
