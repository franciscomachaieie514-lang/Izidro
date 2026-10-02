(function(){
'use strict';
if(window.__iziLanguageSymbolsV2)return;
window.__iziLanguageSymbolsV2=true;

const SYMBOLS=[
 ['V10','Volatility 10'],['V15','Volatility 15 (1s)'],['V25','Volatility 25'],['V30','Volatility 30 (1s)'],
 ['V50','Volatility 50'],['V75','Volatility 75'],['V90','Volatility 90 (1s)'],['V100','Volatility 100'],
 ['V150','Volatility 150 (1s)'],['V250','Volatility 250 (1s)'],['V10_1S','Volatility 10 (1s)'],
 ['V25_1S','Volatility 25 (1s)'],['V50_1S','Volatility 50 (1s)'],['V75_1S','Volatility 75 (1s)'],
 ['V100_1S','Volatility 100 (1s)']
];

const BOT_TEXT={
 en:{
  proparity:'Analyzes the last 5 ticks<br>Even/Odd',
  octawin:'Analyzes the last 5 ticks<br>Over 5/ Under 4'
 },
 pt:{
  proparity:'Analisa os últimos 5 ticks<br>Par/Impar',
  octawin:'Analisa os últimos 5 ticks<br>Over 5/ Under 4'
 },
 es:{
  proparity:'Analiza los últimos 5 ticks<br>Par/Impar',
  octawin:'Analiza los últimos 5 ticks<br>Over 5/ Under 4'
 }
};

const T={
 en:{balance:'BALANCE',pnl:'PROFIT/LOSS',account:'ACCOUNT TYPE',bot:'BOT',classroom:'LESSON',history:'RECENT HISTORY',slide:'swipe to see more →',stake:'STAKE',minimum:'minimum: $0.35 USD',symbol:'SYMBOL',start:'▶ START ROBOT',goals:'TARGETS',save:'Save targets',profitTarget:'Profit target (USD)',lossTarget:'Loss target (USD)',accountReal:'Real',accountDemo:'Demo',analyzing:'ANALYZING',open:'OPEN',closed:'CLOSED',gain:'WIN',loss:'LOSS',operations:'OPERATIONS',settings:'Settings',language:'Language',help:'Help',logout:'Logout',online:'ONLINE',managementSheet:'MANAGEMENT SHEET',telegramSupport:'TELEGRAM SUPPORT',telegramGroupPt:'TELEGRAM GROUP PORTUGUÊS',telegramGroupEn:'TELEGRAM GROUP ENGLISH',terms:'TERMS AND CONDITIONS'},
 pt:{balance:'SALDO',pnl:'LUCRO/PERDA',account:'TIPO DE CONTA',bot:'BOT',classroom:'AULA',history:'HISTÓRICO RECENTE',slide:'deslize para ver mais →',stake:'APOSTA',minimum:'mínimo: $0.35 USD',symbol:'SÍMBOLO',start:'▶ INICIAR ROBÔ',goals:'METAS',save:'Guardar metas',profitTarget:'Meta de lucros (USD)',lossTarget:'Meta de perdas (USD)',accountReal:'Real',accountDemo:'Demo',analyzing:'ANALISANDO',open:'ABERTO',closed:'FECHADO',gain:'GANHO',loss:'PERDA',operations:'OPERAÇÕES',settings:'Definições',language:'Idioma',help:'Ajuda',logout:'Sair',online:'ONLINE',managementSheet:'PLANILHA DE GERENCIAMENTO',telegramSupport:'SUPORTE TELEGRAM',telegramGroupPt:'GRUPO TELEGRAM PORTUGUÊS',telegramGroupEn:'GRUPO TELEGRAM ENGLISH',terms:'TERMOS E CONDIÇÕES'},
 es:{balance:'SALDO',pnl:'GANANCIA/PÉRDIDA',account:'TIPO DE CUENTA',bot:'BOT',classroom:'LECCIÓN',history:'HISTORIAL RECIENTE',slide:'desliza para ver más →',stake:'APUESTA',minimum:'mínimo: $0.35 USD',symbol:'SÍMBOLO',start:'▶ INICIAR ROBOT',goals:'OBJETIVOS',save:'Guardar objetivos',profitTarget:'Meta de ganancias (USD)',lossTarget:'Meta de pérdidas (USD)',accountReal:'Real',accountDemo:'Demo',analyzing:'ANALIZANDO',open:'ABIERTO',closed:'CERRADO',gain:'GANANCIA',loss:'PÉRDIDA',operations:'OPERACIONES',settings:'Ajustes',language:'Idioma',help:'Ayuda',logout:'Cerrar sesión',online:'EN LÍNEA',managementSheet:'PLANILLA DE GESTIÓN',telegramSupport:'SOPORTE TELEGRAM',telegramGroupPt:'GRUPO TELEGRAM PORTUGUÊS',telegramGroupEn:'GRUPO TELEGRAM INGLÉS',terms:'TÉRMINOS Y CONDICIONES'}
};

function getLang(){try{const lang=localStorage.getItem('izitrader_language')||localStorage.getItem('izitrader_lang')||'pt';return T[lang]?lang:'pt'}catch{return'pt'}}
function setText(id,val){const el=document.getElementById(id);if(el)el.textContent=val}

function applyLanguage(lang){
 const t=T[lang]||T.pt;
 const labels=document.querySelectorAll('.balance-row .label');
 if(labels[0])labels[0].textContent=t.balance;
 if(labels[1]){const pnlLabel=labels[1].querySelector('#pnlLabel');if(pnlLabel)pnlLabel.textContent=t.pnl;else labels[1].textContent=t.pnl;}

 const rowLabels=document.querySelectorAll('.row3 .field-label');
 if(rowLabels[0])rowLabels[0].textContent=t.account;
 if(rowLabels[1])rowLabels[1].textContent=t.bot;
 if(rowLabels[2])rowLabels[2].textContent=t.classroom;

 const aula=document.querySelector('.aula-label');
 if(aula)aula.textContent=t.classroom;

 const history=document.querySelector('.history-title');
 if(history)history.textContent=t.history;
 const hint=document.querySelector('.history-hint');
 if(hint)hint.textContent=t.slide;

 const ops=document.getElementById('opsLabel');
 if(ops)ops.textContent=t.operations;

 const targetLabel=document.getElementById('targetLabel');
 if(targetLabel)targetLabel.textContent=t.goals;
 const targetTitle=document.querySelector('.target-title');
 if(targetTitle)targetTitle.textContent=t.goals;

 const profitLabel=document.querySelector('#profitTarget')?.previousElementSibling;
 const lossLabel=document.querySelector('#lossTarget')?.previousElementSibling;
 if(profitLabel)profitLabel.textContent=t.profitTarget;
 if(lossLabel)lossLabel.textContent=t.lossTarget;

 const targetSave=document.getElementById('targetSave');
 if(targetSave)targetSave.textContent=t.save;

 const profitGoal=Math.max(0,Number(localStorage.getItem('izitrader_profit_goal')||0));
 const lossGoal=Math.max(0,Number(localStorage.getItem('izitrader_loss_goal')||0));
 const targetStatus=document.getElementById('targetStatus');
 if(targetStatus){
  if(profitGoal||lossGoal){
   const a=lang==='en'?'Profit: $':lang==='es'?'Ganancia: $':'Lucro: $';
   const b=lang==='en'?'Loss: $':lang==='es'?'Pérdida: $':'Perda: $';
   targetStatus.textContent=a+profitGoal.toFixed(2)+' • '+b+lossGoal.toFixed(2);
  }else{
   targetStatus.textContent=lang==='en'?'No target set':lang==='es'?'Sin objetivo definido':'Nenhuma meta definida';
  }
 }

 const account=document.getElementById('iziAccountSelect');
 if(account){
  const real=account.querySelector('option[value="real"]'),demo=account.querySelector('option[value="demo"]');
  if(real)real.textContent=t.accountReal;
  if(demo)demo.textContent=t.accountDemo;
 }

 setText('stageLabel0',t.analyzing);setText('stageLabel1',t.open);setText('stageLabel2',t.closed);

 const menuOnline=document.getElementById('onlineLabel');
 const menuSheet=document.getElementById('menuSheet');
 const menuTelegramSupport=document.getElementById('menuTelegramSupport');
 const menuTelegramPt=document.getElementById('menuTelegramPt');
 const menuTelegramEn=document.getElementById('menuTelegramEn');
 const menuTerms=document.getElementById('menuTerms');
 if(menuOnline)menuOnline.textContent=t.online;
 if(menuSheet)menuSheet.querySelector('span').textContent=t.managementSheet;
 if(menuTelegramSupport)menuTelegramSupport.querySelector('span').textContent=t.telegramSupport;
 if(menuTelegramPt)menuTelegramPt.querySelector('span').textContent=t.telegramGroupPt;
 if(menuTelegramEn)menuTelegramEn.querySelector('span').textContent=t.telegramGroupEn;
 if(menuTerms)menuTerms.querySelector('span').textContent=t.terms;
 const menuSettings=document.getElementById('menuSettings');
 const menuLang=document.getElementById('menuLang');
 const menuHelp=document.getElementById('menuHelp');
 const logout=document.getElementById('sairBtn');
 if(menuSettings)menuSettings.textContent=t.settings;
 if(menuLang)menuLang.textContent=t.language+' ▸';
 if(menuHelp)menuHelp.textContent=t.help;
 if(logout)logout.textContent=t.logout;

 const start=document.getElementById('operateBtn');
 if(start&&!start.dataset.running)start.textContent=t.start;

 document.querySelectorAll('#dropdownMenu .dropdown-item').forEach(item=>{
  const name=(item.querySelector('.name')?.textContent||'').trim().toLowerCase();
  const key=['proparity','octawin','oddez','tradesix'].includes(name)?name:null;
  const desc=item.querySelector('.desc');
  if(desc&&key)desc.innerHTML=BOT_TEXT[lang][key];
 });

 document.querySelectorAll('.chip-tag').forEach(tag=>{
  const value=(tag.textContent||'').trim().toUpperCase();
  if(value==='GANHO'||value==='WIN'||value==='GANANCIA')tag.textContent=t.gain;
  if(value==='PERDA'||value==='LOSS'||value==='PÉRDIDA')tag.textContent=t.loss;
 });

 document.documentElement.lang=lang;
}

function renderSymbols(){
 const menu=document.getElementById('symbolMenu');
 const selected=document.getElementById('selectedSymbol');
 const button=document.getElementById('symbolBtn');
 if(!menu)return;

 if(menu.dataset.iziSymbolsRendered!=='1'){
  menu.innerHTML=SYMBOLS.map(function(item){
   return '<div class="symbol-item" data-symbol="'+item[0]+'"><span class="symbol-name">'+item[1]+'</span></div>';
  }).join('');
  menu.dataset.iziSymbolsRendered='1';
  menu.style.maxHeight='260px';
  menu.style.overflowY='auto';
  menu.style.overflowX='hidden';
  menu.style.zIndex='1000';

  if(!menu.dataset.iziSymbolItemBound){
   menu.dataset.iziSymbolItemBound='1';
   menu.addEventListener('click',function(e){
    const item=e.target.closest('.symbol-item');
    if(!item)return;
    e.preventDefault();
    e.stopPropagation();
    menu.classList.remove('open');
    menu.style.display='none';
   });
  }
 }

 const saved=localStorage.getItem('izitrader_symbol')||'V100';
 const current=SYMBOLS.find(function(item){return item[0]===saved})||SYMBOLS.find(function(item){return item[0]==='V100'});
 if(selected&&current)selected.textContent=current[1];

 if(button&&!button.dataset.iziLanguageSymbolButton){
  button.dataset.iziLanguageSymbolButton='1';
  button.addEventListener('click',function(e){
   e.preventDefault();e.stopPropagation();
   renderSymbols();
   menu.classList.toggle('open');
   menu.style.display=menu.classList.contains('open')?'block':'none';
  },true);
 }
}

window.ensureIzitraderSymbols=renderSymbols;

function bindLanguages(){
 document.querySelectorAll('.language-item[data-lang]').forEach(function(item){
  if(item.dataset.iziLangBound)return;
  item.dataset.iziLangBound='1';
  item.addEventListener('click',function(e){
   e.preventDefault();e.stopPropagation();
   const lang=item.dataset.lang;
   if(!T[lang])return;
   localStorage.setItem('izitrader_language',lang);
   localStorage.setItem('izitrader_lang',lang);
   applyLanguage(lang);
   renderSymbols();
   window.dispatchEvent(new CustomEvent('izitrader:language-change',{detail:{lang:lang}}));
   document.getElementById('languageOptions')?.classList.remove('open');
   document.getElementById('menu')?.classList.remove('open');
   document.body.classList.remove('izi-menu-open');
  });
 });
}

/* ===== AULA: language -> PC/mobile version ===== */
function ensureAulaVersionChooser(){
 if(document.getElementById('aulaVersionChooser'))return document.getElementById('aulaVersionChooser');

 const style=document.createElement('style');
 style.id='aulaVersionChooserStyle';
 style.textContent=`
#aulaVersionChooser{position:fixed;inset:0;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:18px;z-index:1000000}
#aulaVersionChooser[hidden]{display:none}
.aula-version-card{width:min(380px,100%);background:var(--card,#fff);color:var(--text,#17202a);border:1px solid var(--border,#dfe4ea);border-radius:16px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.22);text-align:center}
.aula-version-title{font-size:18px;font-weight:800;margin-bottom:6px}
.aula-version-subtitle{font-size:12px;color:var(--muted,#697586);margin-bottom:16px}
.aula-version-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.aula-version-btn{border:1px solid var(--border,#dfe4ea);background:var(--field,#f7f8fa);color:var(--text,#17202a);border-radius:12px;padding:14px 10px;font-weight:800;font-size:14px;cursor:pointer}
.aula-version-btn:hover{border-color:var(--accent,#e24b4a)}
.aula-version-cancel{margin-top:12px;border:0;background:transparent;color:var(--muted,#697586);font-size:12px;cursor:pointer}
@media(max-width:599px){.aula-version-actions{grid-template-columns:1fr}.aula-version-card{padding:18px}}
`;
 document.head.appendChild(style);

 const overlay=document.createElement('div');
 overlay.id='aulaVersionChooser';
 overlay.hidden=true;
 overlay.innerHTML=`
  <div class="aula-version-card" role="dialog" aria-modal="true" aria-labelledby="aulaVersionTitle">
   <div class="aula-version-title" id="aulaVersionTitle"></div>
   <div class="aula-version-subtitle" id="aulaVersionSubtitle"></div>
   <div class="aula-version-actions">
    <button type="button" class="aula-version-btn" data-aula-version="pc">💻 <span id="aulaPcText"></span></button>
    <button type="button" class="aula-version-btn" data-aula-version="mobile">📱 <span id="aulaMobileText"></span></button>
   </div>
   <button type="button" class="aula-version-cancel" id="aulaVersionCancel"></button>
  </div>`;
 document.body.appendChild(overlay);

 overlay.addEventListener('click',function(e){
  if(e.target===overlay)closeAulaVersionChooser();
  const btn=e.target.closest('[data-aula-version]');
  if(!btn)return;
  const version=btn.dataset.aulaVersion;
  const language=overlay.dataset.language||getLang();
  try{localStorage.setItem('izitrader_aula_language',language);localStorage.setItem('izitrader_aula_version',version)}catch{}
  closeAulaVersionChooser();
  window.dispatchEvent(new CustomEvent('izitrader:aula-version-change',{detail:{language:language,version:version}}));
 });
 document.getElementById('aulaVersionCancel').addEventListener('click',closeAulaVersionChooser);
 document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!overlay.hidden)closeAulaVersionChooser()});
 return overlay;
}

