(()=>{'use strict';
if(window.__iziProfessionalUiV2)return;
window.__iziProfessionalUiV2=true;

const css=
":root{--red:#e24b4a;--accent:#e24b4a}"+
"body{background:var(--bg);color:var(--text)}"+
".dashboard-control-row{width:100%;max-width:700px;margin:0 auto 12px;display:grid;grid-template-columns:minmax(90px,1fr) auto minmax(90px,1fr);align-items:center;gap:12px;position:relative;z-index:50}"+
".dashboard-control-row .analysis-wrap,.dashboard-control-row .target-wrap{position:relative;top:auto;left:auto;right:auto;z-index:51}"+
".dashboard-control-row .analysis-wrap{justify-self:start}"+
".dashboard-control-row .target-wrap{justify-self:end}"+
".dashboard-control-row .status{width:auto!important;min-height:34px;margin:0!important;padding:0 10px;display:flex!important;align-items:center;justify-content:center;white-space:nowrap;text-align:center}"+
".dashboard-control-row .analysis-btn,.dashboard-control-row .target-btn{min-height:36px;display:inline-flex!important;align-items:center;justify-content:center;gap:5px;border:1px solid var(--border);border-radius:10px;background:var(--field);color:var(--text);padding:7px 10px!important;font-size:10px;font-weight:800;line-height:1}"+
".dashboard-control-row .dropdown-chevron{display:inline-block!important;font-size:12px;line-height:1}"+
".dashboard-control-row .analysis-menu{left:0;right:auto;top:calc(100% + 6px)}"+
".dashboard-control-row .target-menu{right:0;left:auto;top:calc(100% + 6px)}"+
".dashboard-center{padding-top:0!important}"+
".wheel-area{position:relative!important;width:min(100%,650px)!important;margin:0 auto!important;display:flex!important;align-items:center!important;justify-content:center!important}"+
".wheel-area>.wheel{position:relative!important;margin:0 auto!important}"+
".dashboard-right .symbol-menu{z-index:1000!important}"+
"@media(max-width:899px){"+
".dashboard-control-row{max-width:none;grid-template-columns:1fr auto 1fr;gap:6px;margin:0 0 10px}"+
".dashboard-control-row .analysis-btn,.dashboard-control-row .target-btn{min-width:72px;min-height:32px;padding:6px 8px!important;font-size:9px}"+
".dashboard-control-row .status{font-size:10px;padding:0 4px;min-width:0}"+
".wheel-area{width:min(100%,430px)!important;aspect-ratio:1}"+
".wheel-area>.wheel{width:100%!important;height:100%!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important}"+
"}"+
"@media(max-width:399px){.dashboard-control-row .analysis-btn,.dashboard-control-row .target-btn{min-width:68px;font-size:8px;padding-inline:7px!important}}";

let style=document.getElementById('iziProfessionalUi');
if(!style){style=document.createElement('style');style.id='iziProfessionalUi';document.head.appendChild(style)}
style.textContent=css;

function alignWheel(){
 const w=document.getElementById('wheel');
 if(!w)return;
 const rect=w.getBoundingClientRect();
 const cx=rect.width/2,cy=rect.height/2;
 const nodes=[...w.querySelectorAll(':scope>.digit-node')];
 if(nodes.length!==10)return;
 const nodeSize=Math.max(36,Math.min(44,rect.width*0.14));
 const radius=Math.max(0,Math.min(rect.width,rect.height)/2-nodeSize/2-14);
 nodes.forEach((n,i)=>{
  const angle=i*Math.PI*2/10-Math.PI/2;
  n.style.width=nodeSize+'px';
  n.style.height=nodeSize+'px';
  n.style.left=(cx+radius*Math.cos(angle)-nodeSize/2)+'px';
  n.style.top=(cy+radius*Math.sin(angle)-nodeSize/2)+'px';
  n.style.transform='none';
  n.style.display='flex';
  n.style.visibility='visible';
  n.style.opacity='1';
 });
 const center=w.querySelector(':scope>.center');
 if(center){center.style.left='50%';center.style.top='50%';center.style.transform='translate(-50%,-50%)'}
}

function applyTheme(){
 const theme=localStorage.getItem('izitrader_theme')==='dark'?'dark':'light';
 document.documentElement.dataset.theme=theme;
 document.body.classList.toggle('dark',theme==='dark');
 document.body.classList.toggle('light',theme!=='dark');
 const b=document.getElementById('themeBtn');
 if(b){b.textContent=theme==='light'?'🌙':'☀️';b.title=theme==='light'?'Dark mode':'Light mode'}
 alignWheel();
}

function boot(){applyTheme();requestAnimationFrame(alignWheel)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('resize',()=>requestAnimationFrame(alignWheel));
window.addEventListener('orientationchange',()=>requestAnimationFrame(alignWheel));
window.addEventListener('storage',e=>{if(e.key==='izitrader_theme')applyTheme()});
window.addEventListener('izitrader:theme-change',applyTheme);
})();