/* IziTrader dashboard metrics — closed-trade history, Positions and page i18n. */
(function(){
  'use strict';

  const YELLOW='#f5c04a';
  const RED='#e24b4a';
  const SIGNED=/^[+-]\\$?\\d+(?:[.,]\\d{1,2})?$/;
  const $=s=>document.querySelector(s);
  const seenClosed=new Set();
  let currentLang='pt';

  const translations={
    pt:{
      'SALDO':'SALDO','LUCRO/PERDA':'LUCRO/PERDA','TIPO DE CONTA':'TIPO DE CONTA','BOT':'BOT','AULA':'AULA',
      'HISTÓRICO RECENTE':'HISTÓRICO RECENTE','deslize para ver mais →':'deslize para ver mais →','POSITIONS':'POSITIONS',
      'METAS':'METAS','Setup de metas':'Setup de metas','Meta de lucros (USD)':'Meta de lucros (USD)','Meta de perdas (USD)':'Meta de perdas (USD)',
      'Guardar metas':'Guardar metas','Nenhuma meta definida':'Nenhuma meta definida','APOSTA':'APOSTA','mínimo: $0.35 USD':'mínimo: $0.35 USD',
      'INICIAR ROBÔ REAL':'INICIAR ROBÔ REAL','Ligação segura à Deriv — saldo e ticks em tempo real.':'Ligação segura à Deriv — saldo e ticks em tempo real.',
      'SÍMBOLO':'SÍMBOLO','ÚLTIMO DÍGITO':'ÚLTIMO DÍGITO','Definições':'Definições','Idioma ▸':'Idioma ▸','Ajuda':'Ajuda','Sair':'Sair',
      'Real':'Real','Demo':'Demo','GANHO':'GANHO','PERDA':'PERDA','WIN':'GANHO','LOSS':'PERDA','A ligar à Deriv...':'A ligar à Deriv...'
    },
    en:{
      'SALDO':'BALANCE','LUCRO/PERDA':'PROFIT/LOSS','TIPO DE CONTA':'ACCOUNT TYPE','BOT':'BOT','AULA':'LESSON',
      'HISTÓRICO RECENTE':'RECENT HISTORY','deslize para ver mais →':'swipe to see more →','POSITIONS':'POSITIONS',
      'METAS':'TARGETS','Setup de metas':'Target setup','Meta de lucros (USD)':'Profit target (USD)','Meta de perdas (USD)':'Loss target (USD)',
      'Guardar metas':'Save targets','Nenhuma meta definida':'No target set','APOSTA':'STAKE','mínimo: $0.35 USD':'minimum: $0.35 USD',
      'INICIAR ROBÔ REAL':'START REAL ROBOT','Ligação segura à Deriv — saldo e ticks em tempo real.':'Secure Deriv connection — balance and ticks in real time.',
      'SÍMBOLO':'SYMBOL','ÚLTIMO DÍGITO':'LAST DIGIT','Definições':'Settings','Idioma ▸':'Language ▸','Ajuda':'Help','Sair':'Logout',
      'Real':'Real','Demo':'Demo','GANHO':'WIN','PERDA':'LOSS','WIN':'WIN','LOSS':'LOSS','A ligar à Deriv...':'Connecting to Deriv...'
    },
    es:{
      'SALDO':'SALDO','LUCRO/PERDA':'GANANCIA/PÉRDIDA','TIPO DE CONTA':'TIPO DE CUENTA','BOT':'BOT','AULA':'LECCIÓN',
      'HISTÓRICO RECENTE':'HISTORIAL RECIENTE','deslize para ver mais →':'desliza para ver más →','POSITIONS':'POSICIONES',
      'METAS':'OBJETIVOS','Setup de metas':'Configuración de objetivos','Meta de lucros (USD)':'Objetivo de ganancias (USD)','Meta de perdas (USD)':'Objetivo de pérdidas (USD)',
      'Guardar metas':'Guardar objetivos','Nenhuma meta definida':'Ningún objetivo definido','APOSTA':'APUESTA','mínimo: $0.35 USD':'mínimo: $0.35 USD',
      'INICIAR ROBÔ REAL':'INICIAR ROBOT REAL','Ligação segura à Deriv — saldo e ticks em tempo real.':'Conexión segura a Deriv — saldo y ticks en tiempo real.',
      'SÍMBOLO':'SÍMBOLO','ÚLTIMO DÍGITO':'ÚLTIMO DÍGITO','Definições':'Configuración','Idioma ▸':'Idioma ▸','Ajuda':'Ayuda','Sair':'Salir',
      'Real':'Real','Demo':'Demo','GANHO':'GANANCIA','PERDA':'PÉRDIDA','WIN':'GANANCIA','LOSS':'PÉRDIDA','A ligar à Deriv...':'Conectando a Deriv...'
    }
  };

  function installStyles(){
    if($('#iziDashboardMetricsStyle')) return;
    const s=document.createElement('style');
    s.id='iziDashboardMetricsStyle';
    s.textContent=`
      .balance-row #pnl{color:${YELLOW}!important}
      #historyScroll{display:flex!important;gap:10px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;-webkit-overflow-scrolling:touch}
      #historyScroll .history-item{flex:0 0 calc(25% - 7.5px)!important;min-width:0!important;max-width:calc(25% - 7.5px)!important;padding:10px 7px!important;white-space:nowrap;overflow:hidden}
      #historyScroll .history-item .bot,#historyScroll .history-item .time{display:none!important}
      #historyScroll .history-item .digit-row{display:flex;align-items:baseline;justify-content:center;gap:5px;min-width:0}
      #historyScroll .history-item .digit{font-size:14px!important;font-weight:800!important;color:${YELLOW}!important;white-space:nowrap}
      #historyScroll .history-item .result{font-size:9px!important;font-weight:800!important;white-space:nowrap}
      #historyScroll .history-item .result.win{color:${YELLOW}!important}
      #historyScroll .history-item .result.loss{color:${RED}!important}
      .izi-positions-footer{display:flex;align-items:center;justify-content:center;border-top:1px solid var(--border);margin-top:2px;padding-top:10px;font-size:13px;font-weight:800;letter-spacing:.03em;color:var(--muted)}
      .izi-positions-footer .positions-label{margin-right:7px}.izi-positions-footer .positions-value{color:var(--text);font-size:14px}
      @media(max-width:599px){.balance-row .value{font-size:18px}.balance-row .label{font-size:10px}#historyScroll .history-item{padding:10px 6px!important}}
    `;
    document.head.appendChild(s);
  }

  function ensurePositionsFooter(){
    const history=$('#historyScroll'); if(!history) return;
    const card=history.closest('.card'); if(!card) return;
    const oldBalance=$('.balance-row .positions-block');
    if(oldBalance){const d=oldBalance.previousElementSibling;oldBalance.remove();if(d&&d.classList.contains('divider'))d.remove();}
    let footer=card.querySelector('.izi-positions-footer');
    if(!footer){footer=document.createElement('div');footer.className='izi-positions-footer';footer.innerHTML='<span class="positions-label">POSITIONS</span><span class="positions-value" id="positionsValue">0</span>';card.appendChild(footer);}
  }

  function normalizeAmount(raw){
    let v=String(raw||'').trim().replace(/\\s+/g,'').replace(',', '.');
    if(!SIGNED.test(v)) return null;
    const sign=v.charAt(0), hasDollar=v.charAt(1)==='$', number=v.slice(hasDollar?2:1);
    const parsed=Number(number); if(!Number.isFinite(parsed)) return null;
    const normalized=(Math.round(parsed*100)/100).toString();
    return sign+(hasDollar?'$':'')+normalized;
  }

  function resultLabel(win){return (translations[currentLang]||translations.pt)[win?'GANHO':'PERDA'];}

  function formatResultItem(item){
    if(!item) return false;
    let digit=item.querySelector('.digit');
    let result=item.querySelector('.result');
    const fallback=item.dataset.profit||item.querySelector('.profit')?.textContent||'';
    let amount=normalizeAmount(digit?.textContent||'')||normalizeAmount(fallback);

    if(!amount){item.remove();return false;}
    if(!digit){
      const row=item.querySelector('.digit-row')||item;
      digit=document.createElement('span');digit.className='digit';row.insertBefore(digit,row.firstChild||null);
    }
    if(!result){
      const row=digit.parentElement||item;
      result=document.createElement('span');result.className='result';row.appendChild(result);
    }
    const win=amount.charAt(0)==='+';
    if(digit.textContent!==amount) digit.textContent=amount;
    const label=resultLabel(win);
    if(result.textContent!==label) result.textContent=label;
    result.classList.remove('win','loss');result.classList.add(win?'win':'loss');
    digit.style.color=YELLOW;result.style.color=win?YELLOW:RED;
    return true;
  }

  function formatHistory(){document.querySelectorAll('#historyScroll .history-item').forEach(formatResultItem);}

  function getPositions(){try{const n=Number(sessionStorage.getItem('izitrader_positions')||0);return Number.isFinite(n)&&n>0?n:0;}catch{return 0}}
  function setPositions(n){const value=Math.max(0,Number(n)||0);const el=$('#positionsValue');if(el&&el.textContent!==String(value))el.textContent=String(value);try{if(sessionStorage.getItem('izitrader_positions')!==String(value))sessionStorage.setItem('izitrader_positions',String(value));}catch{}}

  function translateText(root=document){
    const dict=translations[currentLang]||translations.pt;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let n;while(n=walker.nextNode())nodes.push(n);
    nodes.forEach(node=>{
      const raw=node.nodeValue||'', trimmed=raw.trim(); if(!trimmed||!dict[trimmed])return;
      const replacement=dict[trimmed]; if(replacement===trimmed)return;
      node.nodeValue=raw.replace(trimmed,replacement);
    });
    document.documentElement.lang=currentLang;
    formatHistory();
  }

  function setLanguage(lang){
    if(!translations[lang])lang='pt';
    currentLang=lang;
    try{localStorage.setItem('izitrader_language',lang)}catch{}
    translateText(document.body);
    document.querySelectorAll('#historyScroll .result').forEach(el=>{
      const win=el.classList.contains('win');el.textContent=resultLabel(win);
    });
  }

  function bindLanguage(){
    document.querySelectorAll('.language-item[data-lang]').forEach(el=>{
      if(el.dataset.iziLangBound)return;
      el.addEventListener('click',()=>setLanguage(el.dataset.lang));el.dataset.iziLangBound='1';
    });
    let saved='pt';try{saved=localStorage.getItem('izitrader_language')||'pt'}catch{}
    currentLang=translations[saved]?saved:'pt';
    translateText(document.body);
  }

  function start(){
    installStyles();ensurePositionsFooter();
    setPositions(getPositions());formatHistory();bindLanguage();

    window.addEventListener('izitrader:contract-closed',(event)=>{
      const d=event?.detail||{},id=String(d.contract_id||d.contractId||'');
      if(id&&seenClosed.has(id))return;if(id)seenClosed.add(id);
      setPositions(getPositions()+1);requestAnimationFrame(formatHistory);
    });

    const history=$('#historyScroll');
    if(history&&!history.dataset.metricsObserver){
      const observer=new MutationObserver(()=>{formatHistory();bindLanguage();});
      observer.observe(history,{childList:true,subtree:true});history.dataset.metricsObserver='1';
    }
    const pnl=$('#pnl');if(pnl)pnl.style.color=YELLOW;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
