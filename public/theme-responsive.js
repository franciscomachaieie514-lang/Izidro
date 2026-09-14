(function(){
'use strict';
const KEY='izitrader_theme';
const btn=()=>document.getElementById('themeBtn');
function apply(theme){
  const light=theme==='light';
  document.documentElement.dataset.theme=light?'light':'dark';
  localStorage.setItem(KEY,light?'light':'dark');
  const b=btn(); if(b){b.textContent=light?'🌙':'☀️';b.title=light?'Mudar para Dark':'Mudar para Light';b.setAttribute('aria-label',b.title);}
}
function init(){
  if(document.getElementById('iziThemeCss'))return;
  const s=document.createElement('style');s.id='iziThemeCss';
  s.textContent=`
html[data-theme="light"]{--bg:#f3f5f8;--card:#ffffff;--field:#f7f8fb;--text:#172033;--muted:#68748a;--border:#d8dee8;--accent:#e89a00;--green:#159463;--red:#d83b3b}
html[data-theme="light"] body{background:var(--bg);color:var(--text)}
html[data-theme="light"] .auth-card{box-shadow:0 16px 45px rgba(28,42,66,.10)}
html[data-theme="light"] .dropdown-menu,html[data-theme="light"] .symbol-menu,html[data-theme="light"] .analysis-menu,html[data-theme="light"] .target-menu,html[data-theme="light"] .menu{box-shadow:0 12px 28px rgba(28,42,66,.14)}
body{min-height:100vh}
@media (min-width:700px){
  body{padding:28px 24px 90px}
  .app{max-width:1040px}
  .auth-page{max-width:520px}
  .header{margin-bottom:18px}
  .logo{width:44px;height:44px}.brand{font-size:22px}.icon-btn,.sair-btn{height:42px}.icon-btn{width:42px}
  .balance-row{padding:20px}.balance-row .value{font-size:28px}
  .row3{grid-template-columns:1fr 1.7fr .8fr;gap:14px}
  .card{padding:18px;margin-bottom:14px}
  .history-scroll{gap:8px}
  .wheel-wrap{margin:26px 0 22px;padding-top:12px}
  .wheel{width:320px;height:320px}
  .digit-node{width:50px;height:50px;font-size:17px}
  .center .digit{font-size:48px}
  .app>.wheel-wrap .analysis-wrap,.app>.wheel-wrap .target-wrap{top:2px}
  .analysis-btn,.target-btn{font-size:11px}
  .target-menu{width:260px}
  .stake-value{font-size:30px}
  .operate-btn{padding:16px;font-size:16px}
  .symbol-card{margin-bottom:0}
}
@media (min-width:700px) and (max-width:1100px){
  .app{max-width:900px}
}
@media (min-width:1101px){
  .app{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,.65fr);gap:14px 18px;align-items:start}
  .header{grid-column:1 / -1}
  .balance-row{grid-column:1 / -1}
  .row3{grid-column:1 / -1}
  .history-scroll{min-height:34px}
  .status{grid-column:1 / -1;margin:0}
  .wheel-wrap{grid-column:1;grid-row:auto;margin-top:8px}
  .app>.card:not(.balance-row):not(.symbol-card):not(:has(#historyScroll)){grid-column:2}
  .app>.symbol-card{grid-column:2}
}
@media (max-width:699px){
  .app{max-width:100%}
  .row3{grid-template-columns:1fr 1.3fr .75fr;gap:8px}
  .wheel{max-width:78vw;max-height:78vw;width:280px;height:280px}
  .digit-node{width:42px;height:42px}
}
`;
  document.head.appendChild(s);
}
function bind(){const b=btn();if(!b||b.dataset.themeBound)return;b.dataset.themeBound='1';b.addEventListener('click',()=>apply((localStorage.getItem(KEY)||'dark')==='dark'?'light':'dark'));apply(localStorage.getItem(KEY)||'dark');}
init();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.addEventListener('storage',e=>{if(e.key===KEY)apply(e.newValue==='light'?'light':'dark')});
})();
