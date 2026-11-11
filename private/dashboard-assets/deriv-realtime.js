/* Izitrader dashboard bridge.
 * Trading decisions, Deriv authentication and contract execution live on the server.
 * This browser file only displays server events and sends explicit user controls.
 */
(function(){
'use strict';
const NativeWS=window.WebSocket;
const SYMBOLS={V10:'R_10',V15:'1HZ15V',V25:'R_25',V30:'1HZ30V',V50:'R_50',V75:'R_75',V90:'1HZ90V',V100:'R_100',V150:'1HZ150V',V250:'1HZ250V',V10_1S:'1HZ10V',V25_1S:'1HZ25V',V50_1S:'1HZ50V',V75_1S:'1HZ75V',V100_1S:'1HZ100V'};
const LABELS={V10:'Volatility 10',V15:'Volatility 15 (1s)',V25:'Volatility 25',V30:'Volatility 30 (1s)',V50:'Volatility 50',V75:'Volatility 75',V90:'Volatility 90 (1s)',V100:'Volatility 100',V150:'Volatility 150 (1s)',V250:'Volatility 250 (1s)',V10_1S:'Volatility 10 (1s)',V25_1S:'Volatility 25 (1s)',V50_1S:'Volatility 50 (1s)',V75_1S:'Volatility 75 (1s)',V100_1S:'Volatility 100 (1s)'};
let socket=null,reconnectTimer=null,pingTimer=null,handshakeTimer=null,configurationTimer=null,connecting=false,stopped=false,active=false,connected=false,configured=false;
let accountType=localStorage.getItem('izitrader_account_type')==='demo'?'demo':'real';
let uiSymbol=localStorage.getItem('izitrader_symbol')||'V100';
if(!SYMBOLS[uiSymbol])uiSymbol='V100';
let bot=localStorage.getItem('izitrader_bot')||'ProParity';
if(!['ProParity','Octawin'].includes(bot))bot='ProParity';
let baseStake=Math.max(.35,Number(localStorage.getItem('izitrader_stake')||.35));
let workerId=String(window.__IZI_SESSION_ID__||'');
try{
 if(!/^[A-Za-z0-9_-]{8,80}$/.test(workerId))workerId=sessionStorage.getItem('izitrader_worker_id')||'';
 if(!/^[A-Za-z0-9_-]{8,80}$/.test(workerId))workerId='';
 if(!workerId)workerId=window.crypto?.randomUUID?.()||('w'+Date.now().toString(36)+Math.random().toString(36).slice(2));
 sessionStorage.setItem('izitrader_worker_id',workerId);
}catch{if(!workerId)workerId='w'+Date.now().toString(36)+Math.random().toString(36).slice(2)}
let balance=null,pnl=0,stake=baseStake,level=0,statusValue='connecting',pendingBuy=false,openContractId=null,reconcileRequired=false,connectDelay=1000,stageStatusTimer=null,serverRetryAfterMs=0,reauthRequired=false;
const $=s=>document.querySelector(s);
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent('izitrader:'+name,{detail}));
function text(key){const lang=localStorage.getItem('izitrader_language')||localStorage.getItem('izitrader_lang')||'pt';const words={
 active:{pt:'Activo',en:'Active',es:'Activo'},
 tradeOpen:{pt:'Trade aberto',en:'Trade open',es:'Operación abierta'},
 tradeClosed:{pt:'Trade fechado — à espera de ticks',en:'Trade closed — waiting for ticks',es:'Operación cerrada — esperando ticks'},
 connected:{pt:'Conta ligada',en:'Account connected',es:'Cuenta conectada'},
 waiting:{pt:'Aguardando ligação à Deriv…',en:'Waiting for Deriv connection…',es:'Esperando conexión a Deriv…'},
 lookup:{pt:'A consultar a sua conta Deriv…',en:'Checking your Deriv account…',es:'Consultando su cuenta Deriv…'},
 opening:{pt:'Conta encontrada. A abrir ligação segura…',en:'Account found. Opening secure connection…',es:'Cuenta encontrada. Abriendo conexión segura…'},
 validating:{pt:'Servidor ligado. A validar a sessão Deriv…',en:'Server connected. Validating Deriv session…',es:'Servidor conectado. Validando sesión Deriv…'},
 connectTimeout:{pt:'A ligação demorou demasiado. A tentar novamente…',en:'Connection timed out. Retrying…',es:'La conexión tardó demasiado. Reintentando…'},
 configureTimeout:{pt:'A Deriv ainda não confirmou a sessão. A tentar novamente…',en:'Deriv has not confirmed the session yet. Retrying…',es:'Deriv aún no confirmó la sesión. Reintentando…'},
 start:{pt:'▶ Iniciar Robô',en:'▶ Start Robot',es:'▶ Iniciar Robot'},
 stop:{pt:'■ Parar Robô',en:'■ Stop Robot',es:'■ Detener Robot'}
};return words[key]?.[lang]||words[key]?.pt||key}
function setStatus(message,ok){
 const el=$('#statusText'),dot=$('.status .dot');
 if(el)el.textContent=message||'';
 if(dot)dot.style.background=ok?'#35d492':'#f5a623';
}
function paintButton(){
 const button=$('#operateBtn');
 if(!button)return;
 button.disabled=reauthRequired||!connected||pendingBuy||Boolean(openContractId)||reconcileRequired||statusValue==='recovery';
 button.dataset.running=active?'1':'0';
 button.textContent=active?text('stop'):text('start');
}
function updatePnl(value){
 pnl=Number(value)||0;
 const el=$('#pnl');
 if(el){el.textContent=(pnl>=0?'+':'-')+'$'+Math.abs(pnl).toFixed(2);el.style.color=pnl<0?'var(--red)':pnl>0?'#3b82f6':'var(--text)'}
}
function updateBalance(value,currency='USD'){
 balance=Number(value);
 const el=$('#balance');
 if(el&&Number.isFinite(balance))el.textContent=(currency==='USD'?'$':currency+' ')+balance.toFixed(2);
}
function updateStake(value){
 stake=Number(value)||baseStake;
 const input=$('#stakeInput');
 if(input&&document.activeElement!==input)input.value=stake.toFixed(2);
 const info=$('#martingaleInfo');
 if(info)info.textContent='Martingale '+level+'/20 · próxima aposta $'+stake.toFixed(2);
}
function configureButton(){
 const row=$('.stake-row');
 if(!row)return;
 let input=$('#stakeInput');
 if(!input){
  const value=row.querySelector('.stake-value');
  input=document.createElement('input');input.id='stakeInput';input.type='number';input.min='.35';input.step='.01';input.inputMode='decimal';input.value=baseStake.toFixed(2);
  input.style.cssText='width:110px;background:var(--field);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:22px;font-weight:800;text-align:right;padding:5px 8px;outline:none';
  if(value)value.replaceWith(input);else row.appendChild(input);
 }
 input.onchange=()=>{
  let value=Number(input.value);if(!Number.isFinite(value)||value<.35)value=.35;
  baseStake=Number(value.toFixed(2));localStorage.setItem('izitrader_stake',String(baseStake));updateStake(baseStake);
  send({type:'stake',baseStake});
 };
 updateStake(baseStake);
}
function send(message){
 if(!socket||socket.readyState!==NativeWS.OPEN)return false;
 try{socket.send(JSON.stringify(message));return true}catch{return false}
}
async function getAccount(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),15000);
 let response;
 try{
  response=await fetch('/api/deriv/accounts',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
 }catch(error){
  if(error&&error.name==='AbortError')throw new Error('A consulta à Deriv demorou demasiado. Verifique a ligação e tente novamente.');
  throw new Error('Não foi possível contactar o servidor do Izitrader.');
 }finally{clearTimeout(timeout)}
 const data=await response.json().catch(()=>({}));
 if(!response.ok){
  const error=new Error(data.error||'Não foi possível consultar as contas Deriv.');
  error.code=data.code||'DERIV_REQUEST_FAILED';
  const headerDelay=Number(response.headers.get('Retry-After')||0);
  const bodyDelay=Number(data.retryAfterSeconds||0);
  error.retryAfterMs=Math.max(headerDelay,bodyDelay)*1000;
  if(response.status===503||data.code==='DERIV_UPSTREAM_BUSY')error.retryAfterMs=Math.max(error.retryAfterMs,30000);
  if(response.status===401||data.code==='DERIV_TOKEN_EXPIRED')error.code='DERIV_TOKEN_EXPIRED';
  throw error;
 }
 try{sessionStorage.removeItem('izi_deriv_reauth_attempted')}catch{}
 const accounts=Array.isArray(data.accounts)?data.accounts:[];
 const isReal=a=>String(a.account_type||'').toLowerCase()==='real'||a.is_virtual===false||/^CR/i.test(String(a.account_id||''));
 const isDemo=a=>String(a.account_type||'').toLowerCase()==='demo'||a.is_virtual===true||/^VR/i.test(String(a.account_id||''));
 const account=accountType==='real'?accounts.find(isReal):accounts.find(isDemo);
 if(!account)throw new Error('Conta '+(accountType==='real'?'Real':'Demo')+' não encontrada.');
 return account;
}
function configPayload(accountId){
 return {type:'configure',accountId,accountType,workerId,uiSymbol,symbol:SYMBOLS[uiSymbol],bot,baseStake,
  profitTarget:Math.max(0,Number(localStorage.getItem('izitrader_profit_goal')||0)),
  lossLimit:Math.max(0,Number(localStorage.getItem('izitrader_loss_goal')||0))};
}
async function connect(){
 if(stopped||connecting||socket)return;
 connecting=true;setStatus(text('lookup'),false);
 try{
  const account=await getAccount();
  if(stopped)return;
  const accountId=String(account.account_id||'');
  const accountBalance=Number(account.balance);
  if(Number.isFinite(accountBalance))updateBalance(accountBalance,String(account.currency||'USD'));
  setStatus(text('opening'),false);
  const scheme=location.protocol==='https:'?'wss':'ws';
  const ws=new NativeWS(scheme+'://'+location.host+'/api/trading/ws');
  socket=ws;
  handshakeTimer=setTimeout(()=>{
   if(socket===ws&&ws.readyState===NativeWS.CONNECTING){
    setStatus(text('connectTimeout'),false);
    try{ws.close(4000,'WebSocket handshake timeout')}catch{}
   }
  },15000);
  ws.onopen=()=>{
   if(socket!==ws)return;
   if(handshakeTimer){clearTimeout(handshakeTimer);handshakeTimer=null}
   connected=true;configured=false;connectDelay=1000;
   setStatus(text('validating'),false);
   configurationTimer=setTimeout(()=>{
    if(socket===ws&&!configured){
     setStatus(text('configureTimeout'),false);
     try{ws.close(4000,'Deriv configuration timeout')}catch{}
    }
   },40000);
   if(!send(configPayload(accountId))){
    setStatus('Não foi possível enviar a configuração ao servidor.',false);
    try{ws.close(4000,'Configuration send failed')}catch{}
    return;
   }
   pingTimer=setInterval(()=>send({type:'ping'}),20000);
  };
  ws.onmessage=event=>{
   let message;try{message=JSON.parse(event.data)}catch{return}
   handleMessage(message);
  };
  ws.onerror=()=>{setStatus('Erro na ligação segura ao servidor.',false)};
  ws.onclose=(event)=>{
   if(socket!==ws)return;
   socket=null;connected=false;configured=false;connecting=false;active=false;
   if(handshakeTimer){clearTimeout(handshakeTimer);handshakeTimer=null}
   if(configurationTimer){clearTimeout(configurationTimer);configurationTimer=null}
   if(pingTimer){clearInterval(pingTimer);pingTimer=null}
   paintButton();
   if(!stopped && event.code!==1008){
    setStatus('Ligação interrompida. A tentar recuperar…',false);
    const delay=Math.max(connectDelay,Math.min(serverRetryAfterMs,120000));serverRetryAfterMs=0;
    connectDelay=Math.min(connectDelay*2,10000);
    reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect()},delay);
   }
  };
  connecting=false;
 }catch(error){
  connecting=false;socket=null;connected=false;
  if(error&&error.code==='DERIV_TOKEN_EXPIRED'){
   reauthRequired=true;
   setStatus('Sessão Deriv expirada. A iniciar nova autenticação…',false);
   paintButton();
   try{
    if(sessionStorage.getItem('izi_deriv_reauth_attempted')!=='1'){
     sessionStorage.setItem('izi_deriv_reauth_attempted','1');
     window.location.assign('/api/auth/login');
     return;
    }
   }catch{}
   setStatus('Sessão Deriv expirada. Termine sessão e volte a ligar a conta.',false);
   return;
  }
  setStatus(error instanceof Error?error.message:'Falha ao ligar ao servidor.',false);
  if(!stopped){
   const serverDelay=Number(error&&error.retryAfterMs)||0;
   const delay=Math.max(connectDelay,Math.min(serverDelay,120000));
   connectDelay=Math.min(Math.max(connectDelay*2,1000),60000);
   reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect()},delay);
  }
 }
}
function loadSessionHistory(trades){
 const row=$('#historyRow')||$('#historyScroll');
 if(!row)return;
 row.innerHTML='';
 const list=Array.isArray(trades)?trades:[];
 list.slice(0,20).forEach(trade=>{
  const id=String(trade.contract_id||'');if(!id)return;
  const profit=Number(trade.profit_loss);if(!Number.isFinite(profit))return;
  const won=String(trade.result||'').toUpperCase()==='WON'||profit>=0;
  const item=document.createElement('div');item.className='chip '+(won?'win':'loss');
  item.dataset.contractId=id;item.dataset.closed='1';item.dataset.dashboardCounted='1';
  const amount=(won?'+':'-')+'
 const data=message.state||{};
 if(message.type==='configured'||message.type==='state'){
  configured=true;connected=true;
  if(configurationTimer){clearTimeout(configurationTimer);configurationTimer=null}
  active=Boolean(data.active);statusValue=String(data.status||'stopped');
  pendingBuy=Boolean(data.pendingBuy);openContractId=data.openContractId||null;reconcileRequired=statusValue==='reconcile_required';
  if(Number.isFinite(Number(data.balance)))updateBalance(data.balance,data.currency);
  if(data.pnl!==undefined)updatePnl(data.pnl);
  if(data.baseStake!==undefined)baseStake=Number(data.baseStake);
  if(data.stake!==undefined)updateStake(data.stake);
  level=Number(data.martingaleLevel||0);
  setStatus(message.message|| (statusValue==='recovery'?'A recuperar contrato aberto.':text('connected')),statusValue==='stopped'||statusValue==='running');
  paintButton();emit('ws-open',{accountType,symbol:SYMBOLS[uiSymbol],uiSymbol});return;
 }
 if(message.type==='status'){
  if(data.status)statusValue=data.status;
  reconcileRequired=statusValue==='reconcile_required';
  if(data.active!==undefined)active=Boolean(data.active);
  if(data.pendingBuy!==undefined)pendingBuy=Boolean(data.pendingBuy);
  if(data.openContractId!==undefined)openContractId=data.openContractId;
  paintButton();if(!stageStatusTimer)setStatus(active&&!openContractId&&!pendingBuy?text('active'):(message.message||''),Boolean(message.ok));return;
 }
 if(message.type==='robot_started'){
  if(stageStatusTimer){clearTimeout(stageStatusTimer);stageStatusTimer=null}
  active=true;statusValue='running';reconcileRequired=false;pendingBuy=false;openContractId=null;updatePnl(0);level=0;updateStake(baseStake);
  paintButton();setStatus(text('active'),true);return;
 }
 if(message.type==='tick'){
  const digit=message.digit;
  const last=$('#lastDigit');if(last)last.textContent=Number.isInteger(digit)?String(digit):'–';
  emit('tick',{quote:message.quote,quoteRaw:message.quoteRaw,epoch:message.epoch,symbol:message.symbol,pip_size:message.pip_size});
  emit('live-digit',{digit,quote:message.quote,epoch:message.epoch});return;
 }
 if(message.type==='balance'){updateBalance(message.balance,message.currency);emit('balance',message);return}
 if(message.type==='buy_pending'){
  pendingBuy=true;statusValue='buy_pending';setStatus(text('tradeOpen'),false);paintButton();return;
 }
 if(message.type==='buy'){
  pendingBuy=false;openContractId=message.contract_id;statusValue='contract_open';
  emit('buy',message);emit('contract-state',{closed:false,contract:message});
  if(stageStatusTimer){clearTimeout(stageStatusTimer);stageStatusTimer=null}
  setStatus(text('tradeOpen'),true);paintButton();return;
 }
 if(message.type==='contract_state'){
  if(message.closed){openContractId=null;pendingBuy=false;statusValue='running';paintButton()}
  return;
 }
 if(message.type==='contract_closed'){
  openContractId=null;pendingBuy=false;updatePnl(Number(message.profit_loss||0)+pnl);
  emit('contract-closed',message);emit('contract-state',{closed:true,contract_id:message.contract_id});
  if(stageStatusTimer)clearTimeout(stageStatusTimer);
  setStatus(text('tradeClosed'),true);
  stageStatusTimer=setTimeout(()=>{stageStatusTimer=null;if(active&&!openContractId&&!pendingBuy)setStatus(text('active'),true)},3000);
  if(Number(message.profit_loss)>0){try{window.dispatchEvent(new CustomEvent('izitrader:celebrate-win'))}catch{}}
  statusValue='running';paintButton();return;
 }
 if(message.type==='pnl'){updatePnl(message.pnl);return}
 if(message.type==='martingale'){
  level=Number(message.level||0);updateStake(message.stake);emit('martingale',message);return;
 }
 if(message.type==='deriv_error'||message.type==='error'){
  pendingBuy=Boolean(data.pendingBuy);openContractId=data.openContractId||openContractId;
  serverRetryAfterMs=Math.max(serverRetryAfterMs,Number(message.retryAfterMs)||0);
  if(message.code==='DERIV_TOKEN_EXPIRED'){
   reauthRequired=true;
   setStatus('Sessão Deriv expirada. Volte a ligar a conta para continuar.',false);
  }else if(message.message)setStatus(message.message,false);
  paintButton();emit('deriv-error',{message:message.message||'Erro de execução',code:message.code});return;
 }
 if(message.type==='reconciliation_required'){
  reconcileRequired=true;pendingBuy=true;statusValue='reconcile_required';
  setStatus(message.message||'É necessária verificação manual da carteira Deriv.',false);paintButton();return;
 }
 if(message.type==='portfolio_check'){
  const rows=Array.isArray(message.contracts)?message.contracts:[];
  const summary=rows.length?rows.map(c=>'#'+c.contract_id+' '+(c.symbol||'')+' '+(c.status||'')).join('\n'):'Não foram devolvidos contratos abertos.';
  setStatus('Verificação necessária. Contratos encontrados:\n'+summary,false);
  return;
 }
}
function startStop(){
 if(active){send({type:'pause'});active=false;statusValue=openContractId?'contract_open':'stopped';paintButton();return}
 if(reconcileRequired){
  const ok=window.confirm('A última compra ficou sem confirmação. Abra a Deriv e verifique as posições abertas. Só escolha OK depois de confirmar que não existe uma operação pendente desta sessão.');
  if(ok){send({type:'confirm_no_pending'});setStatus('A confirmar a verificação da carteira no servidor…',false)}
  return;
 }
 if(openContractId||pendingBuy||statusValue==='recovery'||statusValue==='buy_pending'||statusValue==='contract_open'){
  setStatus('Aguarde a operação actual terminar ou ser reconciliada.',false);return;
 }
 if(!connected||!configured){connect();setStatus(text('waiting'),false);return}
 const input=$('#stakeInput');if(input){const value=Number(input.value);if(Number.isFinite(value)&&value>=.35)baseStake=Number(value.toFixed(2))}
 send({type:'start',baseStake,
  profitTarget:Math.max(0,Number(localStorage.getItem('izitrader_profit_goal')||0)),
  lossLimit:Math.max(0,Number(localStorage.getItem('izitrader_loss_goal')||0))});
}
function restartConnection(){
 if(active||pendingBuy||openContractId){setStatus('Termine a operação actual antes de mudar de conta ou símbolo.',false);return}
 if(handshakeTimer){clearTimeout(handshakeTimer);handshakeTimer=null}
 if(configurationTimer){clearTimeout(configurationTimer);configurationTimer=null}
 if(socket){const old=socket;socket=null;try{old.close(1000,'Reconfigure')}catch{}}
 connected=false;configured=false;connecting=false;
 setTimeout(()=>connect(),800);
}
function boot(){
 configureButton();
 const button=$('#operateBtn');if(button&&!button.dataset.iziServerBound){button.dataset.iziServerBound='1';button.addEventListener('click',startStop);button.disabled=true}
 const account=$('#iziAccountSelect');
 if(account){account.value=accountType;account.addEventListener('change',()=>{
  if(active||pendingBuy||openContractId){account.value=accountType;setStatus('Aguarde a operação actual terminar antes de mudar de conta.',false);return}
  accountType=account.value==='demo'?'demo':'real';localStorage.setItem('izitrader_account_type',accountType);restartConnection();
 })}
 const stop=$('#stageStopBtn');if(stop&&!stop.dataset.iziServerBound){stop.dataset.iziServerBound='1';stop.addEventListener('click',()=>{send({type:'pause'});active=false;paintButton()})}
 connect();
}
window.IziDerivWS={
 stop:()=>{stopped=true;active=false;if(reconnectTimer)clearTimeout(reconnectTimer);if(pingTimer)clearInterval(pingTimer);if(handshakeTimer){clearTimeout(handshakeTimer);handshakeTimer=null}if(configurationTimer){clearTimeout(configurationTimer);configurationTimer=null}if(socket){const old=socket;socket=null;try{old.close(1000,'Logout')}catch{}}connected=false;configured=false;paintButton()},
 pause:()=>{send({type:'pause'});active=false;paintButton()},
 start:startStop,
 getState:()=>({active,connected,authorized:configured,accountType,symbol:SYMBOLS[uiSymbol],stake,martingaleLevel:level,balance,buyOutcomeUnknown:reconcileRequired})
};
window.addEventListener('izitrader:bot-change',e=>{
 const name=String(e?.detail?.name||'').trim();if(!['ProParity','Octawin'].includes(name))return;
 bot=name;localStorage.setItem('izitrader_bot',bot);send({type:'bot',bot});
});
window.addEventListener('izitrader:symbol-change',e=>{
 const next=String(e?.detail?.symbol||'');if(!SYMBOLS[next]||next===uiSymbol)return;
 if(active||pendingBuy||openContractId){localStorage.setItem('izitrader_symbol',uiSymbol);setStatus('Aguarde a operação actual terminar antes de mudar de símbolo.',false);return}
 uiSymbol=next;localStorage.setItem('izitrader_symbol',uiSymbol);
 const label=$('#selectedSymbol');if(label)label.textContent=LABELS[uiSymbol]||uiSymbol;
 send({type:'symbol',uiSymbol});restartConnection();
});
window.addEventListener('izitrader:stake-change',e=>{
 const value=Number(e?.detail?.stake);if(!Number.isFinite(value)||value<.35)return;
 baseStake=Number(value.toFixed(2));localStorage.setItem('izitrader_stake',String(baseStake));send({type:'stake',baseStake});
});
window.addEventListener('izitrader:language-change',()=>{
 const button=$('#operateBtn');if(button)button.textContent=active?text('stop'):text('start');
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* ===== Histórico diário de LUCRO/PERDA — isolado ===== */
(function(){
'use strict';
const KEY='izitrader_daily_pnl',botByContract=Object.create(null),botNames=['ProParity','Octawin'];
const text={pt:{title:'HISTÓRICO DIÁRIO',total:'Total',empty:'Nenhuma operação neste dia.',today:'Hoje',close:'Fechar',aria:'Abrir histórico diário'},en:{title:'DAILY HISTORY',total:'Total',empty:'No trades on this day.',today:'Today',close:'Close',aria:'Open daily history'},es:{title:'HISTORIAL DIARIO',total:'Total',empty:'No hay operaciones en este día.',today:'Hoy',close:'Cerrar',aria:'Abrir historial diario'}};
const $=s=>document.querySelector(s),lang=()=>localStorage.getItem('izitrader_language')||localStorage.getItem('izitrader_lang')||'pt',tr=()=>text[lang()]||text.pt,day=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}},save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}},money=n=>{const v=Number(n)||0;return(v>=0?'+':'-')+'$'+Math.abs(v).toFixed(2)};
function init(){
 const pnl=$('#pnl');if(!pnl)return;
 const wrap=pnl.parentElement; if(!wrap)return;
 let btn=$('#pnlDropdownBtn'),menu=$('#pnlHistoryMenu');
 if(!btn){
   const label=wrap.querySelector('.label');if(!label)return;
   btn=document.createElement('button');btn.id='pnlDropdownBtn';btn.type='button';btn.className='pnl-refresh-icon';btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8.2 8.2 0 0 0-14.1-5.7L4 7.2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 3.5v3.7h3.7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8.1v4.1l2.8 1.9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 13a8.2 8.2 0 0 0 14.1 5.7L20 16.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';btn.setAttribute('aria-expanded','false');
   label.appendChild(btn);
 }
 btn.setAttribute('aria-controls','pnlHistoryMenu');
 if(!menu){
   menu=document.createElement('div');menu.id='pnlHistoryMenu';menu.hidden=true;
   menu.style.cssText='position:absolute;z-index:1000;top:100%;right:0;margin-top:8px;width:min(290px,calc(100vw - 36px));background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 30px rgba(16,24,40,.16);padding:12px';
   menu.innerHTML='<div id="pnlHistoryHead" style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:10px"></div><div style="display:flex;gap:6px"><input id="pnlHistoryDate" type="date" style="min-width:0;flex:1;border:1px solid var(--border);border-radius:8px;background:var(--field);color:var(--text);padding:7px 8px;font-size:11px"><button id="pnlHistoryAll" type="button" style="border:1px solid var(--border);border-radius:8px;background:var(--field);color:var(--text);padding:7px 9px;font-size:11px;font-weight:700;cursor:pointer"></button></div><div id="pnlHistoryTotal" style="margin:10px 0 8px;font-size:12px;font-weight:800"></div><div id="pnlHistoryBots"></div>';
   wrap.style.position='relative';wrap.appendChild(menu);
 }
 if(btn.dataset.pnlReady==='1')return;btn.dataset.pnlReady='1';
 const date=menu.querySelector('#pnlHistoryDate');date.value=day();
 function render(){
   const t=tr(),d=(load()[date.value]||{total:0,bots:{}}),head=menu.querySelector('#pnlHistoryHead'),all=menu.querySelector('#pnlHistoryAll'),total=menu.querySelector('#pnlHistoryTotal'),box=menu.querySelector('#pnlHistoryBots');
   head.innerHTML='<strong>'+t.title+'</strong><button id="pnlHistoryClose" type="button" style="border:0;background:transparent;color:var(--muted);font-size:18px;cursor:pointer" aria-label="'+t.close+'">×</button>';
   all.textContent=t.today;total.textContent=t.total+': '+money(d.total);box.innerHTML='';
   const names=botNames.filter(n=>Number(d.bots?.[n]||0)!==0);
   if(!names.length){box.innerHTML='<div style="font-size:11px;color:var(--muted);padding:8px 0">'+t.empty+'</div>'}
   names.forEach(n=>{const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid var(--border);font-size:11px';row.innerHTML='<span>'+n+'</span><b style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'+money(d.bots[n])+'</b>';box.appendChild(row)});
   const closeBtn=menu.querySelector('#pnlHistoryClose');
   if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();e.stopPropagation();menu.hidden=true;btn.setAttribute('aria-expanded','false')};
 }
 btn.onclick=e=>{e.preventDefault();e.stopPropagation();const open=menu.hidden;menu.hidden=!open;btn.setAttribute('aria-expanded',String(open));if(open)render()};
 document.addEventListener('click',e=>{if(!wrap.contains(e.target)){menu.hidden=true;btn.setAttribute('aria-expanded','false')}},{passive:true});
 menu.querySelector('#pnlHistoryAll').onclick=e=>{e.preventDefault();e.stopPropagation();date.value=day();render()};
 date.onchange=render;
 window.addEventListener('izitrader:buy',e=>{const c=e.detail||{},id=String(c.contract_id||'');if(id)botByContract[id]=localStorage.getItem('izitrader_bot')||'ProParity'});
 window.addEventListener('izitrader:contract-closed',e=>{const c=e.detail||{},p=Number(c.profit_loss??c.profit);if(!Number.isFinite(p))return;const id=String(c.contract_id||''),bot=String(botByContract[id]||c.bot_name||c.bot||localStorage.getItem('izitrader_bot')||'Desconhecido'),k=day(),data=load(),d=data[k]||(data[k]={total:0,bots:{}});d.total=Number(d.total||0)+p;d.bots[bot]=Number(d.bots[bot]||0)+p;save(data);if(date.value===k&&!menu.hidden)render();if(id)delete botByContract[id]});
 window.addEventListener('izitrader:language-change',()=>{btn.setAttribute('aria-label',tr().aria);if(!menu.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();+Math.abs(profit).toFixed(2);
  const digit=Number.isInteger(Number(trade.last_digit))?'<span class="chip-digit">NR '+Number(trade.last_digit)+'</span>':'';
  item.innerHTML='<span><span class="chip-amount">'+amount+'</span>'+digit+'</span><span class="chip-tag">'+(won?'GANHO':'PERDA')+'</span>';
  row.appendChild(item);
 });
 const count=row.querySelectorAll('.chip[data-closed="1"]').length;
 const counter=$('#opsCount');if(counter)counter.textContent=String(count);
 try{sessionStorage.setItem('izitrader_operations',String(count))}catch{}
 row.scrollLeft=0;
 emit('history-load',{count,trades:list});
}
function handleMessage(message){
 const data=message.state||{};
 if(message.type==='session_history'){loadSessionHistory(message.trades);return;}
 if(message.type==='configured'||message.type==='state'){
  configured=true;connected=true;
  if(configurationTimer){clearTimeout(configurationTimer);configurationTimer=null}
  active=Boolean(data.active);statusValue=String(data.status||'stopped');
  pendingBuy=Boolean(data.pendingBuy);openContractId=data.openContractId||null;reconcileRequired=statusValue==='reconcile_required';
  if(Number.isFinite(Number(data.balance)))updateBalance(data.balance,data.currency);
  if(data.pnl!==undefined)updatePnl(data.pnl);
  if(data.baseStake!==undefined)baseStake=Number(data.baseStake);
  if(data.stake!==undefined)updateStake(data.stake);
  level=Number(data.martingaleLevel||0);
  setStatus(message.message|| (statusValue==='recovery'?'A recuperar contrato aberto.':text('connected')),statusValue==='stopped'||statusValue==='running');
  paintButton();emit('ws-open',{accountType,symbol:SYMBOLS[uiSymbol],uiSymbol});return;
 }
 if(message.type==='status'){
  if(data.status)statusValue=data.status;
  reconcileRequired=statusValue==='reconcile_required';
  if(data.active!==undefined)active=Boolean(data.active);
  if(data.pendingBuy!==undefined)pendingBuy=Boolean(data.pendingBuy);
  if(data.openContractId!==undefined)openContractId=data.openContractId;
  paintButton();if(!stageStatusTimer)setStatus(active&&!openContractId&&!pendingBuy?text('active'):(message.message||''),Boolean(message.ok));return;
 }
 if(message.type==='robot_started'){
  if(stageStatusTimer){clearTimeout(stageStatusTimer);stageStatusTimer=null}
  active=true;statusValue='running';reconcileRequired=false;pendingBuy=false;openContractId=null;updatePnl(0);level=0;updateStake(baseStake);
  paintButton();setStatus(text('active'),true);return;
 }
 if(message.type==='tick'){
  const digit=message.digit;
  const last=$('#lastDigit');if(last)last.textContent=Number.isInteger(digit)?String(digit):'–';
  emit('tick',{quote:message.quote,quoteRaw:message.quoteRaw,epoch:message.epoch,symbol:message.symbol,pip_size:message.pip_size});
  emit('live-digit',{digit,quote:message.quote,epoch:message.epoch});return;
 }
 if(message.type==='balance'){updateBalance(message.balance,message.currency);emit('balance',message);return}
 if(message.type==='buy_pending'){
  pendingBuy=true;statusValue='buy_pending';setStatus(text('tradeOpen'),false);paintButton();return;
 }
 if(message.type==='buy'){
  pendingBuy=false;openContractId=message.contract_id;statusValue='contract_open';
  emit('buy',message);emit('contract-state',{closed:false,contract:message});
  if(stageStatusTimer){clearTimeout(stageStatusTimer);stageStatusTimer=null}
  setStatus(text('tradeOpen'),true);paintButton();return;
 }
 if(message.type==='contract_state'){
  if(message.closed){openContractId=null;pendingBuy=false;statusValue='running';paintButton()}
  return;
 }
 if(message.type==='contract_closed'){
  openContractId=null;pendingBuy=false;updatePnl(Number(message.profit_loss||0)+pnl);
  emit('contract-closed',message);emit('contract-state',{closed:true,contract_id:message.contract_id});
  if(stageStatusTimer)clearTimeout(stageStatusTimer);
  setStatus(text('tradeClosed'),true);
  stageStatusTimer=setTimeout(()=>{stageStatusTimer=null;if(active&&!openContractId&&!pendingBuy)setStatus(text('active'),true)},3000);
  if(Number(message.profit_loss)>0){try{window.dispatchEvent(new CustomEvent('izitrader:celebrate-win'))}catch{}}
  statusValue='running';paintButton();return;
 }
 if(message.type==='pnl'){updatePnl(message.pnl);return}
 if(message.type==='martingale'){
  level=Number(message.level||0);updateStake(message.stake);emit('martingale',message);return;
 }
 if(message.type==='deriv_error'||message.type==='error'){
  pendingBuy=Boolean(data.pendingBuy);openContractId=data.openContractId||openContractId;
  serverRetryAfterMs=Math.max(serverRetryAfterMs,Number(message.retryAfterMs)||0);
  if(message.code==='DERIV_TOKEN_EXPIRED'){
   reauthRequired=true;
   setStatus('Sessão Deriv expirada. Volte a ligar a conta para continuar.',false);
  }else if(message.message)setStatus(message.message,false);
  paintButton();emit('deriv-error',{message:message.message||'Erro de execução',code:message.code});return;
 }
 if(message.type==='reconciliation_required'){
  reconcileRequired=true;pendingBuy=true;statusValue='reconcile_required';
  setStatus(message.message||'É necessária verificação manual da carteira Deriv.',false);paintButton();return;
 }
 if(message.type==='portfolio_check'){
  const rows=Array.isArray(message.contracts)?message.contracts:[];
  const summary=rows.length?rows.map(c=>'#'+c.contract_id+' '+(c.symbol||'')+' '+(c.status||'')).join('\n'):'Não foram devolvidos contratos abertos.';
  setStatus('Verificação necessária. Contratos encontrados:\n'+summary,false);
  return;
 }
}
function startStop(){
 if(active){send({type:'pause'});active=false;statusValue=openContractId?'contract_open':'stopped';paintButton();return}
 if(reconcileRequired){
  const ok=window.confirm('A última compra ficou sem confirmação. Abra a Deriv e verifique as posições abertas. Só escolha OK depois de confirmar que não existe uma operação pendente desta sessão.');
  if(ok){send({type:'confirm_no_pending'});setStatus('A confirmar a verificação da carteira no servidor…',false)}
  return;
 }
 if(openContractId||pendingBuy||statusValue==='recovery'||statusValue==='buy_pending'||statusValue==='contract_open'){
  setStatus('Aguarde a operação actual terminar ou ser reconciliada.',false);return;
 }
 if(!connected||!configured){connect();setStatus(text('waiting'),false);return}
 const input=$('#stakeInput');if(input){const value=Number(input.value);if(Number.isFinite(value)&&value>=.35)baseStake=Number(value.toFixed(2))}
 send({type:'start',baseStake,
  profitTarget:Math.max(0,Number(localStorage.getItem('izitrader_profit_goal')||0)),
  lossLimit:Math.max(0,Number(localStorage.getItem('izitrader_loss_goal')||0))});
}
function restartConnection(){
 if(active||pendingBuy||openContractId){setStatus('Termine a operação actual antes de mudar de conta ou símbolo.',false);return}
 if(handshakeTimer){clearTimeout(handshakeTimer);handshakeTimer=null}
 if(configurationTimer){clearTimeout(configurationTimer);configurationTimer=null}
 if(socket){const old=socket;socket=null;try{old.close(1000,'Reconfigure')}catch{}}
 connected=false;configured=false;connecting=false;
 setTimeout(()=>connect(),800);
}
function boot(){
 configureButton();
 const button=$('#operateBtn');if(button&&!button.dataset.iziServerBound){button.dataset.iziServerBound='1';button.addEventListener('click',startStop);button.disabled=true}
 const account=$('#iziAccountSelect');
 if(account){account.value=accountType;account.addEventListener('change',()=>{
  if(active||pendingBuy||openContractId){account.value=accountType;setStatus('Aguarde a operação actual terminar antes de mudar de conta.',false);return}
  accountType=account.value==='demo'?'demo':'real';localStorage.setItem('izitrader_account_type',accountType);restartConnection();
 })}
 const stop=$('#stageStopBtn');if(stop&&!stop.dataset.iziServerBound){stop.dataset.iziServerBound='1';stop.addEventListener('click',()=>{send({type:'pause'});active=false;paintButton()})}
 connect();
}
window.IziDerivWS={
 stop:()=>{stopped=true;active=false;if(reconnectTimer)clearTimeout(reconnectTimer);if(pingTimer)clearInterval(pingTimer);if(handshakeTimer){clearTimeout(handshakeTimer);handshakeTimer=null}if(configurationTimer){clearTimeout(configurationTimer);configurationTimer=null}if(socket){const old=socket;socket=null;try{old.close(1000,'Logout')}catch{}}connected=false;configured=false;paintButton()},
 pause:()=>{send({type:'pause'});active=false;paintButton()},
 start:startStop,
 getState:()=>({active,connected,authorized:configured,accountType,symbol:SYMBOLS[uiSymbol],stake,martingaleLevel:level,balance,buyOutcomeUnknown:reconcileRequired})
};
window.addEventListener('izitrader:bot-change',e=>{
 const name=String(e?.detail?.name||'').trim();if(!['ProParity','Octawin'].includes(name))return;
 bot=name;localStorage.setItem('izitrader_bot',bot);send({type:'bot',bot});
});
window.addEventListener('izitrader:symbol-change',e=>{
 const next=String(e?.detail?.symbol||'');if(!SYMBOLS[next]||next===uiSymbol)return;
 if(active||pendingBuy||openContractId){localStorage.setItem('izitrader_symbol',uiSymbol);setStatus('Aguarde a operação actual terminar antes de mudar de símbolo.',false);return}
 uiSymbol=next;localStorage.setItem('izitrader_symbol',uiSymbol);
 const label=$('#selectedSymbol');if(label)label.textContent=LABELS[uiSymbol]||uiSymbol;
 send({type:'symbol',uiSymbol});restartConnection();
});
window.addEventListener('izitrader:stake-change',e=>{
 const value=Number(e?.detail?.stake);if(!Number.isFinite(value)||value<.35)return;
 baseStake=Number(value.toFixed(2));localStorage.setItem('izitrader_stake',String(baseStake));send({type:'stake',baseStake});
});
window.addEventListener('izitrader:language-change',()=>{
 const button=$('#operateBtn');if(button)button.textContent=active?text('stop'):text('start');
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* ===== Histórico diário de LUCRO/PERDA — isolado ===== */
(function(){
'use strict';
const KEY='izitrader_daily_pnl',botByContract=Object.create(null),botNames=['ProParity','Octawin'];
const text={pt:{title:'HISTÓRICO DIÁRIO',total:'Total',empty:'Nenhuma operação neste dia.',today:'Hoje',close:'Fechar',aria:'Abrir histórico diário'},en:{title:'DAILY HISTORY',total:'Total',empty:'No trades on this day.',today:'Today',close:'Close',aria:'Open daily history'},es:{title:'HISTORIAL DIARIO',total:'Total',empty:'No hay operaciones en este día.',today:'Hoy',close:'Cerrar',aria:'Abrir historial diario'}};
const $=s=>document.querySelector(s),lang=()=>localStorage.getItem('izitrader_language')||localStorage.getItem('izitrader_lang')||'pt',tr=()=>text[lang()]||text.pt,day=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}},save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}},money=n=>{const v=Number(n)||0;return(v>=0?'+':'-')+'$'+Math.abs(v).toFixed(2)};
function init(){
 const pnl=$('#pnl');if(!pnl)return;
 const wrap=pnl.parentElement; if(!wrap)return;
 let btn=$('#pnlDropdownBtn'),menu=$('#pnlHistoryMenu');
 if(!btn){
   const label=wrap.querySelector('.label');if(!label)return;
   btn=document.createElement('button');btn.id='pnlDropdownBtn';btn.type='button';btn.className='pnl-refresh-icon';btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 11a8.2 8.2 0 0 0-14.1-5.7L4 7.2" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 3.5v3.7h3.7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 8.1v4.1l2.8 1.9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 13a8.2 8.2 0 0 0 14.1 5.7L20 16.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';btn.setAttribute('aria-expanded','false');
   label.appendChild(btn);
 }
 btn.setAttribute('aria-controls','pnlHistoryMenu');
 if(!menu){
   menu=document.createElement('div');menu.id='pnlHistoryMenu';menu.hidden=true;
   menu.style.cssText='position:absolute;z-index:1000;top:100%;right:0;margin-top:8px;width:min(290px,calc(100vw - 36px));background:var(--card);border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 30px rgba(16,24,40,.16);padding:12px';
   menu.innerHTML='<div id="pnlHistoryHead" style="display:flex;align-items:center;justify-content:space-between;font-size:12px;margin-bottom:10px"></div><div style="display:flex;gap:6px"><input id="pnlHistoryDate" type="date" style="min-width:0;flex:1;border:1px solid var(--border);border-radius:8px;background:var(--field);color:var(--text);padding:7px 8px;font-size:11px"><button id="pnlHistoryAll" type="button" style="border:1px solid var(--border);border-radius:8px;background:var(--field);color:var(--text);padding:7px 9px;font-size:11px;font-weight:700;cursor:pointer"></button></div><div id="pnlHistoryTotal" style="margin:10px 0 8px;font-size:12px;font-weight:800"></div><div id="pnlHistoryBots"></div>';
   wrap.style.position='relative';wrap.appendChild(menu);
 }
 if(btn.dataset.pnlReady==='1')return;btn.dataset.pnlReady='1';
 const date=menu.querySelector('#pnlHistoryDate');date.value=day();
 function render(){
   const t=tr(),d=(load()[date.value]||{total:0,bots:{}}),head=menu.querySelector('#pnlHistoryHead'),all=menu.querySelector('#pnlHistoryAll'),total=menu.querySelector('#pnlHistoryTotal'),box=menu.querySelector('#pnlHistoryBots');
   head.innerHTML='<strong>'+t.title+'</strong><button id="pnlHistoryClose" type="button" style="border:0;background:transparent;color:var(--muted);font-size:18px;cursor:pointer" aria-label="'+t.close+'">×</button>';
   all.textContent=t.today;total.textContent=t.total+': '+money(d.total);box.innerHTML='';
   const names=botNames.filter(n=>Number(d.bots?.[n]||0)!==0);
   if(!names.length){box.innerHTML='<div style="font-size:11px;color:var(--muted);padding:8px 0">'+t.empty+'</div>'}
   names.forEach(n=>{const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid var(--border);font-size:11px';row.innerHTML='<span>'+n+'</span><b style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace">'+money(d.bots[n])+'</b>';box.appendChild(row)});
   const closeBtn=menu.querySelector('#pnlHistoryClose');
   if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();e.stopPropagation();menu.hidden=true;btn.setAttribute('aria-expanded','false')};
 }
 btn.onclick=e=>{e.preventDefault();e.stopPropagation();const open=menu.hidden;menu.hidden=!open;btn.setAttribute('aria-expanded',String(open));if(open)render()};
 document.addEventListener('click',e=>{if(!wrap.contains(e.target)){menu.hidden=true;btn.setAttribute('aria-expanded','false')}},{passive:true});
 menu.querySelector('#pnlHistoryAll').onclick=e=>{e.preventDefault();e.stopPropagation();date.value=day();render()};
 date.onchange=render;
 window.addEventListener('izitrader:buy',e=>{const c=e.detail||{},id=String(c.contract_id||'');if(id)botByContract[id]=localStorage.getItem('izitrader_bot')||'ProParity'});
 window.addEventListener('izitrader:contract-closed',e=>{const c=e.detail||{},p=Number(c.profit_loss??c.profit);if(!Number.isFinite(p))return;const id=String(c.contract_id||''),bot=String(botByContract[id]||c.bot_name||c.bot||localStorage.getItem('izitrader_bot')||'Desconhecido'),k=day(),data=load(),d=data[k]||(data[k]={total:0,bots:{}});d.total=Number(d.total||0)+p;d.bots[bot]=Number(d.bots[bot]||0)+p;save(data);if(date.value===k&&!menu.hidden)render();if(id)delete botByContract[id]});
 window.addEventListener('izitrader:language-change',()=>{btn.setAttribute('aria-label',tr().aria);if(!menu.hidden)render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();