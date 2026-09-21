import { Resend } from 'resend';

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || 'Izitrader <onboarding@resend.dev>';

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Redefinir password — Izitrader',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171717">
        <div style="font-size:24px;font-weight:800;margin-bottom:20px">Izi<span style="color:#e24b4a">trader</span></div>
        <h1 style="font-size:24px">Redefinir password</h1>
        <p>Recebemos um pedido para redefinir a password da sua conta Izitrader.</p>
        <p>O link é válido durante <strong>30 minutos</strong> e pode ser usado apenas uma vez.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#e24b4a;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">Redefinir password</a>
        </p>
        <p style="font-size:12px;color:#777">Se não pediu esta alteração, pode ignorar este email.</p>
      </div>`
  });
  if (error) throw new Error(error.message);
}
