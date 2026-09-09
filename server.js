const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 10000);
const APP_ID = String(process.env.DERIV_APP_ID || '').trim();
const BASE_URL = String(process.env.NEXT_PUBLIC_BASE_URL || 'https://izidro.onrender.com').trim().replace(/\/$/, '');
const REDIRECT_URI = String(process.env.REDIRECT_URL || `${BASE_URL}/api/auth/callback`).trim();
const AUTHORIZE_URL = 'https://auth.deriv.com/oauth2/auth';
const TOKEN_URL = 'https://auth.deriv.com/oauth2/token';
const DERIV_API_URL = 'https://api.derivws.com';
const OAUTH_TTL = 10 * 60 * 1000;
const SESSION_TTL = 7 * 24 * 60 * 60;
const oauthStates = new Map();
const sessions = new Map();

function configError(){const missing=[];if(!APP_ID)missing.push('DERIV_APP_ID');if(!BASE_URL)missing.push('NEXT_PUBLIC_BASE_URL');if(!REDIRECT_URI)missing.push('REDIRECT_URL');return missing}
function randomToken(bytes=32){return crypto.randomBytes(bytes).toString('base64url')}
function sha256(value){return crypto.createHash('sha256').update(value).digest('base64url')}
function parseCookies(header=''){const out={};for(const part of header.split(';')){const i=part.indexOf('=');if(i>0)out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim())}return out}
function cookie(name,value,options={}){const p=[`${name}=${encodeURIComponent(value)}`,`Path=${options.path||'/'}`,`SameSite=${options.sameSite||'Lax'}`];if(options.httpOnly!==false)p.push('HttpOnly');if(options.maxAge!=null)p.push(`Max-Age=${options.maxAge}`);if(options.secure!==false)p.push('Secure');return p.join('; ')}
function clearCookie(name){return cookie(name,'',{maxAge:0})}
function json(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body))}
function redirect(res,location,headers={}){res.writeHead(302,{Location:location,'Cache-Control':'no-store',...headers});res.end()}

async function exchangeCode(code,verifier){
  const body=new URLSearchParams({grant_type:'authorization_code',client_id:APP_ID,code,redirect_uri:REDIRECT_URI,code_verifier:verifier});
  const response=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.access_token)throw new Error(`OAuth token exchange failed (${response.status}): ${data?.error_description||data?.error||'unknown error'}`);
  return data;
}

function tokenSession(req){
  const c=parseCookies(req.headers.cookie||'');
  const accessToken=c.deriv_access_token;
  const refreshToken=c.deriv_refresh_token;
  const sid=c['__Host-izitrader_session'];
  if(accessToken)return {accessToken,refreshToken,sid};
  if(sid){const s=sessions.get(sid);if(s&&s.expiresAt>Date.now())return {...s,id:sid}}
  return null;
}

