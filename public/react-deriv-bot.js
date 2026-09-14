/* Izitrader — Deriv realtime bridge
 * Arquitetura: OAuth -> /api/deriv/ws-url -> WebSocket autenticado -> ticks/balance/contracts.
 * Nenhum access token é exposto ao browser.
 */
(function(){
  const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
  async function boot(){
    try{
      if(!window.React)await load('https://unpkg.com/react@18/umd/react.production.min.js');
      if(!window.ReactDOM)await load('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
    }catch(e){console.error('[IziReact] React load failed',e);return}
    const {useCallback,useEffect,useRef,useState}=React;
    const symbols={R_10:'R_10',R_25:'R_25',R_50:'R_50',R_75:'R_75',R_100:'R_100'};
    const contracts={EVEN:'DIGITEVEN',ODD:'DIGITODD',OVER:'DIGITOVER',UNDER:'DIGITUNDER',RISE:'CALL',FALL:'PUT',DIFFER:'DIGITDIFF',MATCH0:'DIGITMATCH'};
    const isReal=a=>String(a?.account_type||a?.type||'').toLowerCase()==='real'||a?.is_virtual===false;
    const isDemo=a=>String(a?.account_type||a?.type||'').toLowerCase()==='demo'||a?.is_virtual===true;
    const accountId=a=>a?.account_id||a?.accountId||a?.id||a?.loginid;
    const digit=(quote,pipSize)=>{const n=Number(quote);if(!Number.isFinite(n))return null;const decimals=Number.isInteger(Number(pipSize))?Number(pipSize):2;const text=n.toFixed(Math.max(0,Math.min(10,decimals)));const m=text.match(/(\d)$/);return m?Number(m[1]):null};
    const strategy=name=>{const n=String(name||'').toUpperCase();if(/RISE|FALL|SUBIR|DESCER/.test(n))return'RISE_FALL';if(/DIFER|DIFF/.test(n))return'DIFF';if(/MATCH/.test(n))return'MATCH';if(/OVER|UNDER|ACIMA|BAIXO/.test(n))return'OVER_UNDER';return'EVEN_ODD'};
    const signal=(ticks,name)=>{
      if(ticks.length<5)return null;
      const v=ticks.slice(-5),d=v.map(x=>digit(x.quote,x.pip_size)).filter(x=>x!==null),n=d.length;if(n<5)return null;
      const s=strategy(name);
      if(s==='EVEN_ODD'){const e=d.filter(x=>x%2===0).length/n*100,o=d.filter(x=>x%2!==0).length/n*100;return e>=65?['EVEN',e]:o>=65?['ODD',o]:null}
      if(s==='OVER_UNDER'){const o=d.filter(x=>x>5).length/n*100,u=d.filter(x=>x<4).length/n*100;return o>=65?['OVER',o]:u>=65?['UNDER',u]:null}
      if(s==='DIFF'){const x=d.filter(x=>x!==0).length/n*100;return x>=65?['DIFFER',x]:null}
      if(s==='MATCH'){const x=d.filter(x=>x===0).length/n*100;return x>=65?['MATCH0',x]:null}
      let up=0,down=0;for(let i=1;i<v.length;i++){if(Number(v[i].quote)>Number(v[i-1].quote))up++;else if(Number(v[i].quote)<Number(v[i-1].quote))down++}
      const total=up+down||1;return up/total*100>=65?['RISE',up/total*100]:down/total*100>=65?['FALL',down/total*100]:null;
    };
    function useDeriv({symbol,botName,stake,accountType}){
      const wsRef=useRef(null),ticksRef=useRef([]),reqRef=useRef(1000),accountRef=useRef(null),contractRef=useRef(null),contractSubRef=useRef(null),proposalRef=useRef(null),buyingRef=useRef(false),activeRef=useRef(false),timerRef=useRef(null),delayRef=useRef(1000),stoppedRef=useRef(false),pnlRef=useRef(0);
      const [state,setState]=useState({connected:false,authorized:false,account:null,balance:null,pnl:0,tick:null,signal:null,contract:null,active:false,buying:false,error:null});
      const send=useCallback(msg=>{const ws=wsRef.current;if(!ws||ws.readyState!==WebSocket.OPEN)return false;ws.send(JSON.stringify(msg));return true},[]);
      const setActive=useCallback(on=>{on=Boolean(on);if(on&&accountType==='real'&&!window.confirm('ATENÇÃO: isto permite COMPRAS REAIS na sua conta Deriv. Deseja continuar?'))return false;activeRef.current=on;setState(s=>({...s,active:on,error:null}));return true},[accountType]);
      const forget=useCallback(()=>{if(contractSubRef.current)send({forget:contractSubRef.current});contractSubRef.current=null},[send]);
      const proposal=useCallback(sig=>{
        if(!activeRef.current||proposalRef.current||contractRef.current||buyingRef.current||!sig)return;
        const type=sig[0],ct=contracts[type];if(!ct)return;
        const amount=Math.max(.35,Number(stake)||.35);
        const p={proposal:1,req_id:++reqRef.current,amount,basis:'stake',contract_type:ct,currency:'USD',duration:1,duration_unit:'t',underlying_symbol:symbol};
        if(type==='OVER')p.barrier='5';if(type==='UNDER')p.barrier='4';if(type==='DIFFER'||type==='MATCH0')p.barrier='0';
        send(p);
      },[send,stake,symbol]);
      const buy=useCallback(p=>{
        if(!activeRef.current||!p||proposalRef.current!==p||buyingRef.current)return;
        const id=p.id||p.proposal_id,price=Number(p.ask_price||p.display_value);
        if(!id||!Number.isFinite(price)||price<=0){setState(s=>({...s,error:'Proposal inválida para BUY'}));return}
        buyingRef.current=true;setState(s=>({...s,buying:true,error:null}));send({buy:String(id),price,req_id:++reqRef.current});
      },[send]);
      const connect=useCallback(async()=>{
        if(stoppedRef.current||wsRef.current)return;
        try{
          const ar=await fetch('/api/deriv/accounts',{credentials:'same-origin',cache:'no-store'}),aj=await ar.json();
          if(!ar.ok)throw new Error(aj.error||'Sessão Deriv não autenticada');
          const accounts=Array.isArray(aj.accounts)?aj.accounts:(Array.isArray(aj.data)?aj.data:[]);
          const account=accountType==='real'?accounts.find(isReal):accounts.find(isDemo);
          if(!account)throw new Error(`Conta ${accountType==='real'?'Real':'Demo'} não encontrada.`);
          const id=accountId(account);if(!id)throw new Error('ID da conta Deriv não encontrado.');accountRef.current=account;
          const wr=await fetch(`/api/deriv/ws-url?account_id=${encodeURIComponent(id)}`,{credentials:'same-origin',cache:'no-store'}),wj=await wr.json();
          if(!wr.ok)throw new Error(wj.error||'Falha ao obter wsUrl autenticada');
          const wsUrl=wj?.data?.url||wj?.wsUrl;if(!wsUrl)throw new Error('Deriv não devolveu wsUrl.');
          if(stoppedRef.current)return;const ws=new WebSocket(wsUrl);wsRef.current=ws;
          ws.onopen=()=>{delayRef.current=1000;setState(s=>({...s,connected:true,authorized:true,account,error:null}));send({balance:1,subscribe:1,req_id:++reqRef.current});send({ticks:symbol,subscribe:1,req_id:++reqRef.current});send({contracts_for:symbol,req_id:++reqRef.current});window.dispatchEvent(new CustomEvent('izitrader:ws-open',{detail:{accountType,accountId:id}}))};
          ws.onmessage=e=>{
            let m;try{m=JSON.parse(e.data)}catch{return}
            if(m.error){buyingRef.current=false;setState(s=>({...s,buying:false,error:m.error.message||'Erro Deriv'}));window.dispatchEvent(new CustomEvent('izitrader:deriv-error',{detail:m.error}));return}
            if(m.msg_type==='balance'&&m.balance){const b={balance:Number(m.balance.balance),currency:m.balance.currency||'USD',loginid:m.balance.loginid};setState(s=>({...s,balance:b,error:null}));const el=document.getElementById('balance');if(el)el.textContent=`${b.currency==='USD'?'$':b.currency+' '}${b.balance.toFixed(2)}`;window.dispatchEvent(new CustomEvent('izitrader:balance',{detail:b}))}
            if(m.msg_type==='tick'&&m.tick){ticksRef.current=[...ticksRef.current,m.tick].slice(-10);const sig=signal(ticksRef.current,botName);setState(s=>({...s,tick:m.tick,signal:sig,error:null}));window.dispatchEvent(new CustomEvent('izitrader:tick',{detail:{quote:m.tick.quote,quoteRaw:String(m.tick.quote),epoch:m.tick.epoch,symbol:m.tick.symbol,pip_size:m.tick.pip_size}}));if(sig)proposal(sig)}
            if(m.msg_type==='proposal'&&m.proposal){proposalRef.current=m.proposal;setState(s=>({...s,proposal:m.proposal,error:null}));if(activeRef.current)buy(m.proposal)}
            if(m.msg_type==='buy'&&m.buy){const id=Number(m.buy.contract_id);buyingRef.current=false;proposalRef.current=null;contractRef.current=id;setState(s=>({...s,buying:false,proposal:null,contract:m.buy,error:null}));window.dispatchEvent(new CustomEvent('izitrader:buy',{detail:{...m.buy,accountType}}));if(Number.isFinite(id)&&id>0)send({proposal_open_contract:1,contract_id:id,subscribe:1,req_id:++reqRef.current})}
            if(m.msg_type==='proposal_open_contract'&&m.proposal_open_contract){const c=m.proposal_open_contract;setState(s=>({...s,contract:c,buying:false,error:null}));if(m.subscription?.id)contractSubRef.current=String(m.subscription.id);if(c.is_sold||['sold','won','lost','expired'].includes(String(c.status||'').toLowerCase())){const id=Number(c.contract_id),profit=Number(c.profit_loss);if(Number.isFinite(profit))pnlRef.current+=profit;setState(s=>({...s,pnl:pnlRef.current,contract:c}));window.dispatchEvent(new CustomEvent('izitrader:contract-closed',{detail:{...c,result:String(c.status||'').toUpperCase(),profit_loss:profit,accountType}}));if(contractRef.current===id)contractRef.current=null;forget()}}
          };
          ws.onclose=()=>{wsRef.current=null;setState(s=>({...s,connected:false,authorized:false,buying:false}));buyingRef.current=false;proposalRef.current=null;contractRef.current=null;forget();if(!stoppedRef.current){const d=delayRef.current;delayRef.current=Math.min(d*2,10000);clearTimeout(timerRef.current);timerRef.current=setTimeout(connect,d)}};
          ws.onerror=()=>setState(s=>({...s,error:`Erro no WebSocket ${accountType==='real'?'Real':'Demo'}`}));
        }catch(e){if(stoppedRef.current)return;setState(s=>({...s,connected:false,authorized:false,error:e.message||'Falha na ligação Deriv'}));const d=delayRef.current;delayRef.current=Math.min(d*2,10000);clearTimeout(timerRef.current);timerRef.current=setTimeout(connect,d)}
      },[accountType,botName,symbol,send,proposal,buy,forget]);
      useEffect(()=>{stoppedRef.current=false;pnlRef.current=0;connect();return()=>{stoppedRef.current=true;clearTimeout(timerRef.current);activeRef.current=false;forget();if(wsRef.current)try{wsRef.current.close()}catch{}wsRef.current=null}},[connect,forget]);
      return {...state,setActive};
    }
    window.useDeriv=useDeriv;
    window.useDerivBot=useDeriv;
    const root=document.createElement('div');root.id='izi-react-deriv-root';root.style.display='none';document.body.appendChild(root);
    function Bridge(){
      const [bot,setBot]=useState('ProParity'),[symbol,setSymbol]=useState('R_100'),[stake,setStake]=useState(.35),[accountType,setAccountType]=useState(localStorage.getItem('izitrader_account_type')||'real');
      useEffect(()=>{const t=setInterval(()=>{const b=document.getElementById('selectedBotName');if(b?.textContent?.trim())setBot(b.textContent.trim());const s=document.querySelector('.symbol-dropdown .dropdown-btn')?.textContent?.trim().split(/\s+/)[0];if(s)setSymbol(symbols[s]||s);const raw=document.querySelector('.stake-value')?.textContent||'';const n=Number(raw.replace(/[^0-9.,]/g,'').replace(',','.'));if(Number.isFinite(n)&&n>0)setStake(Math.max(.35,n))},400);return()=>clearInterval(t)},[]);
      const d=useDeriv({symbol,botName:bot,stake,accountType});
      useEffect(()=>{const pill=document.querySelector('.pill-demo');if(!pill)return;let sel=document.getElementById('iziAccountSelect');if(!sel){pill.style.display='none';sel=document.createElement('select');sel.id='iziAccountSelect';sel.style.cssText='width:100%;background:var(--field);border:1px solid var(--border);border-radius:12px;padding:12px;color:var(--text);font-weight:700;font-size:14px;outline:none';sel.innerHTML='<option value="real">Real</option><option value="demo">Demo</option>';pill.parentElement.appendChild(sel)}sel.value=accountType;sel.onchange=()=>{d.setActive(false);localStorage.setItem('izitrader_account_type',sel.value);setAccountType(sel.value)}},[accountType,d.setActive]);
      useEffect(()=>{const status=document.getElementById('statusText'),dot=document.querySelector('.status .dot');if(dot)dot.style.background=d.connected?'#35d492':'#f5a623';if(status)status.textContent=d.error||(!d.connected?`A ligar à conta ${accountType==='real'?'Real':'Demo'}…`:`${accountType==='real'?'Conta Real':'Conta Demo'} ligada — ${bot}`)},[d.connected,d.error,accountType,bot]);
      useEffect(()=>{const b=document.getElementById('balance');if(d.balance&&b)b.textContent=`${d.balance.currency==='USD'?'$':d.balance.currency+' '}${Number(d.balance.balance).toFixed(2)}`;const p=document.getElementById('pnl');if(p){const n=Number(d.pnl||0);p.textContent=`${n>=0?'+':''}$${n.toFixed(2)}`;p.style.color=n<0?'#e24b4a':''}},[d.balance,d.pnl]);
      useEffect(()=>{const btn=document.querySelector('.operate-btn');if(!btn)return;btn.textContent=d.active?(accountType==='real'?'PARAR ROBÔ REAL':'PARAR ROBÔ DEMO'):(accountType==='real'?'INICIAR ROBÔ REAL':'INICIAR ROBÔ DEMO');btn.disabled=!d.connected;const fn=()=>d.connected&&d.setActive(!d.active);btn.addEventListener('click',fn);return()=>btn.removeEventListener('click',fn)},[d.connected,d.active,d.setActive,accountType]);
      useEffect(()=>{const h=document.getElementById('historyScroll');if(!h)return;const buy=e=>{const c=e.detail||{},item=document.createElement('div');item.className='history-item';item.dataset.contractId=String(c.contract_id||'');item.innerHTML=`<div class="bot">${bot} • ${String(c.accountType||accountType).toUpperCase()}</div><div class="digit-row"><span class="digit">${c.contract_id||'—'}</span><span class="result">ABERTO</span></div><div class="time">${new Date().toLocaleTimeString()}</div>`;h.prepend(item);while(h.children.length>20)h.lastElementChild.remove()};const closed=e=>{const c=e.detail||{},item=[...h.children].find(x=>x.dataset.contractId===String(c.contract_id||''));if(!item)return;const r=item.querySelector('.result'),st=String(c.result||'').toUpperCase();if(r){r.textContent=st==='WON'?'WIN':st==='LOST'?'LOSS':'FECHADO';r.className='result '+(st==='WON'?'win':st==='LOST'?'loss':'')}if(Number.isFinite(Number(c.profit_loss))){const s=document.createElement('span');s.style.marginLeft='6px';s.textContent=`${Number(c.profit_loss)>=0?'+':''}$${Number(c.profit_loss).toFixed(2)}`;item.querySelector('.digit-row').appendChild(s)}};window.addEventListener('izitrader:buy',buy);window.addEventListener('izitrader:contract-closed',closed);return()=>{window.removeEventListener('izitrader:buy',buy);window.removeEventListener('izitrader:contract-closed',closed)}},[bot,accountType]);
      return null;
    }
    fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(s=>{if(s?.authenticated)ReactDOM.createRoot(root).render(React.createElement(Bridge))}).catch(e=>console.error('[IziReact] session check',e));
  }
  boot();
})();
