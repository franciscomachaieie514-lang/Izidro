'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/platform-login';
    const body = mode === 'register'
      ? { name, email, password, confirmPassword }
      : { email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível continuar.');
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <Link href="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="logo">I</div>
          <div className="brandName">Izi<span>trader</span></div>
        </Link>

        <div className="card">
          <div className="tabs">
            <Link href="/register" className={`tab ${mode === 'register' ? 'active' : ''}`} style={{ textDecoration: 'none', textAlign: 'center' }}>
              Criar conta
            </Link>
            <Link href="/login" className={`tab ${mode === 'login' ? 'active' : ''}`} style={{ textDecoration: 'none', textAlign: 'center' }}>
              Entrar
            </Link>
          </div>

          <h1 className="title">{mode === 'register' ? 'Criar conta Izidro' : 'Entrar no Izidro'}</h1>
          <p className="muted">
            {mode === 'register'
              ? 'Crie a sua conta da plataforma para começar.'
              : 'Entre com o email e a password da sua conta Izidro.'}
          </p>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <>
                <label className="label" htmlFor="name">NOME</label>
                <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" minLength={2} required />
              </>
            )}

            <label className="label" htmlFor="email">EMAIL</label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />

            <label className="label" htmlFor="password">PASSWORD</label>
            <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} required />

            {mode === 'register' && (
              <>
                <label className="label" htmlFor="confirmPassword">CONFIRMAR PASSWORD</label>
                <input id="confirmPassword" className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
              </>
            )}

            <button className="btn primary" type="submit" disabled={busy}>
              {busy ? 'Aguarde...' : mode === 'register' ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          <p className="foot">
            {mode === 'register'
              ? 'Já tem uma conta? '
              : 'Ainda não tem uma conta? '}
            <Link href={mode === 'register' ? '/login' : '/register'} style={{ color: '#f5c04a', fontWeight: 700 }}>
              {mode === 'register' ? 'Entrar' : 'Criar conta'}
            </Link>
          </p>
          <p className="foot">A sua password é protegida no servidor e não é enviada para a Deriv.</p>
        </div>
      </div>
    </main>
  );
}
