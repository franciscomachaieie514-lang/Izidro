(function(){
  const DEFAULT_STAKE=0.35;
  let ws=null;
  let reqId=100;
  const pending=new Map();
  const symbolMap={R_100:'1HZ100V',R_75:'1HZ75V',R_50:'1HZ50V',R_25:'1HZ25V',R_10:'1HZ10V'};

  function ensurePanel(){
    if(document.getElementById('proposalCard'))return;
    const anchor=document.querySelector('.wheel-wrap')||document.querySelector('.balance-row')||document.querySelector('.status');
    if(!anchor||!anchor.parentNode)return;
    const card=document.createElement('div');
    card.className='card proposal-card';
    card.id='proposalCard';
    card.style.marginTop='12px';
    card.innerHTML=`<div class="label">PROPOSTA UNDER / OVER</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0"><select id="proposalType" style="width:100%;padding:10px;border-radius:8px"><option value="DIGITOVER">OVER</option><option value="DIGITUNDER">UNDER</option></select><select id="proposalBarrier" style="width:100%;padding:10px;border-radius:8px">${Array.from({length:10},(_,i)=>`<option value="${i}">${i}</option>`).join('')}</select></div><button class="operate-btn" id="proposalBtn" type="button">OBTER PROPOSTA</button><div id="proposalResult" class="note" style="margin-top:8px">Sem proposta.</div>`;
    anchor.parentNode.insertBefore(card,anchor);
    updateBarrierOptions();
  }
  function ui(){return{button:document.getElementById('proposalBtn'),result:document.getElementById('proposalResult'),type:document.getElementById('proposalType'),barrier:document.getElementById('proposalBarrier')};}
  function setResult(text){const el=ui().result;if(el)el.textContent=text;}
  function currentSymbol(){const el=document.querySelector('.symbol-dropdown .dropdown-btn');const text=el?el.textContent.trim().split(/\s+/)[0]:'R_100';return symbolMap[text]||'1HZ100V';}
  function currentStake(){const el=document.querySelector('.stake-value');const n=el?Number((el.textContent||'').replace(/[^0-9.,]/g,'').replace(',','.')):DEFAULT_STAKE;return Number.isFinite(n)&&n>0?n:DEFAULT_STAKE;}
  function updateBarrierOptions(){
    const {type,barrier}=ui();if(!type||!barrier)return;
    const over=type.value==='DIGITOVER';
    Array.from(barrier.options).forEach(o=>{o.disabled=over?Number(o.value)>8:Number(o.value)<1;});
    if((over&&Number(barrier.value)>8)||(!over&&Number(barrier.value)<1))barrier.value=over?'5':'5';
  }
  function send(request){
    if(!ws||ws.readyState!==WebSocket.OPEN)throw new Error('WebSocket Deriv não está ligado.');
    const id=++reqId;request.req_id=id;
    return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify(request));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('Tempo esgotado ao obter a proposta.'));}},10000);});
  }
  function attach(socket){
    if(ws===socket)return;
    ws=socket;
    socket.addEventListener('message',event=>{try{const msg=JSON.parse(event.data);const id=msg.req_id;if(!id||!pending.has(id))return;const p=pending.get(id);pending.delete(id);if(msg.error)p.reject(new Error(msg.error.message||'Erro na proposta.'));else p.resolve(msg);}catch{}});
    setResult('Ligado. Pronto para obter proposta.');
  }
  async function requestProposal(contractType,barrier){
    const b=Number(barrier);
    if(contractType==='DIGITOVER'&&(b<0||b>8))throw new Error('OVER usa barreira de 0 a 8.');
    if(contractType==='DIGITUNDER'&&(b<1||b>9))throw new Error('UNDER usa barreira de 1 a 9.');
    const symbol=currentSymbol();const amount=currentStake();
    setResult('A obter proposta…');
    const msg=await send({proposal:1,amount,basis:'stake',contract_type:contractType,currency:'USD',duration:1,duration_unit:'t',underlying_symbol:symbol,barrier:String(b)});
    const p=msg.proposal||{};const price=Number(p.ask_price);const payout=Number(p.payout);
    setResult(`Proposta: stake $${Number.isFinite(price)?price.toFixed(2):amount.toFixed(2)} · payout $${Number.isFinite(payout)?payout.toFixed(2):'—'} · ID ${p.id||'—'}`);
    window.dispatchEvent(new CustomEvent('izitrader:proposal',{detail:{proposal:p,contractType,barrier:b,symbol}}));
    return p;
  }
  function wire(){
    ensurePanel();
    const {button,type}=ui();if(!button)return;
    type.addEventListener('change',updateBarrierOptions);
    button.addEventListener('click',async()=>{button.disabled=true;try{await requestProposal(type.value,ui().barrier.value);}catch(e){setResult(e.message||'Falha ao obter proposta.');}finally{button.disabled=false;}});
    window.addEventListener('izitrader:ws-open',e=>{if(e.detail?.socket)attach(e.detail.socket);});
    window.addEventListener('izitrader:ws-close',()=>{ws=null;for(const [id,p] of pending){p.reject(new Error('WebSocket Deriv foi desligado.'));pending.delete(id);}});
  }
  window.IziProposal={attach,requestProposal};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
