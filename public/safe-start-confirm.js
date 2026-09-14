/* Non-blocking confirmation for the real robot start button. */
(function(){
  'use strict';
  if(window.__iziSafeStartConfirm)return;
  window.__iziSafeStartConfirm=true;

  function install(){
    const style=document.createElement('style');
    style.textContent=`
      #iziStartConfirm{position:fixed;inset:0;background:rgba(0,0,0,.62);display:none;align-items:center;justify-content:center;padding:20px;z-index:9999}
      #iziStartConfirm.open{display:flex}
      #iziStartConfirm .box{width:min(380px,100%);background:var(--card,#111a2e);color:var(--text,#fff);border:1px solid var(--border,#22304a);border-radius:16px;padding:20px;box-shadow:0 18px 50px rgba(0,0,0,.4)}
      #iziStartConfirm h3{margin:0 0 10px;font-size:18px}
      #iziStartConfirm p{margin:0 0 18px;color:var(--muted,#7c88a3);font-size:13px;line-height:1.5}
      #iziStartConfirm .actions{display:flex;gap:10px}
      #iziStartConfirm button{flex:1;border:0;border-radius:10px;padding:12px;font-weight:800;cursor:pointer}
      #iziStartCancel{background:var(--field,#131b2e);color:var(--text,#fff);border:1px solid var(--border,#22304a)!important}
      #iziStartOk{background:#f5a623;color:#1a1305}
    `;
    document.head.appendChild(style);
    const modal=document.createElement('div');
    modal.id='iziStartConfirm';
    modal.innerHTML='<div class="box" role="dialog" aria-modal="true"><h3>Iniciar robô real?</h3><p>Esta ação permite que o robô envie compras reais para a sua conta Deriv. Confirme apenas se pretende operar com dinheiro real.</p><div class="actions"><button id="iziStartCancel" type="button">Cancelar</button><button id="iziStartOk" type="button">Continuar</button></div></div>';
    document.body.appendChild(modal);
    const close=()=>modal.classList.remove('open');
    modal.querySelector('#iziStartCancel').onclick=close;
    modal.addEventListener('click',e=>{if(e.target===modal)close()});
    modal.querySelector('#iziStartOk').onclick=()=>{
      close();
      const b=document.querySelector('.operate-btn');
      if(!b)return;
      const oldConfirm=window.confirm;
      window.confirm=()=>true;
      b.dataset.iziConfirmBypass='1';
      b.click();
      setTimeout(()=>{window.confirm=oldConfirm},0);
    };

    document.addEventListener('click',e=>{
      const b=e.target.closest&&e.target.closest('.operate-btn');
      if(!b)return;
      if(b.dataset.iziConfirmBypass==='1'){
        delete b.dataset.iziConfirmBypass;
        return;
      }
      const account=String(localStorage.getItem('izitrader_account_type')||'real').toLowerCase();
      const starting=/^INICIAR ROBÔ REAL$/i.test((b.textContent||'').trim()) || /operar com/i.test((b.textContent||'').trim())&&account==='real';
      if(account==='real'&&starting){
        e.preventDefault();
        e.stopImmediatePropagation();
        modal.classList.add('open');
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
