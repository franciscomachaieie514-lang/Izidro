(function(){
'use strict';
if(window.__iziUiLayoutCompat)return;
window.__iziUiLayoutCompat=true;
function sync(){
 const menu=document.getElementById('symbolMenu');
 if(menu){menu.style.zIndex='1000';menu.style.maxHeight='260px';menu.style.overflowY='auto'}
 if(window.ensureIzitraderSymbols)window.ensureIzitraderSymbols();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();