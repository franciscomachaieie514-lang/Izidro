(async function(){
  const authPage=document.getElementById('authPage');
  const appPage=document.getElementById('appPage');
  const loginLink=document.getElementById('loginLink');
  const demoAccess=document.getElementById('demoAccess');
  const sairBtn=document.getElementById('sairBtn');
  if(loginLink) loginLink.href='/api/auth/login';

  function showApp(){ if(authPage)authPage.classList.add('hidden'); if(appPage)appPage.classList.remove('hidden'); }
  function showAuth(){ if(appPage)appPage.classList.add('hidden'); if(authPage)authPage.classList.remove('hidden'); }

  if(demoAccess) demoAccess.addEventListener('click',()=>{localStorage.setItem('izitrader_demo','1');showApp();});

  if(sairBtn) sairBtn.addEventListener('click',async()=>{
    try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});}catch{}
    localStorage.removeItem('izitrader_demo');
    showAuth();
  });

  const params=new URLSearchParams(location.search);
  if(params.has('auth_error')){
    const code=params.get('auth_error')||'unknown';
    alert('Não foi possível concluir o login Deriv: '+code);
    history.replaceState({},'',location.pathname);
  }

  try{
    const response=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'});
    const session=await response.json();
    if(session.authenticated) showApp();
    else if(localStorage.getItem('izitrader_demo')==='1') showApp();
    else showAuth();
  }catch{
    if(localStorage.getItem('izitrader_demo')==='1') showApp(); else showAuth();
  }
})();
