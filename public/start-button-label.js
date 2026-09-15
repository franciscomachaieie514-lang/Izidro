/* Izitrader Start button — keep the action label independent from account type. */
(function(){
  'use strict';
  if(window.__iziStartButtonLabel)return;
  window.__iziStartButtonLabel=true;

  function normalize(){
    const button=document.querySelector('.operate-btn');
    if(!button)return;
    const raw=String(button.textContent||'').trim();
    if(/^(STOP|PARAR)/i.test(raw)){
      button.textContent='STOP BOT';
      return;
    }
    button.textContent='START BOT';
  }

  function install(){
    normalize();
    const button=document.querySelector('.operate-btn');
    if(button&&!button.dataset.iziStartLabelObserver){
      button.dataset.iziStartLabelObserver='1';
      const observer=new MutationObserver(normalize);
      observer.observe(button,{childList:true,characterData:true,subtree:true});
    }
    window.addEventListener('izitrader:ws-open',normalize);
    window.addEventListener('izitrader:account-label-ready',normalize);
    window.addEventListener('izitrader:language-change',normalize);
    window.addEventListener('izitrader:robot-start',()=>{const b=document.querySelector('.operate-btn');if(b)b.textContent='STOP BOT'});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
