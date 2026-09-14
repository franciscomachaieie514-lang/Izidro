'use client';

import { FormEvent, useEffect, useState } from 'react';

type User = { id:string|number; name:string; email:string };

type AuthState = { user:User|null; derivConnected:boolean; loading:boolean };

const BOTS = [
  ['ProParity','Ganha em dígito par'],['Octawin','Ganha se o dígito for menor que 8'],['OddEz','Ganha em dígito ímpar'],['TradeSix','Ganha se o dígito for maior que 6']
];

export default function Home() {
  const [auth,setAuth]=useState<AuthState>({user:null,derivConnected:false,loading:true});
  const [mode,setMode]=useState<'login'|'register'>('register');
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [confirm,setConfirm]=useState('');
  const [error,setError]=useState(''); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false); const [bot,setBot]=useState(BOTS[0]); const [lastDigit,setLastDigit]=useState('–');

  async function loadSession(){
    try { const r=await fetch('/api/auth/me',{cache:'no-store'}); if(r.ok){const d=await r.json();setAuth({user:d.user,derivConnected:d.derivConnected,loading:false});} else setAuth({user:null,derivConnected:false,loading:false}); }
    catch { setAuth({user:null,derivConnected:false,loading:false}); }
  }
  useEffect(()=>{ loadSession(); const p=new URLSearchParams(location.search); if(p.get('deriv_connected')) setMessage('Conta Deriv conectada com sucesso.'); if(p.get('auth_error')) setError(p.get('auth_error') || 'Erro de autenticação.'); },[]);

  async function submit(e:FormEvent){
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    const endpoint=mode==='register'?'/api/auth/register':'/api/auth/platform-login';
    const body=mode==='register'?{name,email,password,confirmPassword:confirm}:{email,password};
    try { const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Não foi possível continuar.'); setAuth({user:d.user,derivConnected:false,loading:false}); if(mode==='register') setMessage('Conta Izidro criada. Agora conecte a sua conta Deriv.'); }
    catch(e){setError(e instanceof Error?e.message:'Erro inesperado.');} finally {setBusy(false);}
  }

  async function logout(){ await fetch('/api/auth/logout',{method:'POST'}); setAuth({user:null,derivConnected:false,loading:false}); setMode('login'); }

  useEffect(()=>{ if(auth.user && auth.derivConnected){ const id=setInterval(()=>setLastDigit(String(Math.floor(Math.random()*10))),1200); return ()=>clearInterval(id); } },[auth.user,auth.derivConnected]);

  if(auth.loading) return <main className="page"><div className="shell"><Brand/><div className="card muted">A carregar a sua conta...</div></div></main>;

  if(!auth.user) return <main className="page"><div className="shell"><Brand/><div className="card">
    <div className="tabs"><button className={`tab ${mode==='register'?'active':''}`} onClick={()=>{setMode('register');setError('')}}>Criar conta</button><button className={`tab ${mode==='login'?'active':''}`} onClick={()=>{setMode('login');setError('')}}>Entrar</button></div>
    <h1 className="title">{mode==='register'?'Criar conta Izidro':'Entrar no Izidro'}</h1><p className="muted">{mode==='register'?'Crie a sua conta da plataforma e depois conecte a Deriv.':'Entre na sua conta Izidro para continuar.'}</p>
    <form onSubmit={submit}>{mode==='register'&&<><label className="label">NOME</label><input className="input" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" required/></>}<label className="label">EMAIL</label><input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required/><label className="label">PASSWORD</label><input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='register'?'new-password':'current-password'} required/>{mode==='register'&&<><label className="label">CONFIRMAR PASSWORD</label><input className="input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/></>}<button className="btn primary" disabled={busy}>{busy?'Aguarde...':mode==='register'?'Criar conta':'Entrar'}</button></form>
    {error&&<div className="error">{error}</div>}<div className="foot">A sua password fica no servidor; não é enviada para a Deriv.</div>
  </div></div></main>;

  if(!auth.derivConnected) return <main className="page"><div className="shell"><div className="top"><Brand/><div className="user"><strong>{auth.user.name}</strong><small>{auth.user.email}</small></div></div><div className="card"><h1 className="title">Conta Izidro</h1><p className="muted">A conta foi criada. O próximo passo é conectar a sua conta da Deriv.</p><div className="connect card"><h2>Conectar Deriv</h2><p className="muted">Será redirecionado para a página oficial da Deriv para iniciar sessão e autorizar o Izidro. O Izidro nunca recebe a sua password da Deriv.</p><a className="btn primary" style={{display:'block',textAlign:'center',textDecoration:'none'}} href="/api/auth/login">Continuar com Deriv</a></div>{error&&<div className="error">{error}</div>}{message&&<div className="success">{message}</div>}<button className="btn secondary" onClick={logout}>Sair</button></div></div></main>;

  return <main className="page"><div className="shell"><div className="top"><Brand/><div className="user"><strong>{auth.user.name}</strong><small>Deriv conectada</small></div><button className="logout" onClick={logout}>Sair</button></div>{message&&<div className="success">{message}</div>}
    <div className="card balance"><div className="stat"><small>SALDO</small><strong>$0.00</strong></div><div className="stat"><small>LUCRO/PERDA</small><strong className="profit">+$0.00</strong></div></div>
    <div className="grid"><div className="pill demo">Demo</div><div className="pill">Deriv</div><div className="pill">▶ Aula</div></div>
    <div className="card bot"><small className="muted">BOT</small><button onClick={()=>{const i=(BOTS.findIndex(x=>x[0]===bot[0])+1)%BOTS.length;setBot(BOTS[i])}}><strong>{bot[0]}</strong><br/><small>{bot[1]}</small></button></div>
    <div className="card"><small className="muted">HISTÓRICO RECENTE</small><div className="history" style={{marginTop:10}}>{[1,2,3].map(i=><div className="historyItem" key={i}><small>Deriv</small><br/><strong>{lastDigit==='–'?'–':lastDigit}</strong><br/><small>aguardando</small></div>)}</div></div>
    <div className="wheel"><div className="digit d0">0</div><div className="digit d1">1</div><div className="digit d2">2</div><div className="digit d3">3</div><div className="digit d4">4</div><div className="digit d5">5</div><div className="digit d6">6</div><div className="digit d7">7</div><div className="digit d8">8</div><div className="digit d9">9</div><div className="centerDigit"><strong>{lastDigit}</strong><small>ÚLTIMO DÍGITO</small></div></div>
    <div className="card"><div className="row"><span className="muted">APOSTA</span><strong>1.50 USD</strong></div><button className="btn primary" onClick={()=>setMessage('Modo demo: ligação de execução de ordens será ativada na próxima etapa.')}>Operar com {bot[0]}</button><p className="foot">Conta autenticada via Izidro + Deriv OAuth 2.0.</p></div>
  </div></main>;
}

function Brand(){return <div className="brand"><div className="logo">I</div><div className="brandName">Izi<span>trader</span></div></div>}