async function refreshSession(session){
  if(!session?.refreshToken)return false;
  const body=new URLSearchParams({grant_type:'refresh_token',client_id:APP_ID,refresh_token:session.refreshToken});
  const response=await fetch(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await response.json().catch(()=>null);
  if(!response.ok||!data?.access_token)return false;
  session.accessToken=data.access_token;
  session.refreshToken=data.refresh_token||session.refreshToken;
  session.tokenExpiresAt=Date.now()+Number(data.expires_in||3600)*1000;
  if(session.id)sessions.set(session.id,session);
  return true;
}

async function derivRequest(session,pathname,options={}){
  const request=async()=>fetch(`${DERIV_API_URL}${pathname}`,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${session.accessToken}`,'Deriv-App-ID':APP_ID}});
  let response=await request();
  let data=await response.json().catch(()=>null);
  if((response.status===401||response.status===403)&&await refreshSession(session)){response=await request();data=await response.json().catch(()=>null)}
  if(!response.ok)throw Object.assign(new Error(data?.errors?.[0]?.message||`Deriv API error (${response.status})`),{status:response.status,data});
  return data;
}

function extractAccounts(payload){const data=payload?.data;if(Array.isArray(data))return data;if(data&&typeof data==='object'){if(Array.isArray(data.accounts))return data.accounts;if(data.account_id)return[data]}return[]}
function accountId(a){return a?.account_id||a?.accountId||a?.id||a?.loginid}
function isReal(a){return String(a?.account_type||a?.type||'').toLowerCase()==='real'||a?.is_virtual===false}
function isDemo(a){return String(a?.account_type||a?.type||'').toLowerCase()==='demo'||a?.is_virtual===true}
function contentType(file){const ext=path.extname(file).toLowerCase();return({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ico':'image/x-icon'})[ext]||'application/octet-stream'}

function serveStatic(req,res){
  const pathname=decodeURIComponent(new URL(req.url,`http://${req.headers.host||'localhost'}`).pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,'');
  const file=path.resolve(__dirname,relative);
  if(!file.startsWith(path.resolve(__dirname)+path.sep))return json(res,403,{error:'Forbidden'});
  fs.readFile(file,(err,data)=>{
    if(err)return json(res,404,{error:'Not found'});
    if(pathname==='/'){
      let html=data.toString('utf8');
      html=html.replace('href="https://track.deriv.com/_PZZnG4RWbBdZl7VyVw174GNd7ZgqdRLk/1/" target="_blank" rel="noopener" id="loginLink"','href="/api/auth/login" id="loginLink"');
      html=html.replace(/\s*<button[^>]*id="demoAccess"[^>]*>[\s\S]*?<\/button>/i,'');
      html=html.replace(/\s*<div[^>]*class="auth-note"[^>]*>[\s\S]*?<\/div>/i,'');
      html=html.replace(/<title>[^<]*<\/title>/i,'<title>Izitrader</title>');
      html=html.replace(/(<div class="value" id="balance">)[^<]*/i,'$1A carregar...');
      html=html.replace(/(<div class="value profit" id="pnl">)[^<]*/i,'$1$0.00');
      html=html.replace(/(<div class="pill pill-demo"[^>]*>)[^<]*/i,'$1A ligar...');
      if(!html.includes('/auth.js'))html=html.replace('</body>','<script src="/auth.js"></script></body>');
      if(!html.includes('/react-deriv-bot.js'))html=html.replace('</body>','<script src="/react-deriv-bot.js"></script></body>');
      data=Buffer.from(html,'utf8');
    }
    res.writeHead(200,{'Content-Type':contentType(file),'Cache-Control':pathname==='/'?'no-cache':'public, max-age=300'});res.end(data);
  });
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    const missing=configError();

    if(url.pathname==='/api/auth/login'&&req.method==='GET'){
      if(missing.length)return json(res,500,{error:'OAuth server configuration is incomplete',missing});
      const verifier=randomToken(32),challenge=sha256(verifier),state=randomToken(24);oauthStates.set(state,{createdAt:Date.now()});
      const auth=new URL(AUTHORIZE_URL);auth.searchParams.set('response_type','code');auth.searchParams.set('client_id',APP_ID);auth.searchParams.set('redirect_uri',REDIRECT_URI);auth.searchParams.set('scope','trade');auth.searchParams.set('state',state);auth.searchParams.set('code_challenge',challenge);auth.searchParams.set('code_challenge_method','S256');
      return redirect(res,auth.toString(),{'Set-Cookie':[cookie('__Host-izitrader_oauth_state',state,{maxAge:OAUTH_TTL/1000}),cookie('__Host-izitrader_oauth_verifier',verifier,{maxAge:OAUTH_TTL/1000})]});
    }

    if(url.pathname==='/api/auth/callback'&&req.method==='GET'){
      const cookies=parseCookies(req.headers.cookie||''),code=url.searchParams.get('code'),state=url.searchParams.get('state'),oauthError=url.searchParams.get('error');
      if(oauthError)return redirect(res,`/?auth_error=${encodeURIComponent(oauthError)}`,{'Set-Cookie':[clearCookie('__Host-izitrader_oauth_state'),clearCookie('__Host-izitrader_oauth_verifier')]});
      const cookieState=cookies['__Host-izitrader_oauth_state'],verifier=cookies['__Host-izitrader_oauth_verifier'],pending=state&&oauthStates.get(state);
      if(!code||!state||!verifier||state!==cookieState||!pending||Date.now()-pending.createdAt>OAUTH_TTL)return redirect(res,'/?auth_error=invalid_oauth_state',{'Set-Cookie':[clearCookie('__Host-izitrader_oauth_state'),clearCookie('__Host-izitrader_oauth_verifier')]});
      oauthStates.delete(state);
      try{
        const token=await exchangeCode(code,verifier),sid=randomToken(32),maxAge=SESSION_TTL;
        sessions.set(sid,{accessToken:token.access_token,refreshToken:token.refresh_token||null,tokenExpiresAt:Date.now()+Number(token.expires_in||3600)*1000,createdAt:Date.now(),expiresAt:Date.now()+SESSION_TTL*1000});
        return redirect(res,'/',{'Set-Cookie':[cookie('__Host-izitrader_session',sid,{maxAge}),cookie('deriv_access_token',token.access_token,{maxAge}),cookie('deriv_refresh_token',token.refresh_token||'',{maxAge}),clearCookie('__Host-izitrader_oauth_state'),clearCookie('__Host-izitrader_oauth_verifier')]});
      }catch(error){console.error('[Izitrader OAuth callback]',error.message);return redirect(res,'/?auth_error=token_exchange_failed',{'Set-Cookie':[clearCookie('__Host-izitrader_oauth_state'),clearCookie('__Host-izitrader_oauth_verifier')]})}
    }

    if(url.pathname==='/api/auth/session'&&req.method==='GET'){
      const session=tokenSession(req);return json(res,200,session?{authenticated:true,expiresAt:session.expiresAt||null,tokenExpiresAt:session.tokenExpiresAt||null}:{authenticated:false});
    }

    if(url.pathname==='/api/deriv/accounts'&&req.method==='GET'){
      const session=tokenSession(req);if(!session)return json(res,401,{error:'Not authenticated'});
      try{const payload=await derivRequest(session,'/trading/v1/options/accounts');const accounts=extractAccounts(payload);return json(res,200,{accounts,data:accounts})}catch(error){return json(res,error.status||502,{error:error.message,details:error.data?.errors||null})}
    }

    if(url.pathname==='/api/deriv/ws-url'&&(req.method==='GET'||req.method==='POST')){
      const session=tokenSession(req);if(!session)return json(res,401,{error:'Not authenticated'});
      let accountIdValue='';
      if(req.method==='GET')accountIdValue=String(url.searchParams.get('account_id')||'').trim();
      else{let body='';for await(const chunk of req)body+=chunk;let payload={};try{payload=body?JSON.parse(body):{}}catch{return json(res,400,{error:'Invalid JSON'})}accountIdValue=String(payload.account_id||'').trim()}
      if(!/^[A-Z]{2,8}\d{5,}$/.test(accountIdValue))return json(res,400,{error:'Invalid account_id'});
      try{
        const accountsPayload=await derivRequest(session,'/trading/v1/options/accounts');
        const accounts=extractAccounts(accountsPayload);const owned=accounts.find(a=>String(accountId(a))===accountIdValue);
        if(!owned)return json(res,403,{error:'A conta solicitada não pertence à sessão Deriv autenticada'});
        const result=await derivRequest(session,`/trading/v1/options/accounts/${encodeURIComponent(accountIdValue)}/otp`,{method:'POST'});
        const wsUrl=result?.data?.url;if(!wsUrl)return json(res,502,{error:'Deriv did not return an authenticated WebSocket URL'});
        return json(res,200,{data:{url:wsUrl},wsUrl,account_id:accountIdValue,account_type:isReal(owned)?'real':isDemo(owned)?'demo':'unknown'});
      }catch(error){return json(res,error.status||502,{error:error.message,details:error.data?.errors||null})}
    }

    if(url.pathname==='/api/auth/logout'&&(req.method==='GET'||req.method==='POST')){
      const cookies=parseCookies(req.headers.cookie||''),sid=cookies['__Host-izitrader_session'];if(sid)sessions.delete(sid);
      return json(res,200,{ok:true},{'Set-Cookie':[clearCookie('__Host-izitrader_session'),clearCookie('deriv_access_token'),clearCookie('deriv_refresh_token')]});
    }

    if(url.pathname==='/api/health'&&req.method==='GET')return json(res,200,{ok:true,oauth:true,derivApi:true,websocketSession:true,configured:missing.length===0,missing});
    return serveStatic(req,res);
  }catch(error){console.error('[Izitrader]',error);return json(res,500,{error:'Internal server error'})}
});

setInterval(()=>{const now=Date.now();for(const[state,item]of oauthStates)if(now-item.createdAt>OAUTH_TTL)oauthStates.delete(state);for(const[id,s]of sessions)if(s.expiresAt<now)sessions.delete(id)},60000).unref();
server.listen(PORT,'0.0.0.0',()=>console.log(`[Izitrader] listening on ${PORT}; OAuth redirect: ${REDIRECT_URI}`));
