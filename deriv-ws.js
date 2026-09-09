(function(){
  const statusEl = document.querySelector('.status');
  const balanceEl = document.querySelector('.value');
  const symbolMap = { R_100:'1HZ100V', R_75:'1HZ75V', R_50:'1HZ50V', R_25:'1HZ25V', R_10:'1HZ10V' };
  let ws = null;
  let reconnectTimer = null;

  function setStatus(text, connected){
    if(!statusEl) return;
    statusEl.innerHTML = `<span class="dot" style="background:${connected ? '#35d492' : '#f5a623'}"></span>${text}`;
  }
  function currentSymbol(){
    const el = document.querySelector('.symbol-dropdown .dropdown-btn');
    const text = el ? el.textContent.trim().split(/\s+/)[0] : 'R_100';
    return symbolMap[text] || '1HZ100V';
  }
  function showTick(data){
    const tick = data && data.tick;
    if(!tick) return;
    window.dispatchEvent(new CustomEvent('izitrader:tick',{detail:{quote:Number(tick.quote),epoch:tick.epoch,symbol:tick.symbol}}));
  }
  async function getAccounts(){
    const r = await fetch('/api/deriv/accounts',{credentials:'same-origin',cache:'no-store'});
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || 'Não foi possível obter as contas Deriv.');
    return data.accounts || [];
  }
  async function connect(){
    try{
      setStatus('A ligar à Deriv…',false);
      const accounts = await getAccounts();
      const demo = accounts.find(a => a.is_virtual || a.account_type === 'demo' || a.currency === 'USD') || accounts[0];
      if(!demo) throw new Error('Nenhuma conta Deriv disponível.');
      const r = await fetch('/api/deriv/ws-url',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({accountId:demo.accountId || demo.id})});
      const data = await r.json();
      if(!r.ok || !data.url) throw new Error(data.error || 'Não foi possível obter a ligação WebSocket.');
      ws = new WebSocket(data.url);
      ws.onopen = () => {
        setStatus(`Deriv ${demo.is_virtual ? 'Demo' : 'conectada'}`,true);
        ws.send(JSON.stringify({balance:1,subscribe:1,req_id:1}));
        ws.send(JSON.stringify({ticks:currentSymbol(),subscribe:1,req_id:2}));
      };
      ws.onmessage = event => {
        try{
          const msg = JSON.parse(event.data);
          if(msg.msg_type === 'balance' && msg.balance && balanceEl){
            balanceEl.textContent = `${Number(msg.balance.balance).toFixed(2)} ${msg.balance.currency || ''}`.trim();
          }
          if(msg.msg_type === 'tick') showTick(msg);
          if(msg.error) setStatus(msg.error.message || 'Erro Deriv',false);
        }catch{}
      };
      ws.onerror = () => setStatus('Erro na ligação Deriv',false);
      ws.onclose = () => {
        setStatus('Deriv desligada — a reconectar…',false);
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect,3000);
      };
    }catch(error){
      setStatus(error.message || 'Falha na ligação Deriv',false);
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect,5000);
    }
  }

  window.IziDerivWS = { connect, disconnect:()=>{ clearTimeout(reconnectTimer); if(ws) ws.close(); } };
  fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(s=>{ if(s.authenticated) connect(); });
})();
