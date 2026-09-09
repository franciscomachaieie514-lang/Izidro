/* React Deriv bridge: authenticated demo-only ticks, proposals, automatic demo buy and contract monitoring. */
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
    function useDerivBot({symbol='1HZ100V',botName='ProParity',stake=.35}){
      const ws=useRef(null),req=useRef(1000),ticks=useRef([]),startBalance=useRef(null),lastTrade=useRef(0),activeRef=useRef(false),proposalRef=useRef(null),contractRef=useRef(null);
      const [state,setState]=useState({connected:false,authorized:false,tick:null,balance:null,pnl:0,proposal:null,contract:null,signal:null,error:null,active:false,buying:false});
      const send=useCallback(x=>{if(!ws.current||ws.current.readyState!==WebSocket.OPEN)return false;ws.current.send(JSON.stringify(x));return true},[]);
      const setActive=useCallback(v=>{activeRef.current=v;setState(s=>({...s,active:v,error:null}));},[]);
      const connect=useCallback(async()=>{try{
        const ar=await fetch('/api/deriv/accounts',{credentials:'same-origin',cache:'no-store'});const aj=await ar.json();
        if(!ar.ok)throw new Error(aj.error||'Sessão Deriv não autenticada');
        const accounts=aj.data||aj.accounts||[];
        const demo=accounts.find(a=>a.is_virtual===true||String(a.account_type||a.type||'').toLowerCase()==='demo'||String(a.account_type||a.type||'').toLowerCase()==='virtual');
        if(!demo)throw new Error('Conta Demo Deriv não encontrada. A operação automática está bloqueada sem conta Demo.');
        const id=demo.account_id||demo.accountId||demo.id;if(!id)throw new Error('ID da conta Demo Deriv não encontrado');
        const wr=await fetch('/api/deriv/ws-url',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({account_id:id})});const wj=await wr.json();
        if(!wr.ok||!wj?.data?.url)throw new Error(wj.error||'Não foi possível abrir WebSocket Demo Deriv');
        if(!String(wj.data.url).includes('/ws/demo'))throw new Error('Proteção: o WebSocket recebido não é de conta Demo.');
        if(ws.current)try{ws.current.close()}catch{}
        const socket=new WebSocket(wj.data.url);ws.current=socket;
        socket.onopen=()=>{setState(s=>({...s,connected:true,authorized:true,error:null}));socket.send(JSON.stringify({balance:1,subscribe:1,req_id:++req.current}));socket.send(JSON.stringify({ticks:symbol,subscribe:1,req_id:++req.current}));window.dispatchEvent(new CustomEvent('izitrader:ws-open',{detail:{socket,demo:true}}));};
        socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return};
          if(m.error){setState(s=>({...s,error:m.error.message||'Erro Deriv'}));return}
          if(m.msg_type==='balance'&&m.balance){const current=Number(m.balance.balance);const balance={balance:current,currency:m.balance.currency||'USD',loginid:m.balance.loginid||null};if(startBalance.current==null)startBalance.current=current;const pnl=current-startBalance.current;setState(s=>({...s,balance,pnl,error:null}));const bel=document.getElementById('balance');if(bel)bel.textContent=`${current.toFixed(2)} ${balance.currency}`;const pel=document.getElementById('pnl');if(pel){pel.textContent=`${pnl>=0?'+':''}${pnl.toFixed(2)} ${balance.currency}`;pel.classList.toggle('profit',pnl>=0);pel.style.color=pnl<0?'#e24b4a':'';}window.dispatchEvent(new CustomEvent('izitrader:balance',{detail:{...balance,pnl}}));}
          if(m.msg_type==='tick'&&m.tick){const q=Number(m.tick.quote);ticks.current=[...ticks.current,q].slice(-100);const sig=signal(ticks.current,botName);setState(s=>({...s,tick:m.tick,signal:sig}));window.dispatchEvent(new CustomEvent('izitrader:tick',{detail:{quote:q,quoteRaw:String(m.tick.quote),epoch:m.tick.epoch,symbol:m.tick.symbol}}));if(activeRef.current&&sig&&!proposalRef.current&&Date.now()-lastTrade.current>1500)requestProposal(sig);}
          if(m.msg_type==='proposal'&&m.proposal){proposalRef.current=m.proposal;setState(s=>({...s,proposal:m.proposal,error:null}));window.dispatchEvent(new CustomEvent('izitrader:proposal',{detail:m.proposal}));if(activeRef.current)buyDemo(m.proposal);}
          if(m.msg_type==='buy'&&m.buy){const c=m.buy.contract_id;contractRef.current=c;setState(s=>({...s,buying:false,contract:m.buy,error:null}));lastTrade.current=Date.now();proposalRef.current=null;window.dispatchEvent(new CustomEvent('izitrader:demo-buy',{detail:m.buy}));if(c)send({proposal_open_contract:1,contract_id:c,subscribe:1,req_id:++req.current});}
          if(m.msg_type==='proposal_open_contract'&&m.proposal_open_contract){const c=m.proposal_open_contract;setState(s=>({...s,contract:c,buying:false,error:null}));if(c.is_sold||c.status==='sold'||c.status==='expired'){contractRef.current=null;window.dispatchEvent(new CustomEvent('izitrader:demo-contract-closed',{detail:c}));}}
        };
        socket.onclose=()=>{setState(s=>({...s,connected:false,authorized:false,buying:false}));window.dispatchEvent(new CustomEvent('izitrader:ws-close'));};socket.onerror=()=>setState(s=>({...s,error:'Erro no WebSocket Demo Deriv'}));
      }catch(e){setState(s=>({...s,error:e.message||'Falha Deriv'}))}},[symbol,botName]);
      const requestProposal=useCallback((forcedSignal)=>{const s=forcedSignal||state.signal;if(!s||!state.connected||proposalRef.current||contractRef.current||Date.now()-lastTrade.current<1500)return false;const[type]=s;const amount=Math.max(.35,Number(stake)||.35);const barrier=type==='OVER'?5:type==='UNDER'?4:0;return send({proposal:1,req_id:++req.current,amount,basis:'stake',contract_type:CONTRACT[type],currency:'USD',duration:1,duration_unit:'t',underlying_symbol:symbol,barrier:String(barrier),subscribe:0})},[state.signal,state.connected,stake,symbol,send]);
      const buyDemo=useCallback((proposal)=>{if(!activeRef.current||!proposal||proposalRef.current!==proposal||state.buying)return false;const id=proposal.id||proposal.proposal_id;if(!id)return false;const price=Number(proposal.ask_price||proposal.display_value||stake);if(!Number.isFinite(price)||price<=0)return false;setState(s=>({...s,buying:true,error:null}));return send({buy:String(id),price,req_id:++req.current})},[send,stake,state.buying]);
      useEffect(()=>{connect();return()=>{activeRef.current=false;if(ws.current)try{ws.current.close()}catch{}ws.current=null}},[connect]);
      return{...state,setActive,requestProposal,buyDemo};
    }
    window.useDerivBot=useDerivBot;
    const rootHost=document.createElement('div');rootHost.id='izi-react-deriv-root';rootHost.style.display='none';document.body.appendChild(rootHost);
    function Bridge(){
      const [bot,setBot]=useState(document.getElementById('selectedBotName')?.textContent?.trim()||'ProParity');const [symbol,setSymbol]=useState('1HZ100V');const [stake,setStake]=useState(.35);
      useEffect(()=>{const id=setInterval(()=>{const b=document.getElementById('selectedBotName');if(b&&b.textContent?.trim())setBot(b.textContent.trim());const sb=document.querySelector('.symbol-dropdown .dropdown-btn');const raw=sb?.textContent?.trim().split(/\s+/)[0];if(raw)setSymbol(symbolMap[raw]||raw);const p=document.querySelector('.stake-value')?.textContent||'';const n=Number(p.replace(/[^0-9.,]/g,'').replace(',','.'));if(Number.isFinite(n)&&n>0)setStake(n)},500);return()=>clearInterval(id)},[]);
      const d=useDerivBot({symbol,botName:bot,stake});
      useEffect(()=>{const el=document.querySelector('.status');if(el){const dot=el.querySelector('.dot');const text=el.querySelector('#statusText');if(dot)dot.style.background=d.connected?'#35d492':'#f5a623';if(text)text.textContent=d.error||(!d.connected?'A ligar à Demo Deriv…':d.active?(d.buying?'A comprar Demo…':d.contract&&!d.contract.is_sold?'Robô Demo ativo — contrato aberto':'Robô Demo ativo — a aguardar sinal'):`Demo Deriv ligada — ${bot}`)}},[d.connected,d.error,d.active,d.buying,d.contract,bot]);
      useEffect(()=>{const btn=document.querySelector('.operate-btn');if(!btn)return;btn.textContent=d.active?'PARAR ROBÔ DEMO':'INICIAR ROBÔ DEMO';const handler=()=>{if(!d.connected){alert('Aguardando ligação à conta Demo Deriv.');return}if(d.active){d.setActive(false);btn.textContent='INICIAR ROBÔ DEMO';return}d.setActive(true);btn.textContent='PARAR ROBÔ DEMO'};btn.addEventListener('click',handler);return()=>btn.removeEventListener('click',handler)},[d.connected,d.active,d.setActive]);
      useEffect(()=>{if(d.balance?.balance!=null){const el=document.getElementById('balance');if(el)el.textContent=`${Number(d.balance.balance).toFixed(2)} ${d.balance.currency||'USD'}`;const pel=document.getElementById('pnl');if(pel){const p=Number(d.pnl||0);pel.textContent=`${p>=0?'+':''}${p.toFixed(2)} ${d.balance.currency||'USD'}`;pel.style.color=p<0?'#e24b4a':''}}},[d.balance,d.pnl]);
      useEffect(()=>{const onBuy=e=>{const h=document.getElementById('historyScroll');if(h){const c=e.detail||{};const item=document.createElement('div');item.className='history-item';item.innerHTML=`<div class="bot">${bot} • DEMO</div><div class="digit-row"><span class="digit">${c.contract_id||'—'}</span><span class="result">ABERTO</span></div><div class="time">${new Date().toLocaleTimeString()}</div>`;h.prepend(item);}};window.addEventListener('izitrader:demo-buy',onBuy);return()=>window.removeEventListener('izitrader:demo-buy',onBuy)},[bot]);
      return null;
    }
    fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(session=>{if(session&&session.authenticated)ReactDOM.createRoot(rootHost).render(React.createElement(Bridge))});
  }
  boot();
})();
