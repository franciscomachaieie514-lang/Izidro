/* Izitrader React/Deriv bridge — Demo only. Architecture follows Matos: one WS, ticks -> proposal -> buy -> contract monitoring. */
(function(){
  const load=src=>new Promise((ok,bad)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=bad;document.head.appendChild(s)});
  async function boot(){
    try{if(!window.React)await load('https://unpkg.com/react@18/umd/react.production.min.js');if(!window.ReactDOM)await load('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js')}catch(e){console.error('[IziReact]',e);return}
    const {useCallback,useEffect,useRef,useState}=React;
    const symbols={R_10:'1HZ10V',R_25:'1HZ25V',R_50:'1HZ50V',R_75:'1HZ75V',R_100:'1HZ100V'};
    const contracts={EVEN:'DIGITEVEN',ODD:'DIGITODD',OVER:'DIGITOVER',UNDER:'DIGITUNDER',RISE:'CALL',FALL:'PUT',DIFFER:'DIGITDIFF',MATCH0:'DIGITMATCH'};
    const lastDigit=v=>{const m=String(v).match(/\d/g);return m?Number(m[m.length-1]):null};
    const strategy=name=>{const n=String(name||'').toUpperCase();if(/RISE|FALL|SUBIR|DESCER/.test(n))return'RISE_FALL';if(/DIFER|DIFF/.test(n))return'DIFF';if(/MATCH/.test(n))return'MATCH';if(/OVER|UNDER|ACIMA|BAIXO/.test(n))return'OVER_UNDER';return'EVEN_ODD'};
    const getSignal=(values,name)=>{if(values.length<5)return null;const v=values.slice(-5),d=v.map(lastDigit).filter(x=>x!==null),n=d.length||1,s=strategy(name);if(s==='EVEN_ODD'){const e=d.filter(x=>x%2===0).length/n*100,o=d.filter(x=>x%2).length/n*100;return e>=65?['EVEN',e]:o>=65?['ODD',o]:null}if(s==='OVER_UNDER'){const o=d.filter(x=>x>5).length/n*100,u=d.filter(x=>x<4).length/n*100;return o>=65?['OVER',o]:u>=65?['UNDER',u]:null}if(s==='DIFF'){const x=d.filter(x=>x!==0).length/n*100;return x>=65?['DIFFER',x]:null}if(s==='MATCH'){const x=d.filter(x=>x===0).length/n*100;return x>=65?['MATCH0',x]:null}let up=0,down=0;for(let i=1;i<v.length;i++){if(v[i]>v[i-1])up++;else if(v[i]<v[i-1])down++}const total=up+down||1;return up/total*100>=65?['RISE',up/total*100]:down/total*100>=65?['FALL',down/total*100]:null};
    function useDerivBot({symbol,botName,stake}){
      const wsRef=useRef(null),symbolRef=useRef(symbol),botRef=useRef(botName),stakeRef=useRef(stake),ticksRef=useRef([]),reqRef=useRef(1000),proposalRef=useRef(null),contractRef=useRef(null),activeRef=useRef(false),buyingRef=useRef(false),lastTradeRef=useRef(0),startBalanceRef=useRef(null);
      const [state,setState]=useState({connected:false,authorized:false,balance:null,pnl:0,tick:null,signal:null,proposal:null,contract:null,active:false,buying:false,error:null});
      useEffect(()=>{symbolRef.current=symbol;botRef.current=botName;stakeRef.current=stake},[symbol,botName,stake]);
      const send=useCallback(payload=>{const ws=wsRef.current;if(!ws||ws.readyState!==WebSocket.OPEN)return false;try{ws.send(JSON.stringify(payload));return true}catch{return false}},[]);
      const setActive=useCallback(v=>{activeRef.current=Boolean(v);setState(s=>({...s,active:Boolean(v),error:null}))},[]);
      const subscribeTicks=useCallback(symbol=>send({ticks:symbol,subscribe:1,req_id:++reqRef.current}),[send]);
      const requestProposal=useCallback(sig=>{if(!sig||!activeRef.current||proposalRef.current||contractRef.current||buyingRef.current||Date.now()-lastTradeRef.current<1500)return false;const[type]=sig,amount=Math.max(.35,Number(stakeRef.current)||.35);const p={proposal:1,req_id:++reqRef.current,amount,basis:'stake',contract_type:contracts[type],currency:'USD',duration:1,duration_unit:'t',underlying_symbol:symbolRef.current};if(['OVER','UNDER','DIFFER','MATCH0'].includes(type))p.barrier=String(type==='OVER'?5:type==='UNDER'?4:0);return send(p)},[send]);
      const buyDemo=useCallback(proposal=>{if(!activeRef.current||!proposal||proposalRef.current!==proposal||buyingRef.current)return false;const id=proposal.id||proposal.proposal_id,price=Number(proposal.ask_price);if(!id||!Number.isFinite(price)||price<=0){setState(s=>({...s,error:'Proposal Demo inválida para BUY'}));return false}buyingRef.current=true;setState(s=>({...s,buying:true,error:null}));return send({buy:String(id),price,req_id:++reqRef.current})},[send]);
      useEffect(()=>{
        let cancelled=false;
        const connect=async()=>{try{
          setState(s=>({...s,error:null}));
          const ar=await fetch('/api/deriv/accounts',{credentials:'same-origin',cache:'no-store'}),aj=await ar.json();if(!ar.ok)throw new Error(aj.error||'Sessão Deriv não autenticada');
          const accounts=aj.data||aj.accounts||[],demo=accounts.find(a=>a.is_virtual===true||String(a.is_virtual).toLowerCase()==='true'||/demo|virtual/i.test(String(a.account_type||a.type||'')));if(!demo)throw new Error('Conta Demo Deriv não encontrada.');
          const accountId=demo.account_id||demo.accountId||demo.id;if(!accountId)throw new Error('ID da conta Demo não encontrado.');
          const wr=await fetch('/api/deriv/ws-url',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({account_id:accountId})}),wj=await wr.json();if(!wr.ok)throw new Error(wj.error||'Não foi possível criar a sessão WebSocket Demo.');
          const wsUrl=wj?.data?.url||wj?.wsUrl||wj?.url;if(!wsUrl)throw new Error('URL WebSocket Demo não recebida.');if(cancelled)return;
          const ws=new WebSocket(wsUrl);wsRef.current=ws;
          ws.onopen=()=>{if(cancelled)return;setState(s=>({...s,connected:true,authorized:true,error:null}));send({balance:1,subscribe:1,req_id:++reqRef.current});subscribeTicks(symbolRef.current);window.dispatchEvent(new CustomEvent('izitrader:ws-open',{detail:{socket:ws,demo:true,accountId}}))};
          ws.onmessage=event=>{let m;try{m=JSON.parse(event.data)}catch{return};
            if(m.error){if(m.echo_req?.buy)buyingRef.current=false;setState(s=>({...s,buying:false,error:m.error.message||'Erro Deriv'}));return}
            if(m.msg_type==='balance'&&m.balance){const b={balance:Number(m.balance.balance),currency:m.balance.currency||'USD',loginid:m.balance.loginid};if(startBalanceRef.current===null)startBalanceRef.current=b.balance;const pnl=b.balance-startBalanceRef.current;setState(s=>({...s,balance:b,pnl,error:null}));const be=document.getElementById('balance');if(be)be.textContent=`${b.balance.toFixed(2)} ${b.currency}`;const pe=document.getElementById('pnl');if(pe){pe.textContent=`${pnl>=0?'+':''}${pnl.toFixed(2)} ${b.currency}`;pe.style.color=pnl<0?'#e24b4a':''}window.dispatchEvent(new CustomEvent('izitrader:balance',{detail:{...b,pnl}}))}
            if(m.msg_type==='tick'&&m.tick){const q=Number(m.tick.quote);ticksRef.current=[...ticksRef.current,q].slice(-100);const sig=getSignal(ticksRef.current,botRef.current);setState(s=>({...s,tick:m.tick,signal:sig}));window.dispatchEvent(new CustomEvent('izitrader:tick',{detail:{quote:q,quoteRaw:String(m.tick.quote),epoch:m.tick.epoch,symbol:m.tick.symbol}}));if(activeRef.current&&sig)requestProposal(sig)}
            if(m.msg_type==='proposal'&&m.proposal){proposalRef.current=m.proposal;setState(s=>({...s,proposal:m.proposal,error:null}));window.dispatchEvent(new CustomEvent('izitrader:proposal',{detail:m.proposal}));if(activeRef.current)buyDemo(m.proposal)}
            if(m.msg_type==='buy'&&m.buy){const id=Number(m.buy.contract_id);buyingRef.current=false;proposalRef.current=null;contractRef.current=id;lastTradeRef.current=Date.now();setState(s=>({...s,buying:false,proposal:null,contract:m.buy,error:null}));window.dispatchEvent(new CustomEvent('izitrader:demo-buy',{detail:m.buy}));if(Number.isFinite(id)&&id>0)send({proposal_open_contract:1,contract_id:id,subscribe:1,req_id:++reqRef.current})}
            if(m.msg_type==='proposal_open_contract'&&m.proposal_open_contract){const c=m.proposal_open_contract;setState(s=>({...s,contract:c,buying:false,error:null}));if(c.is_sold||c.status==='sold'||c.status==='won'||c.status==='lost'||c.status==='expired'){const id=Number(c.contract_id);if(contractRef.current===id)contractRef.current=null;window.dispatchEvent(new CustomEvent('izitrader:demo-contract-closed',{detail:c}))}}
          };
          ws.onclose=()=>{setState(s=>({...s,connected:false,authorized:false,buying:false}));buyingRef.current=false;window.dispatchEvent(new CustomEvent('izitrader:ws-close'))};ws.onerror=()=>setState(s=>({...s,error:'Erro no WebSocket Demo Deriv'}));
        }catch(e){if(!cancelled)setState(s=>({...s,error:e.message||'Falha na ligação Demo'}))}};
        connect();
        return()=>{cancelled=true;activeRef.current=false;buyingRef.current=false;proposalRef.current=null;contractRef.current=null;if(wsRef.current)try{wsRef.current.close()}catch{}wsRef.current=null};
      },[]);
      useEffect(()=>{if(state.connected)subscribeTicks(symbol)},[symbol,state.connected,subscribeTicks]);
      return {...state,setActive,requestProposal,buyDemo};
    }
    window.useDerivBot=useDerivBot;
    const host=document.createElement('div');host.id='izi-react-deriv-root';host.style.display='none';document.body.appendChild(host);
    function Bridge(){
      const [bot,setBot]=useState(document.getElementById('selectedBotName')?.textContent?.trim()||'ProParity'),[symbol,setSymbol]=useState('1HZ100V'),[stake,setStake]=useState(.35);
      useEffect(()=>{const timer=setInterval(()=>{const b=document.getElementById('selectedBotName');if(b?.textContent?.trim())setBot(b.textContent.trim());const sb=document.querySelector('.symbol-dropdown .dropdown-btn'),raw=sb?.textContent?.trim().split(/\s+/)[0];if(raw)setSymbol(symbols[raw]||raw);const sv=document.querySelector('.stake-value')?.textContent||'';const n=Number(sv.replace(/[^0-9.,]/g,'').replace(',','.'));if(Number.isFinite(n)&&n>0)setStake(Math.max(.35,n))},400);return()=>clearInterval(timer)},[]);
      const d=useDerivBot({symbol,botName:bot,stake});
      useEffect(()=>{const s=document.querySelector('.status');if(!s)return;const dot=s.querySelector('.dot'),text=s.querySelector('#statusText');if(dot)dot.style.background=d.connected?'#35d492':'#f5a623';if(text)text.textContent=d.error||(!d.connected?'A ligar à Demo Deriv…':d.active?(d.buying?'A comprar Demo…':d.contract&&!d.contract.is_sold?'Robô Demo ativo — contrato aberto':'Robô Demo ativo — a aguardar sinal'):`Demo Deriv ligada — ${bot}`)},[d.connected,d.error,d.active,d.buying,d.contract,bot]);
      useEffect(()=>{const btn=document.querySelector('.operate-btn');if(!btn)return;btn.textContent=d.active?'PARAR ROBÔ DEMO':'INICIAR ROBÔ DEMO';const click=()=>{if(!d.connected){alert('Aguarde a ligação à conta Demo Deriv.');return}d.setActive(!d.active)};btn.addEventListener('click',click);return()=>btn.removeEventListener('click',click)},[d.connected,d.active,d.setActive]);
      useEffect(()=>{if(!d.balance)return;const be=document.getElementById('balance');if(be)be.textContent=`${Number(d.balance.balance).toFixed(2)} ${d.balance.currency||'USD'}`;const pe=document.getElementById('pnl');if(pe){const p=Number(d.pnl||0);pe.textContent=`${p>=0?'+':''}${p.toFixed(2)} ${d.balance.currency||'USD'}`;pe.style.color=p<0?'#e24b4a':''}},[d.balance,d.pnl]);
      useEffect(()=>{const onBuy=e=>{const h=document.getElementById('historyScroll'),c=e.detail||{};if(!h)return;const item=document.createElement('div');item.className='history-item';item.innerHTML=`<div class="bot">${bot} • DEMO</div><div class="digit-row"><span class="digit">${c.contract_id||'—'}</span><span class="result">ABERTO</span></div><div class="time">${new Date().toLocaleTimeString()}</div>`;h.prepend(item)};window.addEventListener('izitrader:demo-buy',onBuy);return()=>window.removeEventListener('izitrader:demo-buy',onBuy)},[bot]);
      return null;
    }
    fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(s=>{if(s?.authenticated)ReactDOM.createRoot(host).render(React.createElement(Bridge))});
  }
  boot();
})();
