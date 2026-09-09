/* React Deriv bridge: real-time ticks + authenticated proposals for the existing bot dropdown. */
(function(){
  const load=(src)=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  async function boot(){
    try{
      if(!window.React) await load('https://unpkg.com/react@18/umd/react.production.min.js');
      if(!window.ReactDOM) await load('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
    }catch(e){console.error('[IziReact] React load failed',e);return}
    const {useCallback,useEffect,useRef,useState}=React;
    const CONTRACT={EVEN:'DIGITEVEN',ODD:'DIGITODD',OVER:'DIGITOVER',UNDER:'DIGITUNDER',RISE:'CALL',FALL:'PUT',DIFFER:'DIGITDIFF',MATCH0:'DIGITMATCH'};
    const symbolMap={R_10:'1HZ10V',R_25:'1HZ25V',R_50:'1HZ50V',R_75:'1HZ75V',R_100:'1HZ100V'};
    const digit=(v,p)=>{const s=String(Number(v).toFixed(p||0));const m=s.match(/\d/g);return m?Number(m[m.length-1]):null};
    const stats=(vals,p)=>{const d=vals.map(v=>digit(v,p)).filter(v=>v!=null),n=d.length||1;let up=0,down=0;for(let i=1;i<vals.length;i++){if(vals[i]>vals[i-1])up++;else if(vals[i]<vals[i-1])down++}const m=Math.max(1,up+down);return{even:d.filter(x=>x%2===0).length/n*100,odd:d.filter(x=>x%2).length/n*100,over:d.filter(x=>x>5).length/n*100,under:d.filter(x=>x<4).length/n*100,diff:d.filter(x=>x!==0).length/n*100,match0:d.filter(x=>x===0).length/n*100,rise:up/m*100,fall:down/m*100}};
    const strategyFor=(name)=>{const n=String(name||'').toUpperCase();if(/RISE|FALL|SUBIR|DESCER/.test(n))return'RISE_FALL';if(/DIFER|DIFF/.test(n))return'DIFERENTE';if(/MATCH/.test(n))return'MATCH0';if(/OVER|UNDER|ACIMA|BAIXO/.test(n))return'ACIMA5_BAIXO4';return'PAR_IMPAR'};
    const signal=(vals,name,p)=>{if(vals.length<5)return null;const s=stats(vals.slice(-5),p),t=65,st=strategyFor(name);if(st==='PAR_IMPAR')return s.even>=t?['EVEN',s.even]:s.odd>=t?['ODD',s.odd]:null;if(st==='ACIMA5_BAIXO4')return s.over>=t?['OVER',s.over]:s.under>=t?['UNDER',s.under]:null;if(st==='RISE_FALL')return s.rise>=t?['RISE',s.rise]:s.fall>=t?['FALL',s.fall]:null;if(st==='DIFERENTE')return s.diff>=t?['DIFFER',s.diff]:null;return s.match0>=30&&s.match0>0?['MATCH0',s.match0]:null};
    function useDerivBot({accountType='demo',symbol='1HZ100V',botName='ProParity',stake=.35}){
      const ws=useRef(null),req=useRef(1000),ticks=useRef([]),lastProposal=useRef(0);
      const [state,setState]=useState({connected:false,authorized:false,tick:null,balance:null,proposal:null,signal:null,error:null});
      const send=useCallback(x=>{if(!ws.current||ws.current.readyState!==WebSocket.OPEN)return false;ws.current.send(JSON.stringify(x));return true},[]);
      const connect=useCallback(async()=>{try{const ar=await fetch('/api/deriv/accounts',{credentials:'same-origin',cache:'no-store'});const aj=await ar.json();if(!ar.ok)throw new Error(aj.error||'Sessão Deriv não autenticada');const accounts=aj.data||aj.accounts||[];const wanted=accountType==='real'?accounts.find(a=>!(a.is_virtual||a.account_type==='demo'||a.type==='demo')):accounts.find(a=>a.is_virtual||a.account_type==='demo'||a.type==='demo');const a=wanted||accounts[0];if(!a)throw new Error('Nenhuma conta Deriv disponível');const id=a.account_id||a.accountId||a.id;const wr=await fetch('/api/deriv/ws-url',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({account_id:id})});const wj=await wr.json();if(!wr.ok||!wj?.data?.url)throw new Error(wj.error||'Não foi possível abrir WebSocket Deriv');if(ws.current)try{ws.current.close()}catch{}const socket=new WebSocket(wj.data.url);ws.current=socket;socket.onopen=()=>{setState(s=>({...s,connected:true,authorized:true,error:null}));socket.send(JSON.stringify({balance:1,subscribe:1,req_id:++req.current}));socket.send(JSON.stringify({ticks:symbol,subscribe:1,req_id:++req.current}))};socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.error){setState(s=>({...s,error:m.error.message}));return}if(m.msg_type==='balance')setState(s=>({...s,balance:m.balance}));if(m.msg_type==='tick'&&m.tick){const q=Number(m.tick.quote);ticks.current=[...ticks.current,q].slice(-100);const sig=signal(ticks.current,botName);setState(s=>({...s,tick:m.tick,signal:sig}))}};socket.onclose=()=>setState(s=>({...s,connected:false,authorized:false}));socket.onerror=()=>setState(s=>({...s,error:'Erro no WebSocket Deriv'}));}catch(e){setState(s=>({...s,error:e.message||'Falha Deriv'}))}},[accountType,symbol,botName]);
      const requestProposal=useCallback(()=>{const s=state.signal;if(!s||Date.now()-lastProposal.current<1500)return false;lastProposal.current=Date.now();const[type]=s;const amount=Math.max(.35,Number(stake)||.35);const barrier=type==='OVER'?5:type==='UNDER'?4:0;return send({proposal:1,req_id:++req.current,amount,basis:'stake',contract_type:CONTRACT[type],currency:'USD',duration:1,duration_unit:'t',underlying_symbol:symbol,barrier:String(barrier)})},[state.signal,stake,symbol,send]);
      useEffect(()=>{connect();return()=>{if(ws.current)try{ws.current.close()}catch{}ws.current=null}},[connect]);
      useEffect(()=>{if(state.signal&&state.connected)requestProposal()},[state.signal,state.connected,requestProposal]);
      useEffect(()=>{const handler=()=>requestProposal();window.addEventListener('izitrader:request-proposal',handler);return()=>window.removeEventListener('izitrader:request-proposal',handler)},[requestProposal]);
      useEffect(()=>{if(state.proposal)window.dispatchEvent(new CustomEvent('izitrader:proposal',{detail:state.proposal}))},[state.proposal]);
      return{...state,requestProposal};
    }
    window.useDerivBot=useDerivBot;
    const rootHost=document.createElement('div');rootHost.id='izi-react-deriv-root';rootHost.style.display='none';document.body.appendChild(rootHost);
    function Bridge(){
      const [bot,setBot]=useState(document.getElementById('selectedBotName')?.textContent?.trim()||'ProParity');
      const [symbol,setSymbol]=useState('1HZ100V');const [account,setAccount]=useState('demo');const [stake,setStake]=useState(.35);
      useEffect(()=>{const id=setInterval(()=>{const b=document.getElementById('selectedBotName');if(b&&b.textContent?.trim())setBot(b.textContent.trim());const sb=document.querySelector('.symbol-dropdown .dropdown-btn');const raw=sb?.textContent?.trim().split(/\s+/)[0];if(raw)setSymbol(symbolMap[raw]||raw);const p=document.querySelector('.stake-value')?.textContent||'';const n=Number(p.replace(/[^0-9.,]/g,'').replace(',','.'));if(Number.isFinite(n)&&n>0)setStake(n);const type=document.querySelector('.pill-demo')?.textContent?.toLowerCase();if(type?.includes('real'))setAccount('real')},500);return()=>clearInterval(id)},[]);
      const d=useDerivBot({accountType:account,symbol,botName:bot,stake});
      useEffect(()=>{const el=document.querySelector('.status');if(el){const dot=el.querySelector('.dot');const text=el.querySelector('#statusText');if(dot)dot.style.background=d.connected?'#35d492':'#f5a623';if(text)text.textContent=d.error||(!d.connected?'A ligar à Deriv…':`Deriv ligada — ${bot} / ticks reais`) }},[d.connected,d.error,bot]);
      useEffect(()=>{if(d.balance?.balance!=null){const el=document.getElementById('balance');if(el)el.textContent=`${Number(d.balance.balance).toFixed(2)} ${d.balance.currency||'USD'}`}},[d.balance]);
      return null;
    }
    fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(session=>{if(session&&session.authenticated)ReactDOM.createRoot(rootHost).render(React.createElement(Bridge))});
  }
  boot();
})();
