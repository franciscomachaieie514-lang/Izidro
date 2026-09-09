/* Izitrader risk warning on the landing page. */
(function(){
'use strict';
function show(){
  const page=document.getElementById('authPage');
  if(!page||document.getElementById('riskWarning'))return;
  const box=document.createElement('div');
  box.id='riskWarning';
  box.innerHTML='<div class="risk-icon">⚠</div><div class="risk-title">AVISO DE RISCO</div><div class="risk-text">Negociar opções digitais envolve um elevado nível de risco. Pode perder todo o valor investido numa operação. Nunca negocie dinheiro que não possa perder e certifique-se de que compreende os riscos antes de operar.</div><div class="risk-note">O Izitrader é uma ferramenta de negociação e não constitui aconselhamento financeiro nem garante lucros.</div><a class="risk-link" href="https://deriv.com/pt/terms-and-conditions/risk-disclosure" target="_blank" rel="noopener">Ler divulgação de risco da Deriv</a>';
  box.style.cssText='margin-top:18px;padding:14px 15px;border:1px solid rgba(226,75,74,.55);border-radius:12px;background:rgba(226,75,74,.08);text-align:left;';
  const style=document.createElement('style');
  style.id='riskWarningCss';
  style.textContent='#riskWarning .risk-icon{font-size:20px;line-height:1;margin-bottom:7px}#riskWarning .risk-title{font-size:12px;font-weight:900;letter-spacing:.06em;color:#e24b4a;margin-bottom:6px}#riskWarning .risk-text{font-size:11px;line-height:1.5;color:var(--text)}#riskWarning .risk-note{font-size:10px;line-height:1.45;color:var(--muted);margin-top:7px}#riskWarning .risk-link{display:inline-block;margin-top:8px;font-size:10px;color:#f5c04a;font-weight:800;text-decoration:none}#riskWarning .risk-link:hover{text-decoration:underline}';
  document.head.appendChild(style);
  page.querySelector('.auth-card')?.appendChild(box);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
})();
