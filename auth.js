(async function(){
  const authPage=document.getElementById('authPage');const appPage=document.getElementById('appPage');const loginLink=document.getElementById('loginLink');const sairBtn=document.getElementById('sairBtn');
  if(loginLink)loginLink.href='/api/auth/login';
  try{sessionStorage.removeItem('izitrader_demo_session')}catch{}
  if(!['real','demo'].includes(localStorage.getItem('izitrader_account_type')))localStorage.setItem('izitrader_account_type','real');
  let analysisLoaded=false;
  function loadAnalysis(){if(analysisLoaded||document.querySelector('script[data-live-analysis]'))return;analysisLoaded=true;const s=document.createElement('script');s.src='/live-analysis.js';s.dataset.liveAnalysis='1';document.body.appendChild(s)}
  function showApp(){if(authPage)authPage.classList.add('hidden');if(appPage)appPage.classList.remove('hidden');loadAnalysis()}
  function showAuth(){if(window.IziDerivWS&&typeof window.IziDerivWS.stop==='function')window.IziDerivWS.stop();if(appPage)appPage.classList.add('hidden');if(authPage)authPage.classList.remove('hidden')}
  if(sairBtn)sairBtn.addEventListener('click',async()=>{try{await fetch('/api/auth/logout',{method:'POST',credentials:'same-origin'});}catch{}try{localStorage.removeItem('izitrader_account_type')}catch{}showAuth()});
  const params=new URLSearchParams(location.search);if(params.has('auth_error')){const code=params.get('auth_error')||'unknown';alert('Não foi possível concluir o login Deriv: '+code);history.replaceState({},'',location.pathname)}
  try{const r=await fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}),s=await r.json();if(s.authenticated)showApp();else showAuth()}catch{showAuth()}
})();
