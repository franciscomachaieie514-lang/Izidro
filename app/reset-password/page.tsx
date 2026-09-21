'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível redefinir a password.');
      setDone(true);
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
        {done ? <>
          <h1 className="title">Password alterada</h1>
          <p className="muted">A sua password foi redefinida com sucesso. Já pode entrar na plataforma.</p>
          <Link href="/login" className="btn primary" style={{display:'block',textAlign:'center',textDecoration:'none',marginTop:16}}>Entrar</Link>
        </> : <>
          <h1 className="title">Nova password</h1>
          <p className="muted">Escolha uma nova password para a sua conta Izitrader.</p>
          <form onSubmit={submit}>
            <label className="label" htmlFor="password">NOVA PASSWORD</label>
            <input id="password" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            <label className="label" htmlFor="confirmPassword">CONFIRMAR PASSWORD</label>
            <input id="confirmPassword" className="input" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            <button className="btn primary" type="submit" disabled={busy || !token}>{busy ? 'A guardar...' : 'Redefinir password'}</button>
          </form>
          {!token && <div className="error">Link de recuperação inválido ou incompleto.</div>}
          {error && <div className="error">{error}</div>}
          <p className="foot"><Link href="/login" style={{color:'#e30613',fontWeight:700}}>Voltar ao login</Link></p>
        </>}
      </div>
    </div></main>
  );
}
