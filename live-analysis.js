(function(){
  const MAX_HISTORY=1000;
  let history=[];
  let windowSize=25;
  let lastEpoch=null;

  const readStoredHistory=()=>{
    try{const raw=sessionStorage.getItem('izitrader_live_digits');if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))history=parsed.filter(n=>Number.isInteger(n)&&n>=0&&n<=9).slice(-MAX_HISTORY);}}catch{}
  };
  const saveHistory=()=>{try{sessionStorage.setItem('izitrader_live_digits',JSON.stringify(history));}catch{}};
  const getNodes=()=>Array.from(document.querySelectorAll('.digit-node'));
  const nodeDigit=node=>{
    if(node.dataset.digit!=null)return Number(node.dataset.digit);
    const direct=Array.from(node.children).find(el=>!el.classList.contains('pct'));
    const text=(direct?direct.textContent:node.textContent).trim();
    const m=text.match(/[0-9]/);return m?Number(m[0]):null;
  };
  const getWindow=()=>history.slice(-windowSize);
  const render=()=>{
    const sample=getWindow();
    const counts=Array(10).fill(0);sample.forEach(d=>counts[d]++);
    const total=sample.length||1;
    getNodes().forEach(node=>{
      const d=nodeDigit(node);if(d==null)return;
      node.dataset.digit=String(d);
      const pct=node.querySelector('.pct');if(pct)pct.textContent=`${(counts[d]/total*100).toFixed(1)}%`;
      node.classList.toggle('active',history.length>0&&history[history.length-1]===d);
    });
    const center=document.querySelector('.center .digit');if(center&&history.length)center.textContent=String(history[history.length-1]);
    const caption=document.querySelector('.center .caption');if(caption)caption.textContent=history.length?`${windowSize} TICKS`:'AGUARDANDO TICKS';
    const btn=document.getElementById('analysisBtn');if(btn)btn.textContent=`${windowSize} TICKS`;
  };
  const addTick=detail=>{
    if(!detail||detail.epoch===lastEpoch)return;
    const quote=Number(detail.quote);if(!Number.isFinite(quote))return;
    lastEpoch=detail.epoch;
    const raw=String(detail.quote);
    const normalized=raw.includes('e')||raw.includes('E')?quote.toFixed(10):raw;
    const digits=normalized.replace(/\D/g,'');if(!digits)return;
    const digit=Number(digits.slice(-1));if(digit<0||digit>9)return;
    history.push(digit);if(history.length>MAX_HISTORY)history=history.slice(-MAX_HISTORY);saveHistory();render();
    window.dispatchEvent(new CustomEvent('izitrader:live-digit',{detail:{digit,quote:detail.quote,epoch:detail.epoch}}));
  };
  const setupWindowMenu=()=>{
    document.querySelectorAll('.analysis-item[data-window]').forEach(item=>item.addEventListener('click',()=>{
      const n=Number(item.dataset.window);if(![25,100,200,500,1000].includes(n))return;
      windowSize=n;
      document.querySelectorAll('.analysis-item[data-window]').forEach(x=>x.classList.toggle('active',x===item));
      const menu=document.getElementById('analysisMenu');if(menu)menu.classList.remove('open');
      render();
    }));
  };
  readStoredHistory();
  window.addEventListener('izitrader:tick',e=>addTick(e.detail));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setupWindowMenu();render();});
  else{setupWindowMenu();render();}
  window.IziLiveAnalysis={getHistory:()=>history.slice(),getWindow:()=>getWindow(),setWindow:n=>{if([25,100,200,500,1000].includes(Number(n))){windowSize=Number(n);render();}}};
})();
