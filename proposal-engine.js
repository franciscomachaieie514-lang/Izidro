(function(){
  const DEFAULT_STAKE=0.35;
  let ws=null,reqId=100;
  const pending=new Map();
  const symbolMap={R_100:'1HZ100V',R_75:'1HZ75V',R_50:'1HZ50V',R_25:'1HZ25V',R_10:'1HZ10V'};
  function currentSymbol(){const el=document.querySelector('.symbol-dropdown .dropdown-btn');const text=el?el.textContent.trim().split(/\s+/)[0]:'R_100';return symbolMap[text]||'1HZ100V';}
  function currentStake(){const el=document.querySelector('.stake-value');const n=el?Number((el.textContent||'').replace(/[^0-9.,]/g,'').replace(',','.')):DEFAULT_STAKE;return Number.isFinite(n)&&n>0?n:DEFAULT_STAKE;}
  function setResult(text){const el=document.getElementById('proposalResult');if(el)el.textContent=text;}
  function ensurePanel(){
    if(document.getElementById('proposalCard'))return;
    const anchor=document.querySelector('.wheel-wrap')||document.querySelector('.balance-row')||document.body;
    const card=document.createElement('div');card.id='proposalCard';card.className='card proposal-card';card.style.cssText='margin:12px 0;padding:14px;';
    card.innerHTML='<div style="font-size:11px;letter-spacing:1px;margin-bottom:10px;opacity:.8">PROPOSTA UNDER / OVER</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><select id="proposalType" style="width:100%;padding:10px;border-radius:8px;background:#0d1424;color:inherit;border:1px solid #2b3852"><option value="DIGITOVER">OVER</option><option value="DIGITUNDER">UNDER</option></select><select id="proposalBarrier" style="width:100%;padding:10px;border-radius:8px;background:#0d1424;color:inherit;border:1px solid #2b3852">'+Array.from({length:10},(_,i)=>`<option value="${i}">${i}</option>`).join('')+'</select></div><div style="display:flex;gap:8px;margin-top:10px"><button id="proposalBtn" class="operate-btn" type="button">OBTER PROPOSTA</button><button id="buyBtn" class="operate-btn" type="button" disabled>COMPRAR</button></div><div id="proposalResult" class="note" style="margin-top:10px">Sem proposta.</div>';
    if(anchor.parentNode)anchor.parentNode.insertBefore(card,anchor);else document.body.appendChild(card);
    const type=document.getElementById('proposalType'),bar=document.getElementById('proposalBarrier');
    function sync(){const over=type.value==='DIGITOVER';bar.innerHTML=Array.from({length:9},(_,j)=>{const i=over?j:j+1;return `<option value="${i}">${i}</option>`}).join('');}
    type.addEventListener('change',sync);sync();
  }
  function send(request,timeout=10000){
    if(!ws||ws.readyState!==WebSocket.OPEN)throw new Error('WebSocket Deriv não está ligado.');
    const id=++reqId;request.req_id=id;
    return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});try{ws.send(JSON.stringify(request));}catch(e){pending.delete(id);reject(e);return;}setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('Tempo esgotado.'));}},timeout);});
  }
  function attach(socket){
    ws=socket;
    socket.addEventListener('message',event=>{try{const msg=JSON.parse(event.data);const id=msg.req_id;if(!id||!pending.has(id))return;const p=pending.get(id);pending.delete(id);if(msg.error)p.reject(new Error(msg.error.message||'Erro Deriv.'));else p.resolve(msg);}catch{}});
  }
  async function requestProposal(contractType,barrier){
    if((contractType==='DIGITOVER'&&!(Number(barrier)>=0&&Number(barrier)<=8))||(contractType==='DIGITUNDER'&&!(Number(barrier)>=1&&Number(barrier)<=9)))throw new Error('Barreira inválida para este contrato.');
    const amount=currentStake();setResult('A obter proposta…');
    const msg=await send({proposal:1,amount,basis:'stake',contract_type:contractType,currency:'USD',duration:1,duration_unit:'t',underlying_symbol:currentSymbol()});
    const p=msg.proposal||{};if(!p.id)throw new Error('A Deriv não devolveu um ID de proposta.');
    const price=Number(p.ask_price),payout=Number(p.payout);setResult(`Proposta: stake $${Number.isFinite(price)?price.toFixed(2):amount.toFixed(2)} · payout $${Number.isFinite(payout)?payout.toFixed(2):'—'} · ID ${p.id}`);
    window._iziLastProposal={id:String(p.id),price:Number.isFinite(price)?price:amount,contractType,barrier:Number(barrier),symbol:currentSymbol()};
    const buy=document.getElementById('buyBtn');if(buy){buy.disabled=false;buy.textContent='COMPRAR';}
    window.dispatchEvent(new CustomEvent('izitrader:proposal',{detail:{proposal:p,contractType,barrier,symbol:currentSymbol()}}));return p;
  }
  async function buyProposal(){
    const last=window._iziLastProposal;if(!last?.id)throw new Error('Obtenha uma proposta primeiro.');
    const buy=document.getElementById('buyBtn');if(buy)buy.disabled=true;setResult('A comprar contrato…');
    try{
      const msg=await send({buy:last.id,price:last.price});const b=msg.buy;if(!b?.contract_id)throw new Error('A compra não devolveu o contrato.');
      setResult(`CONTRATO #${b.contract_id} · stake $${Number(b.buy_price||last.price).toFixed(2)} · payout $${Number(b.payout||0).toFixed(2)} · A acompanhar…`);
      window._iziActiveContract={...b,contractType:last.contractType,barrier:last.barrier,symbol:last.symbol};
      await monitorContract(b.contract_id);
      return b;
    }catch(e){if(buy)buy.disabled=false;throw e;}
  }
  async function monitorContract(contractId){
    const msg=await send({proposal_open_contract:1,contract_id:contractId,subscribe:1});
    if(msg.proposal_open_contract)handleContract(msg.proposal_open_contract);
  }
  function handleContract(c){
    const status=String(c.status||'').toLowerCase();const finished=c.is_sold||status==='won'||status==='lost'||status==='sold';
    if(finished){
      const won=status==='won'||Number(c.profit)>0;const profit=Number(c.profit||0);setResult(`${won?'WIN':'LOSS'} · contrato #${c.contract_id||''} · ${profit>=0?'+':''}$${profit.toFixed(2)}`);window.dispatchEvent(new CustomEvent('izitrader:contract-result',{detail:{contract:c,won,profit}}));const buy=document.getElementById('buyBtn');if(buy)buy.disabled=false;
    }
  }
  function wire(){ensurePanel();document.getElementById('proposalBtn')?.addEventListener('click',async()=>{const btn=document.getElementById('proposalBtn');btn.disabled=true;try{await requestProposal(document.getElementById('proposalType').value,document.getElementById('proposalBarrier').value);}catch(e){setResult(e.message||'Falha ao obter proposta.');}finally{btn.disabled=false;}});document.getElementById('buyBtn')?.addEventListener('click',async()=>{try{await buyProposal();}catch(e){setResult(e.message||'Falha na compra.');}});}
  window.IziProposal={attach,requestProposal,buy:buyProposal};
  window.addEventListener('izitrader:ws-open',e=>{if(e.detail?.socket)attach(e.detail.socket);});
  window.addEventListener('izitrader:ws-close',()=>{ws=null;for(const [id,p] of pending){p.reject(new Error('WebSocket fechado.'));pending.delete(id);}});
  window.addEventListener('message',()=>{});
  function onSocketMessage(event){try{const msg=JSON.parse(event.data);if(msg.msg_type==='proposal_open_contract'&&msg.proposal_open_contract)handleContract(msg.proposal_open_contract);}catch{}}
  window.addEventListener('izitrader:ws-open',e=>{const socket=e.detail?.socket;if(socket)socket.addEventListener('message',onSocketMessage);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();