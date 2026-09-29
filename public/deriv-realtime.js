/* Izitrader Deriv engine — Matos-style preconnected WebSocket architecture. */
(function(){
'use strict';
const NativeWS=window.__IziNativeWebSocket||window.WebSocket;
const SYMBOLS={V10:'R_10',V15:'1HZ15V',V25:'R_25',V30:'1HZ30V',V50:'R_50',V75:'R_75',V90:'1HZ90V',V100:'R_100',V150:'1HZ150V',V250:'1HZ250V',V10_1S:'1HZ10V',V25_1S:'1HZ25V',V50_1S:'1HZ50V',V75_1S:'1HZ75V',V100_1S:'1HZ100V'};
const CONTRACTS={EVEN:'DIGITEVEN',ODD:'DIGITODD',OVER:'DIGITOVER',UNDER:'DIGITUNDER',RISE:'CALL',FALL:'PUT',DIFFER:'DIGITDIFF',MATCH:'DIGITMATCH'};
let ws=null,reconnectTimer=null,pingTimer=null,stopped=false,reconnectDelay=1000;
const SYMBOL_LABELS={V10:'Volatility 10',V15:'Volatility 15 (1s)',V25:'Volatility 25',V30:'Volatility 30 (1s)',V50:'Volatility 50',V75:'Volatility 75',V90:'Volatility 90 (1s)',V100:'Volatility 100',V150:'Volatility 150 (1s)',V250:'Volatility 250 (1s)',V10_1S:'Volatility 10 (1s)',V25_1S:'Volatility 25 (1s)',V50_1S:'Volatility 50 (1s)',V75_1S:'Volatility 75 (1s)',V100_1S:'Volatility 100 (1s)'};
const LEGACY_SYMBOLS=Object.fromEntries(Object.entries(SYMBOLS).map(([k,v])=>[v,k]));
function normalizeUiSymbol(value){const v=String(value||'V100');return SYMBOLS[v]?v:(LEGACY_SYMBOLS[v]||'V100')}
let accountType=localStorage.getItem('izitrader_account_type')||'real',uiSymbol=normalizeUiSymbol(localStorage.getItem('izitrader_symbol')),symbol=SYMBOLS[uiSymbol],botName=localStorage.getItem('izitrader_bot')||'ProParity';
localStorage.setItem('izitrader_symbol',uiSymbol);
let baseStake=Math.max(.35,Number(localStorage.getItem('izitrader_stake')||.35)),stake=baseStake,martingaleLevel=0;
const MARTINGALE_MAX_LEVEL=20;
let active=false,buying=false,proposal=null,contractId=null,sessionPnl=0,ticks=[],closedIds=new Set(),accountIdValue=null,connected=false,authorized=false;
const $=s=>document.querySelector(s),set=(s,v)=>{const e=$(s);if(e)e.textContent=v},emit=(n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));function positionState(state){emit('izitrader:position-state',{state})}
function idOf(a){return a&&(a.account_id||a.accountId||a.id||a.loginid)}
function isReal(a){const t=String(a?.account_type||a?.type||'').toLowerCase(),id=String(idOf(a)||'');return t==='real'||a?.is_virtual===false||/^CR/i.test(id)}
function isDemo(a){const t=String(a?.account_type||a?.type||'').toLowerCase(),id=String(idOf(a)||'');return t==='demo'||a?.is_virtual===true||/^VR/i.test(id)}
function status(v,ok){const d=$('.status .dot');if(d)d.style.background=ok?'#35d492':'#f5a623';set('#statusText',v)}
function showError(v){const m=String(v||'Erro Deriv');status(m,false);emit('izitrader:deriv-error',{message:m})}
function currentLang(){const l=localStorage.getItem('izitrader_language')||localStorage.getItem('izitrader_lang')||'pt';return ['en','pt','es'].includes(l)?l:'pt'}
function uiText(key){const map={
  active:{pt:'Robô ativo',en:'Active',es:'Activo'},
  targetProfit:{pt:'Meta de lucro atingida — robô parado',en:'Profit target reached — robot stopped',es:'Meta de ganancias alcanzada — robot detenido'},
  targetLoss:{pt:'Meta de perda atingida — robô parado',en:'Loss target reached — robot stopped',es:'Meta de pérdidas alcanzada — robot detenido'},
  waiting:{pt:'Aguardando ligação à Deriv…',en:'Waiting for Deriv connection…',es:'Esperando conexión a Deriv…'},
  connected:{pt:'Conta ligada',en:'Account connected',es:'Cuenta conectada'},
  start:{pt:'▶ Iniciar Robô',en:'▶ Start Robot',es:'▶ Iniciar Robot'},
  stop:{pt:'■ Parar Robô',en:'■ Stop Robot',es:'■ Detener Robot'}
};return map[key]?.[currentLang()]||map[key]?.pt||key}
function send(o){try{return !!(ws&&ws.readyState===NativeWS.OPEN&&ws.send(JSON.stringify(o)))}catch{return false}}
async function getJson(url){const r=await fetch(url,{credentials:'same-origin',cache:'no-store'}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
function getDigit(q,p){const n=Number(q);if(!Number.isFinite(n))return null;const pp=Number.isInteger(Number(p))?Number(p):2;return Number(n.toFixed(Math.max(0,Math.min(10,pp))).slice(-1))}
function getSignal(){if(ticks.length<5)return null;const d=ticks.slice(-5).map(x=>getDigit(x.quote,x.pip_size));if(d.some(x=>x===null))return null;const e=d.filter(x=>x%2===0).length*20,o=100-e,n=String(botName).toUpperCase();if(/OVER|UNDER|ACIMA|BAIXO/.test(n)){const over=d.filter(x=>x>5).length*20,under=d.filter(x=>x<4).length*20;return over>=65?['OVER',over]:under>=65?['UNDER',under]:null}if(/DIFER|DIFF/.test(n)){const x=d.filter(x=>x!==0).length*20;return x>=65?['DIFFER',x]:null}if(/MATCH/.test(n)){const x=d.filter(x=>x===0).length*20;return x>=65?['MATCH',x]:null}return e>=65?['EVEN',e]:o>=65?['ODD',o]:null}
function updateStake(){const input=$('#stakeInput');if(input&&document.activeElement!==input)input.value=Number(stake).toFixed(2);const row=$('.stake-row');if(row){let info=$('#martingaleInfo');if(!info){info=document.createElement('div');info.id='martingaleInfo';info.style.cssText='margin-top:7px;text-align:right;font-size:10px;color:var(--muted)';row.parentElement.insertBefore(info,row.nextSibling)}info.textContent='Martingale '+martingaleLevel+'/'+MARTINGALE_MAX_LEVEL+' · próxima aposta $'+Number(stake).toFixed(2)}}
window.addEventListener('izitrader:stake-change',e=>{const n=Number(e?.detail?.stake);if(!Number.isFinite(n)||n<.35)return;baseStake=Number(n.toFixed(2));if(martingaleLevel===0)stake=baseStake;updateStake();});
function setupStake(){const row=$('.stake-row');if(!row)return;let input=$('#stakeInput');if(!input){const value=row.querySelector('.stake-value');input=document.createElement('input');input.id='stakeInput';input.type='number';input.min='.35';input.step='.01';input.inputMode='decimal';input.value=baseStake.toFixed(2);input.style.cssText='width:110px;background:var(--field);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:22px;font-weight:800;text-align:right;padding:5px 8px;outline:none';if(value)value.replaceWith(input);else row.appendChild(input)}input.onchange=()=>{let n=Number(input.value);if(!Number.isFinite(n)||n<.35)n=.35;baseStake=Number(n.toFixed(2));localStorage.setItem('izitrader_stake',String(baseStake));if(martingaleLevel===0)stake=baseStake;updateStake()};updateStake()}
function applyMartingale(p){const n=Number(p);if(!Number.isFinite(n))return;if(n<0){martingaleLevel=Math.min(MARTINGALE_MAX_LEVEL,martingaleLevel+1);stake=Number((baseStake*Math.pow(2,martingaleLevel)).toFixed(2))}else{martingaleLevel=0;stake=baseStake}updateStake();emit('izitrader:martingale',{level:martingaleLevel,stake,baseStake,profit:n,maxLevel:MARTINGALE_MAX_LEVEL})}
function updatePnlColor(){const el=$('#pnl');if(!el)return;const raw=String(el.textContent||'').trim().replace(/\s+/g,'').replace(',','.');const m=raw.match(/^([+-]?)\$?(-?\d+(?:\.\d{1,2})?)$/);if(!m)return;const n=Number((m[1]||'')+m[2]);el.style.setProperty('color',n<0?'var(--red)':n>0?'#f5c04a':'var(--text)','important')}
function addClosed(c,p){const h=$('#historyRow')||$('#historyScroll'),id=String(c.contract_id||'');if(!h||!id||closedIds.has(id))return false;closedIds.add(id);const win=p>=0,i=document.createElement('div');i.className='chip '+(win?'win':'loss');i.dataset.contractId=id;i.dataset.closed='1';i.innerHTML='<span>'+(win?'+':'-')+'$'+Math.abs(p).toFixed(2)+'</span><span class="chip-tag">'+(win?'GANHO':'PERDA')+'</span>';h.prepend(i);while(h.querySelectorAll('.chip').length>20){const last=h.lastElementChild;if(!last)break;last.remove()}const count=$('#opsCount');if(count)count.textContent=String(h.querySelectorAll('.chip[data-closed="1"]').length);emit('izitrader:contract-closed',{...c,profit_loss:p,profit:p,result:p>=0?'WON':'LOST',accountType});updatePnlColor();return true}
function freshBalance(){send({balance:1,req_id:Date.now()%100000})}
function watch(){if(contractId)send({proposal_open_contract:1,contract_id:contractId,subscribe:1,req_id:Date.now()%100000})}
function getTargets(){
  const profit=Math.max(0,Number(localStorage.getItem('izitrader_profit_goal')||0));
  const loss=Math.max(0,Number(localStorage.getItem('izitrader_loss_goal')||0));
  return {profit:Number.isFinite(profit)?profit:0,loss:Number.isFinite(loss)?loss:0};
}
let celebrationAudio=null;
function prepareCelebrationAudio(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    if(!celebrationAudio)celebrationAudio=new Ctx();
    if(celebrationAudio.state==='suspended')celebrationAudio.resume().catch(()=>{});
  }catch{}
}
function celebrateWin(){
  try{
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(!Ctx)return;
    if(!celebrationAudio)celebrationAudio=new Ctx();
    const ctx=celebrationAudio;
    const play=()=>{
      const now=ctx.currentTime;
      const master=ctx.createGain();
      master.gain.setValueAtTime(0.0001,now);
      master.gain.exponentialRampToValueAtTime(0.62,now+0.03);
      master.gain.exponentialRampToValueAtTime(0.0001,now+1.15);
      master.connect(ctx.destination);
      [523.25,659.25,783.99,1046.5].forEach((freq,i)=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.type='triangle';o.frequency.value=freq;
        g.gain.setValueAtTime(0.0001,now+i*0.11);
        g.gain.exponentialRampToValueAtTime(0.28,now+i*0.11+0.025);
        g.gain.exponentialRampToValueAtTime(0.0001,now+i*0.11+0.30);
        o.connect(g);g.connect(master);o.start(now+i*0.11);o.stop(now+i*0.11+0.32);
      });
    };
    if(ctx.state==='suspended')ctx.resume().then(play).catch(()=>{});else play();
  }catch{}
}
function checkTargets(){
  const t=getTargets();
  if(!active||(!t.profit&&!t.loss))return false;
  const reachedProfit=t.profit>0&&sessionPnl>=t.profit;
  const reachedLoss=t.loss>0&&sessionPnl<=-t.loss;
  if(!reachedProfit&&!reachedLoss)return false;
  active=false;buying=false;proposal=null;
  const reason=reachedProfit?'profit':'loss';
  status(uiText(reachedProfit?'targetProfit':'targetLoss'),true);
  const b=$('.operate-btn');
  if(b){b.disabled=!connected;b.dataset.running='0';b.textContent='✓ '+(reachedProfit?uiText('targetProfit'):uiText('targetLoss'));}
  emit('izitrader:target-reached',{type:reason,target:reachedProfit?t.profit:t.loss,pnl:sessionPnl});
  return true;
}
function requestProposal(sig){if(!active||buying||proposal||contractId)return;const ct=CONTRACTS[sig[0]];if(!ct)return;const reqId=Date.now()%100000,p={proposal:1,amount:stake,basis:'stake',contract_type:ct,currency:'USD',duration:3,duration_unit:'t',underlying_symbol:symbol,req_id:reqId};if(sig[0]==='OVER')p.barrier='5';if(sig[0]==='UNDER')p.barrier='4';if(send(p))proposal={pending:true,req_id:reqId,createdAt:Date.now()}}
function buyProposal(p){const id=p.id||p.proposal_id,price=Number(p.ask_price??p.price);if(!id||!Number.isFinite(price)||price<=0){proposal=null;buying=false;showError('Proposta inválida para BUY');return}buying=true;if(!send({buy:String(id),price,req_id:Date.now()%100000})){buying=false;proposal=null}}
function onMessage(raw){let m;try{m=JSON.parse(raw)}catch{return}if(m.error){const msg=String(m.error.message||'Erro Deriv');if(proposal?.pending&&Number(m.req_id)===Number(proposal.req_id))proposal=null;buying=false;if(/unknown contract proposal|already subscribed/i.test(msg))return;showError(msg);return}
if(m.msg_type==='balance'&&m.balance){const n=Number(m.balance.balance);if(Number.isFinite(n)){set('#balance',(m.balance.currency==='USD'?'$':m.balance.currency+' ')+n.toFixed(2));emit('izitrader:balance',{balance:n,currency:m.balance.currency||'USD',loginid:m.balance.loginid})}return}
if(m.msg_type==='tick'&&m.tick){ticks.push(m.tick);if(ticks.length>1000)ticks.shift();const d=getDigit(m.tick.quote,m.tick.pip_size);set('#lastDigit',d==null?'–':String(d));emit('izitrader:tick',{quote:m.tick.quote,quoteRaw:String(m.tick.quote),epoch:m.tick.epoch,symbol:m.tick.symbol,pip_size:m.tick.pip_size});emit('izitrader:live-digit',{digit:d,quote:m.tick.quote,epoch:m.tick.epoch});if(proposal?.pending&&Date.now()-proposal.createdAt>5000)proposal=null;if(active&&!buying&&!proposal&&!contractId){const s=getSignal();if(s)requestProposal(s)}return}
if(m.msg_type==='proposal'&&m.proposal){const req=Number(m.req_id);if(proposal?.pending&&Number.isFinite(req)&&req!==Number(proposal.req_id))return;proposal={...m.proposal,pending:false,proposalReqId:req,createdAt:Date.now()};if(active&&!buying)buyProposal(m.proposal);return}
if(m.msg_type==='buy'&&m.buy){buying=false;proposal=null;contractId=Number(m.buy.contract_id)||null;positionState('open');emit('izitrader:buy',{...m.buy,accountType,stake,martingaleLevel});if(contractId)watch();return}
if(m.msg_type==='proposal_open_contract'&&m.proposal_open_contract){const c=m.proposal_open_contract;if(!contractId||Number(c.contract_id)!==Number(contractId))return;const sold=c.is_sold===true||c.is_sold===1||String(c.is_sold)==='1'||String(c.is_sold).toLowerCase()==='true',st=String(c.status||'').toLowerCase(),closed=sold||['sold','won','lost','expired','closed'].includes(st);if(closed){const p=Number(c.profit??c.profit_loss);if(Number.isFinite(p)){sessionPnl+=p;set('#pnl',(sessionPnl>=0?'+':'-')+'$'+Math.abs(sessionPnl).toFixed(2));addClosed(c,p);if(p>0)celebrateWin();applyMartingale(p);freshBalance();updatePnlColor();checkTargets()}positionState('closed');contractId=null;proposal=null;buying=false;emit('izitrader:contract-state',{contract:c,closed:true})}}
}
async function connect(){if(stopped||ws)return;status('A ligar à conta '+(accountType==='real'?'Real':'Demo')+'…',false);try{const a=await getJson('/api/deriv/accounts'),list=Array.isArray(a.accounts)?a.accounts:[],acc=accountType==='real'?list.find(isReal):list.find(isDemo);if(!acc)throw new Error('Conta '+(accountType==='real'?'Real':'Demo')+' não encontrada');accountIdValue=idOf(acc);const w=await getJson('/api/deriv/ws-url?account_id='+encodeURIComponent(accountIdValue)),url=w?.data?.url||w?.wsUrl||w?.url;if(!url)throw new Error('URL WebSocket autenticada não recebida');if(stopped)return;ws=new NativeWS(url);ws.onopen=()=>{connected=true;authorized=true;reconnectDelay=1000;status(uiText('connected'),true);setupStake();send({balance:1,subscribe:1,req_id:1});send({ticks:symbol,subscribe:1,req_id:2});if(contractId)watch();const b=$('.operate-btn');if(b){b.disabled=false;b.textContent=active?'■ Stop Robot':'▶ Start Robot'}emit('izitrader:ws-open',{accountType,accountId:accountIdValue,symbol,uiSymbol})};ws.onmessage=e=>onMessage(e.data);ws.onerror=()=>status('Erro na ligação Deriv',false);ws.onclose=()=>{connected=false;authorized=false;clearInterval(pingTimer);pingTimer=null;ws=null;const b=$('.operate-btn');if(b)b.disabled=true;status('Reconectando à Deriv…',false);if(!stopped){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,reconnectDelay);reconnectDelay=Math.min(reconnectDelay*2,10000)}};clearInterval(pingTimer);pingTimer=setInterval(()=>send({ping:1}),30000)}catch(e){ws=null;connected=false;authorized=false;showError(e?.message||'Falha ao ligar à Deriv');if(!stopped){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,reconnectDelay);reconnectDelay=Math.min(reconnectDelay*2,10000)}}}
function resetConnection(){active=false;buying=false;proposal=null;contractId=null;ticks=[];sessionPnl=0;martingaleLevel=0;stake=baseStake;updateStake();if(ws){try{ws.close()}catch{}}ws=null;connected=false;authorized=false;const b=$('.operate-btn');if(b)b.disabled=true;connect()}
function startStop(){if(!connected||!authorized){status(uiText('waiting'),false);return}if(active){active=false;buying=false;proposal=null;positionState('analysis');status('ACCOUNT CONNECTED',true);const b=$('.operate-btn');if(b)b.textContent=uiText('start');return}active=true;prepareCelebrationAudio();positionState('analysis');sessionPnl=0;ticks=[];proposal=null;buying=false;martingaleLevel=0;stake=baseStake;updateStake();status(uiText('active'),true);const b=$('.operate-btn');if(b){b.dataset.running='1';b.textContent=uiText('stop')};emit('izitrader:robot-start',{accountType,symbol,stake})}
function stop(){stopped=true;active=false;clearTimeout(reconnectTimer);clearInterval(pingTimer);if(ws){try{ws.close()}catch{}}ws=null;connected=false;authorized=false}
window.IziDerivWS={stop,start:startStop,getState:()=>({active,connected,authorized,accountType,symbol,stake,martingaleLevel})};
function boot(){const b=$('.operate-btn');if(b&&!b.dataset.iziMatosBound){b.dataset.iziMatosBound='1';b.disabled=true;b.addEventListener('click',startStop)}const sel=$('#iziAccountSelect');if(sel&&!sel.dataset.iziMatosBound){sel.dataset.iziMatosBound='1';sel.addEventListener('change',()=>{accountType=sel.value==='demo'?'demo':'real';localStorage.setItem('izitrader_account_type',accountType);resetConnection()})}document.querySelectorAll('.symbol-item').forEach(item=>item.addEventListener('click',()=>{const s=normalizeUiSymbol(item.getAttribute('data-symbol'));if(!SYMBOLS[s])return;uiSymbol=s;symbol=SYMBOLS[s];localStorage.setItem('izitrader_symbol',s);const label=$('#selectedSymbol');if(label)label.textContent=SYMBOL_LABELS[s]||s;resetConnection()}));const label=$('#selectedSymbol');if(label)label.textContent=SYMBOL_LABELS[uiSymbol]||'Volatility 100';const acc=$('#iziAccountSelect');if(acc)acc.value=accountType;setTimeout(connect,0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('izitrader:bot-change',e=>{
 const name=String(e?.detail?.name||'').trim();
 if(!name)return;
 botName=name;
 try{localStorage.setItem('izitrader_bot',name)}catch{}
 /* Bot changes only change the strategy. They do not reset P/L, history,
    martingale state, open contract or accumulated session results. */
 if(active)status(uiText('active'),true);
});
window.addEventListener('izitrader:language-change',()=>{
 const b=document.getElementById('operateBtn');
 if(b){b.textContent=active?uiText('stop'):uiText('start')}
 const s=document.getElementById('statusText');
 if(s){
   const raw=String(s.textContent||'').trim();
   const keys={'Robô ativo — aguardando sinal':'active','Robot active — waiting for signal':'active','Robot activo — esperando señal':'active','Meta de lucro atingida — robô parado':'targetProfit','Profit target reached — robot stopped':'targetProfit','Meta de ganancias alcanzada — robot detenido':'targetProfit','Meta de perda atingida — robô parado':'targetLoss','Loss target reached — robot stopped':'targetLoss','Meta de pérdidas alcanzada — robot detenido':'targetLoss','Aguardando ligação à Deriv…':'waiting','Waiting for Deriv connection…':'waiting','Esperando conexión a Deriv…':'waiting','Conta ligada':'connected','Account connected':'connected','Cuenta conectada':'connected'};
   const key=keys[raw];if(key)s.textContent=uiText(key);
 }
});
window.addEventListener('izitrader:symbol-change',e=>{const s=e?.detail?.symbol;if(!s||!SYMBOLS[s]||s===uiSymbol)return;uiSymbol=s;symbol=SYMBOLS[s];localStorage.setItem('izitrader_symbol',s);resetConnection()});
})();

/* ===== Histórico diário de LUCRO/PERDA — isolado ===== */
(function(){
'use strict';
const KEY='izitrader_daily_pnl',botByContract=Object.create(null),botNames=['ProParity','Octawin','OddEz','TradeSix'];
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
   const names=[...new Set([...botNames,...Object.keys(d.bots||{})])].filter(n=>Number(d.bots?.[n]||0)!==0);
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