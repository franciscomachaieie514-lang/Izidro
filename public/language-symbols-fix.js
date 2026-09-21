(function(){'use strict';
const SYMBOLS=[['V10','Volatility 10'],['V15','Volatility 15 (1s)'],['V25','Volatility 25'],['V30','Volatility 30 (1s)'],['V50','Volatility 50'],['V75','Volatility 75'],['V90','Volatility 90 (1s)'],['V100','Volatility 100'],['V150','Volatility 150 (1s)'],['V250','Volatility 250 (1s)'],['V10_1S','Volatility 10 (1s)'],['V25_1S','Volatility 25 (1s)'],['V50_1S','Volatility 50 (1s)'],['V75_1S','Volatility 75 (1s)'],['V100_1S','Volatility 100 (1s)']];
const T={
en:{balance:'BALANCE',pnl:'PROFIT/LOSS',account:'ACCOUNT TYPE',bot:'BOT',classroom:'LESSON',history:'RECENT HISTORY',slide:'swipe to see more →',last:'LAST DIGIT',stake:'STAKE',minimum:'minimum: $0.35 USD',symbol:'SYMBOL',start:'▶ START ROBOT',stop:'■ STOP ROBOT',settings:'Settings',language:'Language',help:'Help',goals:'TARGETS',profitTarget:'Profit target (USD)',lossTarget:'Loss target (USD)',save:'Save targets',noTarget:'No target set',accountReal:'Real',accountDemo:'Demo',statusConnecting:'Connecting to Deriv…',statusReal:'Real account connected',statusDemo:'Demo account connected',analyzing:'ANALYZING',open:'OPEN',closed:'CLOSED',robot:'Robot active — waiting for signal',martingale:'Martingale ON',nextStake:'next stake',gain:'WIN',loss:'LOSS',positions:'POSITIONS',operations:'OPERATIONS'},
pt:{balance:'SALDO',pnl:'LUCRO/PERDA',account:'TIPO DE CONTA',bot:'BOT',classroom:'AULA',history:'HISTÓRICO RECENTE',slide:'deslize para ver mais →',last:'ÚLTIMO DÍGITO',stake:'APOSTA',minimum:'mínimo: $0.35 USD',symbol:'SÍMBOLO',start:'▶ INICIAR ROBÔ',stop:'■ PARAR ROBÔ',settings:'Definições',language:'Idioma',help:'Ajuda',goals:'METAS',profitTarget:'Meta de lucros (USD)',lossTarget:'Meta de perdas (USD)',save:'Guardar metas',noTarget:'Nenhuma meta definida',accountReal:'Real',accountDemo:'Demo',statusConnecting:'A ligar à Deriv…',statusReal:'Conta Real ligada',statusDemo:'Conta Demo ligada',analyzing:'ANALISANDO',open:'ABERTO',closed:'FECHADO',robot:'Robô ativo — à espera de sinal',martingale:'Martingale ON',nextStake:'próxima aposta',gain:'GANHO',loss:'PERDA',positions:'POSIÇÕES',operations:'OPERAÇÕES'},
es:{balance:'SALDO',pnl:'GANANCIA/PÉRDIDA',account:'TIPO DE CUENTA',bot:'BOT',classroom:'LECCIÓN',history:'HISTORIAL RECIENTE',slide:'desliza para ver más →',last:'ÚLTIMO DÍGITO',stake:'APUESTA',minimum:'mínimo: $0.35 USD',symbol:'SÍMBOLO',start:'▶ INICIAR ROBOT',stop:'■ DETENER ROBOT',settings:'Ajustes',language:'Idioma',help:'Ayuda',goals:'OBJETIVOS',profitTarget:'Meta de ganancias (USD)',lossTarget:'Meta de pérdidas (USD)',save:'Guardar objetivos',noTarget:'Sin objetivo definido',accountReal:'Real',accountDemo:'Demo',statusConnecting:'Conectando a Deriv…',statusReal:'Cuenta Real conectada',statusDemo:'Cuenta Demo conectada',analyzing:'ANALIZANDO',open:'ABIERTO',closed:'CERRADO',robot:'Robot activo — esperando señal',martingale:'Martingale ON',nextStake:'próxima apuesta',gain:'GANANCIA',loss:'PÉRDIDA',positions:'POSICIONES',operations:'OPERACIONES'}
}};
const BOT_TEXT={en:{proparity:'Wins on even digits',octawin:'Wins if the digit is below 8',oddez:'Wins on odd digits',tradesix:'Wins if the digit is above 6'},pt:{proparity:'Ganha em dígito par',octawin:'Ganha se o dígito for menor que 8',oddez:'Ganha em dígito ímpar',tradesix:'Ganha se o dígito for maior que 6'},es:{proparity:'Gana con dígito par',octawin:'Gana si el dígito es menor que 8',oddez:'Gana con dígito impar',tradesix:'Gana si el dígito es mayor que 6'}};
let current='en';
const getLang=()=>{try{return localStorage.getItem('izitrader_language')||localStorage.getItem('izitrader_lang')||'en'}catch{return'en'}};
function setText(id,text){const e=document.getElementById(id);if(e)e.textContent=text}
function replaceKnownText(root,t){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
 nodes.forEach(node=>{
  const raw=node.nodeValue||'', v=raw.trim();if(!v)return;
  if(/^(ANALIZANDO|ANALYZING|ABERTO|ABIERTO|OPEN|FECHADO|CERRADO|CLOSED)$/.test(v)){const k=v==='ANALIZANDO'||v==='ANALYZING'?'analyzing':v==='ABERTO'||v==='ABIERTO'||v==='OPEN'?'open':'closed';node.nodeValue=raw.replace(v,t[k]);return}
  if(/^(GANHO|GANANCIA|PÉRDIDA|PERDA|WIN|LOSS)$/.test(v))node.nodeValue=raw.replace(v,/^(GANHO|GANANCIA|WIN)$/.test(v)?t.gain:t.loss);
  if(/^(▶ Start Robot|▶ START ROBOT|▶ Iniciar Robot|▶ Iniciar ROBOT|▶ INICIAR ROBÔ|▶ INICIAR ROBOT)$/.test(v))node.nodeValue=t.start;
  if(/^(■ Stop Robot|■ STOP ROBOT|■ Parar Robot|■ PARAR ROBÔ|■ DETENER ROBOT)$/.test(v))node.nodeValue=t.stop;
  if(/^(25 TICKS|100 TICKS|200 TICKS|500 TICKS|1000 TICKS)$/.test(v))node.nodeValue=v;
  if(/^(Robot activo — esperando señal|Robô ativo — à espera de sinal|Robot active — waiting for signal)$/.test(v))node.nodeValue=t.robot;
  const m=v.match(/^(Martingale ON|Martingale)\s*[·•-]?\s*(?:nivel|level|nivel)\s*(\d+)\s*\/\s*(\d+)\s*[·•-]\s*(?:próxima aposta|next stake|próxima apuesta)\s*\$([\d.,]+)/i);
  if(m)node.nodeValue=t.martingale+' · '+m[1].match(/\d+/)?m[2]+'/'+m[3]:'';
  if(m){node.nodeValue=t.martingale+' · '+(current==='en'?'level ':current==='es'?'nivel ':'nível ')+m[2]+'/'+m[3]+' · '+t.nextStake+' $'+m[4]}
 });
}
function applyLanguage(){
 current=getLang();const t=T[current]||T.en;localStorage.setItem('izitrader_language',current);localStorage.setItem('izitrader_lang',current);document.documentElement.lang=current;
 setText('menuSettings',t.settings);setText('menuLang',t.language+' ▸');setText('menuHelp',t.help);setText('sairBtn',current==='en'?'Logout':current==='es'?'Salir':'Sair');
 setText('opsLabel',t.operations);setText('stageLabel0',t.analyzing);setText('stageLabel1',t.open);setText('stageLabel2',t.closed);
 const status=document.getElementById('statusText');if(status){const v=status.textContent||'';const connected=/connected|ligad|ligada|ligado|conectad|conectada|conectado/i.test(v);const demo=/demo/i.test(v);status.textContent=connected?(demo?t.statusDemo:t.statusReal):t.statusConnecting}setText('analysisBtn',document.getElementById('analysisBtn')?.textContent||'25 TICKS');setText('targetBtn',t.goals);setText('targetSave',t.save);setText('targetStatus',t.noTarget);setText('lastDigit',document.getElementById('lastDigit')?.textContent||'–');setText('operateBtn',t.start);
 const labels=document.querySelectorAll('.row3 .field-label');if(labels[0])labels[0].textContent=t.account;if(labels[1])labels[1].textContent=t.bot;if(labels[2])labels[2].textContent=t.classroom;
 const bl=document.querySelector('.balance-row .label');if(bl)bl.textContent=t.balance;const pnl=document.querySelectorAll('.balance-row .label')[1];if(pnl)pnl.textContent=t.pnl;
 const h=document.querySelector('.history-title');if(h)h.textContent=t.history;const hint=document.querySelector('.history-hint');if(hint)hint.textContent=t.slide;
 const last=document.querySelector('.caption');if(last)last.textContent=t.last;
 const fieldLabels=document.querySelectorAll('.card .field-label');fieldLabels.forEach(e=>{const first=e.childNodes[0];if(!first||first.nodeType!==3)return;const s=first.nodeValue.trim();if(/^(APOSTA|STAKE|APUESTA)/i.test(s))first.nodeValue=t.stake+' ';if(/^(SÍMBOLO|SYMBOL)/i.test(s))first.nodeValue=t.symbol+' '});
 const min=document.querySelector('.stake-row')?.parentElement?.querySelector('.field-label span');if(min)min.textContent=t.minimum;
 const note=document.querySelector('.note');if(note)note.textContent=current==='en'?'Secure connection to Deriv — balance and ticks in real time.':current==='es'?'Conexión segura a Deriv — saldo y ticks en tiempo real.':'Ligação segura à Deriv — saldo e ticks em tempo real.';
 const acc=document.getElementById('iziAccountSelect');if(acc){const r=acc.querySelector('option[value="real"]'),d=acc.querySelector('option[value="demo"]');if(r)r.textContent=t.accountReal;if(d)d.textContent=t.accountDemo}
 const save=document.getElementById('targetSave');if(save)save.textContent=t.save;const pt=document.querySelector('#profitTarget')?.previousElementSibling,lt=document.querySelector('#lossTarget')?.previousElementSibling;if(pt)pt.textContent=t.profitTarget;if(lt)lt.textContent=t.lossTarget;
 document.querySelectorAll('#dropdownMenu .dropdown-item').forEach(item=>{const name=(item.querySelector('.name')?.textContent||'').trim().toLowerCase();const key={proparity:'proparity',octawin:'octawin',oddez:'oddez',tradesix:'tradesix'}[name];const desc=item.querySelector('.desc');if(desc&&key)desc.textContent=BOT_TEXT[current][key]});
 replaceKnownText(document.body,t);
 window.dispatchEvent(new CustomEvent('izitrader:language-applied',{detail:{lang:current}}));
}
function setLanguage(lang){if(!T[lang])return;localStorage.setItem('izitrader_language',lang);localStorage.setItem('izitrader_lang',lang);applyLanguage();window.dispatchEvent(new CustomEvent('izitrader:language-change',{detail:{lang}}))}
function ensureSymbols(){
 const m=document.getElementById('symbolMenu'),b=document.getElementById('symbolBtn');if(!m)return;
 m.innerHTML=SYMBOLS.map(([code,name])=>'<div class="symbol-item" data-symbol="'+code+'"><span class="symbol-name">'+name+'</span></div>').join('');
 m.style.maxHeight='260px';m.style.overflowY='auto';m.style.overflowX='hidden';m.style.zIndex='1000';
 m.querySelectorAll('.symbol-item').forEach(item=>item.addEventListener('click',()=>{const code=item.dataset.symbol;const found=SYMBOLS.find(x=>x[0]===code);const sel=document.getElementById('selectedSymbol');if(sel)sel.textContent=found?found[1]:code;localStorage.setItem('izitrader_symbol',code);m.classList.remove('open');m.style.display='none';window.dispatchEvent(new CustomEvent('izitrader:symbol-change',{detail:{symbol:code}}))}));
 const saved=localStorage.getItem('izitrader_symbol')||'V100',found=SYMBOLS.find(x=>x[0]===saved);const sel=document.getElementById('selectedSymbol');if(sel)sel.textContent=found?found[1]:SYMBOLS[0][1];
 if(b&&!b.dataset.iziSymbolsFix){b.dataset.iziSymbolsFix='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();ensureSymbols();m.classList.add('open');m.style.display='block'},{capture:true})}
}
function bindLanguages(){document.querySelectorAll('.language-item[data-lang]').forEach(item=>{if(item.dataset.iziLangBound)return;item.dataset.iziLangBound='1';item.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setLanguage(item.dataset.lang);document.getElementById('languageOptions')?.classList.remove('open');document.getElementById('menu')?.classList.remove('open')})})}
function boot(){current=getLang();applyLanguage();ensureSymbols();bindLanguages();setTimeout(applyLanguage,200);setTimeout(applyLanguage,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('izitrader:language-change',()=>applyLanguage());
window.addEventListener('izitrader:contract-closed',()=>setTimeout(applyLanguage,0));
window.addEventListener('izitrader:martingale',()=>setTimeout(applyLanguage,0));
window.addEventListener('izitrader:ws-open',()=>setTimeout(applyLanguage,0));
window.addEventListener('izitrader:symbol-change',()=>setTimeout(applyLanguage,0));
})();