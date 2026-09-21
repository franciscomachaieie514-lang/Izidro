'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível continuar.');
      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally { setBusy(false); }
  }

  return (
    <main className="page"><div className="shell">
      <Link href="/" className="brand" style={{ textDecoration:'none', color:'inherit' }}>
        <div className="logo">I</div><div className="brandName">Izi<span>trader</span></div>
      </Link>
      <div className="card">
        <h1 className="title">Esqueceu a password?</h1>
        <p className="muted">Introduza o email da sua conta e enviaremos um link para criar uma nova password.</p>
        <form onSubmit={submit}>
          <label className="label" htmlFor="email">EMAIL</label>
          <input id="email" className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required />
          <button className="btn primary" type="submit" disabled={busy}>{busy ? 'A enviar...' : 'Enviar link de recuperação'}</button>
        </form>
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        <p className="foot"><Link href="/login" style={{color:'#e30613',fontWeight:700}}>Voltar ao login</Link></p>
      </div>
    </div></main>
  );
}
