import { NextRequest, NextResponse } from 'next/server';
import { createPasswordResetToken } from '../../../../lib/platform-auth';
import { sendPasswordResetEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    const reset = await createPasswordResetToken(email);
    if (reset) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://izitrader.app';
      const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(reset.token)}`;
      await sendPasswordResetEmail(reset.user.email, resetUrl);
    }

    return NextResponse.json({
      ok: true,
      message: 'Se existir uma conta com este email, enviámos as instruções para redefinir a password.'
    });
  } catch (error) {
    console.error('[Izidro] password reset request failed', error);
    return NextResponse.json({ error: 'Não foi possível enviar as instruções. Tente novamente.' }, { status: 500 });
  }
}
