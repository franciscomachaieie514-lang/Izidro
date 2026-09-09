/* Izitrader risk warning on the landing page. */
(function(){
'use strict';
const TEXT={
  en:{title:'RISK WARNING',text:'Trading digital options involves a high level of risk. You may lose the entire amount invested in a trade. Never trade money you cannot afford to lose and make sure you understand the risks before trading.',note:'Izitrader is a trading tool and does not provide financial advice or guarantee profits.',link:'Read Deriv risk disclosure'},
  pt:{title:'AVISO DE RISCO',text:'Negociar opções digitais envolve um elevado nível de risco. Pode perder todo o valor investido numa operação. Nunca negocie dinheiro que não possa perder e certifique-se de que compreende os riscos antes de operar.',note:'O Izitrader é uma ferramenta de negociação e não constitui aconselhamento financeiro nem garante lucros.',link:'Ler divulgação de risco da Deriv'},
  es:{title:'AVISO DE RIESGO',text:'Operar con opciones digitales implica un alto nivel de riesgo. Puede perder todo el importe invertido en una operación. Nunca opere con dinero que no pueda permitirse perder y asegúrese de comprender los riesgos antes de operar.',note:'Izitrader es una herramienta de negociación y no proporciona asesoramiento financiero ni garantiza ganancias.',link:'Leer la divulgación de riesgos de Deriv'}
};
function show(){
  const page=document.getElementById('authPage');
  if(!page||document.getElementById('riskWarning'))return;
  const lang=()=>localStorage.getItem('izitrader_lang')||'en';
  const current=()=>TEXT[lang()]||TEXT.en;
  const box=document.createElement('div');
  box.id='riskWarning';
  const render=()=>{const t=current();box.innerHTML='<div class="risk-icon">⚠</div><div class="risk-title">'+t.title+'</div><div class="risk-text">'+t.text+'</div><div class="risk-note">'+t.note+'</div><a class="risk-link" href="https://deriv.com/risk-disclosure" target="_blank" rel="noopener">'+t.link+'</a>';};
  render();
  box.style.cssText='margin-top:18px;padding:14px 15px;border:1px solid rgba(226,75,74,.55);border-radius:12px;background:rgba(226,75,74,.08);text-align:left;';
  const style=document.createElement('style');
  style.id='riskWarningCss';
  style.textContent='#riskWarning .risk-icon{font-size:20px;line-height:1;margin-bottom:7px}#riskWarning .risk-title{font-size:12px;font-weight:900;letter-spacing:.06em;color:#e24b4a;margin-bottom:6px}#riskWarning .risk-text{font-size:11px;line-height:1.5;color:var(--text)}#riskWarning .risk-note{font-size:10px;line-height:1.45;color:var(--muted);margin-top:7px}#riskWarning .risk-link{display:inline-block;margin-top:8px;font-size:10px;color:#f5c04a;font-weight:800;text-decoration:none}#riskWarning .risk-link:hover{text-decoration:underline}';
  document.head.appendChild(style);
  page.querySelector('.auth-card')?.appendChild(box);
  window.addEventListener('izitrader:language-change',render);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
})();