function closeAulaVersionChooser(){
 const overlay=document.getElementById('aulaVersionChooser');
 if(!overlay)return;
 overlay.hidden=true;
 overlay.removeAttribute('data-language');
}

function openAulaVersionChooser(language){
 const overlay=ensureAulaVersionChooser();
 const lang=language==='en'||language==='es'?language:'pt';
 overlay.dataset.language=lang;
 const copy={
  pt:{title:'Escolha a versão da aula',subtitle:'Primeiro escolha a versão para o seu dispositivo.',pc:'Versão PC',mobile:'Versão Mobile',cancel:'Cancelar'},
  en:{title:'Choose lesson version',subtitle:'First choose the version for your device.',pc:'PC version',mobile:'Mobile version',cancel:'Cancel'},
  es:{title:'Elige la versión de la lección',subtitle:'Primero elige la versión para tu dispositivo.',pc:'Versión PC',mobile:'Versión Mobile',cancel:'Cancelar'}
 }[lang];
 document.getElementById('aulaVersionTitle').textContent=copy.title;
 document.getElementById('aulaVersionSubtitle').textContent=copy.subtitle;
 document.getElementById('aulaPcText').textContent=copy.pc;
 document.getElementById('aulaMobileText').textContent=copy.mobile;
 document.getElementById('aulaVersionCancel').textContent=copy.cancel;
 overlay.hidden=false;
}

function boot(){
 const lang=getLang();
 applyLanguage(lang);
 renderSymbols();
 bindLanguages();
 ensureAulaVersionChooser();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();

window.addEventListener('izitrader:language-change',function(e){
 applyLanguage(e?.detail?.lang||getLang());
 renderSymbols();
 document.getElementById('languageOptions')?.classList.remove('open');
 document.getElementById('menu')?.classList.remove('open');
 document.body.classList.remove('izi-menu-open');
});
window.addEventListener('izitrader:contract-closed',function(){setTimeout(function(){applyLanguage(getLang())},0)});
window.addEventListener('izitrader:martingale',function(){setTimeout(function(){applyLanguage(getLang())},0)});
window.addEventListener('izitrader:ws-open',function(){setTimeout(function(){applyLanguage(getLang())},0)});

/* The AULA controller in dashboard.html dispatches this event after the
   user chooses Portuguese or English. At that point we intentionally ask
   for PC or Mobile before continuing. */
window.addEventListener('izitrader:aula-language-change',function(e){
 const lang=e?.detail?.language==='en'?'en':'pt';
 openAulaVersionChooser(lang);
});
})();