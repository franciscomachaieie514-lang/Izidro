(function(){
  const DEFAULT_STAKE=0.35;
  let ws=null;
  let reqId=100;
  const pending=new Map();
  const symbolMap={R_100:'1HZ100V',R_75:'1HZ75V',R_50:'1HZ50V',R_25:'1HZ25V',R_10:'1HZ10V'};

  function ui(){
    return {status:document.getElementById('statusText'), button:document.getElementById('proposalBtn'), result:document.getElementById('proposalResult')};
  }
  function setResult(text){const el=ui().result;if(el)el.textContent=text;}
  function currentSymbol(){
    const el=document.querySelector('.symbol-dropdown .dropdown-btn');
    const text=el?el.textContent.trim().split(/\s+/)[0]:'R_100';
    return symbolMap[text]||'1HZ100V';
  }
  function currentStake(){
    const el=document.querySelector('.stake-value');
    const n=el?Number((el.textContent||'').replace(/[^0-9.,]/g,'').replace(',','.')):DEFAULT_STAKE;
    return Number.isFinite(n)&&n>0?n:DEFAULT_STAKE;
  }
  function send(request){
    if(!ws||ws.readyState!==WebSocket.OPEN)throw new Error('WebSocket Deriv não está ligado.');
    const id=++reqId; request.req_id=id;
    return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify(request));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('Tempo esgotado ao obter a proposta.'));}},10000);});
  }
  function attach(socket){
    ws=socket;
    socket.addEventListener('message',event=>{
      try{const msg=JSON.parse(event.data);const id=msg.req_id;if(!id||!pending.has(id))return;const p=pending.get(id);pending.delete(id);if(msg.error)p.reject(new Error(msg.error.message||'Erro na proposta.'));else p.resolve(msg);}catch{}}
    );
  }
  async function requestProposal(contractType,barrier){
    const symbol=currentSymbol();
    const amount=currentStake();
    setResult('A obter proposta…');
    const msg=await send({proposal:1,amount,basis:'stake',contract_type:contractType,currency:'USD',duration:1,duration_unit:'t',underlying_symbol:symbol,barrier:String(barrier)});
    const p=msg.proposal||{};
    const price=Number(p.ask_price);
    const payout=Number(p.payout);
    setResult(`Proposta: stake $${Number.isFinite(price)?price.toFixed(2):amount.toFixed(2)} · payout $${Number.isFinite(payout)?payout.toFixed(2):'—'} · ID ${p.id||'—'}`);
    window.dispatchEvent(new CustomEvent('izitrader:proposal',{detail:{proposal:p,contractType,barrier,symbol}}));
    return p;
  }
  function wire(){
    const btn=ui().button;if(!btn)return;
    btn.addEventListener('click',async()=>{
      btn.disabled=true;
      try{
        const type=document.getElementById('proposalType')?.value||'DIGITOVER';
        const barrier=document.getElementById('proposalBarrier')?.value||'5';
        await requestProposal(type,barrier);
      }catch(e){setResult(e.message||'Falha ao obter proposta.');}
      finally{btn.disabled=false;}
    });
  }
  window.IziProposal={attach,requestProposal};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
