(async function(){const authPage=document.getElementById('authPage');const appPage=document.getElementById('appPage');const loginLink=document.getElementById('loginLink');const sairBtn=document.getElementById('sairBtn');if(loginLink)loginLink.href='/api/auth/login';try{sessionStorage.removeItem('izitrader_demo_session')}catch{}if(!['real','demo'].includes(localStorage.getItem('izitrader_account_type')))localStorage.setItem('izitrader_account_type','real');function applyAuthEnglish(){const title=authPage?.querySelector('.auth-title');const sub=authPage?.querySelector('.auth-subtitle');const buttons=authPage?.querySelectorAll('.auth-btn');if(title)title.textContent='Welcome to Izitrader';if(sub)sub.textContent='Log in or create your Deriv account to continue.';if(buttons&&buttons[0])buttons[0].textContent='Create a Deriv account';if(buttons&&buttons[1])buttons[1].textContent='Log in with Deriv';document.documentElement.lang='en'}applyAuthEnglish();let riskLoaded=false,controlsLoaded=false,professionalLoaded=false,tradingEnhancementsLoaded=false,metricsLoaded=false,safeStartLoaded=false;function loadRiskWarning(){if(riskLoaded||document.querySelector('script[data-risk-warning]'))return;riskLoaded=true;const s=document.createElement('script');s.src='/risk-warning.js';s.dataset.riskWarning='1';document.body.appendChild(s)}function loadControls(){if(controlsLoaded||document.querySelector('script[data-history-target-fix]'))return;controlsLoaded=true;const s=document.createElement('script');s.src='/history-target-fix.js';s.dataset.historyTargetFix='1';document.body.appendChild(s)}function loadProfessional(){if(professionalLoaded||document.querySelector('script[data-professional-ui]'))return;professionalLoaded=true;const s=document.createElement('script');s.src='/professional-ui.js';s.dataset.professionalUi='1';document.body.appendChild(s)}function loadTradingEnhancements(){if(tradingEnhancementsLoaded||document.querySelector('script[data-trading-enhancements]'))return;tradingEnhancementsLoaded=true;const s=document.createElement('script');s.src='/trading-enhancements.js';s.dataset.tradingEnhancements='1';document.body.appendChild(s)}function loadMetrics(){if(metricsLoaded||document.querySelector('script[data-dashboard-metrics]'))return;metricsLoaded=true;const s=document.createElement('script');s.src='/dashboard-metrics.js';s.dataset.dashboardMetrics='1';document.body.appendChild(s)}function loadSafeStart(){if(safeStartLoaded||document.querySelector('script[data-safe-start-confirm]'))return;safeStartLoaded=true;const s=document.createElement('script');s.src='/safe-start-confirm.js';s.dataset.safeStartConfirm='1';document.body.appendChild(s)}function showApp(){try{localStorage.setItem('izitrader_lang','en')}catch{}if(authPage)authPage.classList.add('hidden');if(appPage)appPage.classList.remove('hidden');loadProfessional();loadControls();loadTradingEnhancements();loadMetrics();loadSafeStart()}function showAuth(){if(window.IziDerivWS&&typeof window.IziDerivWS.stop==='function')window.IziDerivWS.stop();applyAuthEnglish();if(appPage)appPage.classList.add('hidden');if(authPage)authPage.classList.remove('hidden');loadRiskWarning()}if(sairBtn)sairBtn.addEventListener('click',async()=>{try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});}catch{}try{localStorage.removeItem('izitrader_account_type')}catch{}showAuth()});const params=new URLSearchParams(location.search);if(params.has('auth_error')){const code=params.get('auth_error')||'unknown';alert('Could not complete Deriv login: '+code);history.replaceState({},'',location.pathname)}try{const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}),s=await r.json();if(s.authenticated)showApp();else showAuth()}catch{showAuth()}})();

/* HISTÓRICO: mostrar somente trades fechados */
(function(){
  const row=document.getElementById('historyScroll');
  const count=document.getElementById('opsCount');
  if(!row)return;

  function amount(c){
    const n=Number(c?.profit??c?.pnl??c?.amount??c?.payout??0);
    return Number.isFinite(n)?Math.abs(n).toFixed(2):'0.00';
  }

  function renderClosed(item,c,result){
    const won=String(result||'').toUpperCase()==='WON';
    const lost=String(result||'').toUpperCase()==='LOST';
    if(!won&&!lost)return false;
    item.className='chip '+(won?'win':'loss');
    item.innerHTML='<span>'+(won?'+$':'-$')+amount(c)+'</span><span class="chip-tag">'+(won?'GANHO':'PERDA')+'</span>';
    return true;
  }

  function decrementOpenOperation(){
    const n=Math.max(0,(Number(count?.textContent)||0)-1);
    if(count)count.textContent=String(n);
    try{localStorage.setItem('izitrader_operations',String(n))}catch{}
  }

  window.addEventListener('izitrader:buy',function(e){
    const c=e.detail||{};
    const id=String(c.contract_id||'');
    if(!id)return;
    const item=[...row.children].find(x=>x.dataset.contractId===id);
    if(item){item.remove();decrementOpenOperation();}
  });

  window.addEventListener('izitrader:contract-closed',function(e){
    const c=e.detail||{};
    const result=String(c.result||'').toUpperCase();
    if(result!=='WON'&&result!=='LOST')return;
    const id=String(c.contract_id||'');
    let item=id?[...row.children].find(x=>x.dataset.contractId===id):null;
    if(!item){
      item=document.createElement('div');
      item.dataset.contractId=id;
      row.prepend(item);
      const n=Math.min(20,(Number(count?.textContent)||0)+1);
      if(count)count.textContent=String(n);
      try{localStorage.setItem('izitrader_operations',String(n))}catch{}
    }
    renderClosed(item,c,result);
    while(row.children.length>20)row.lastElementChild.remove();
  });
})();