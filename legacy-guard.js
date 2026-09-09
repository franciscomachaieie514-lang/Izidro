/* Disable the old inline Demo/public-WebSocket layer. Keep the native constructor for deriv-realtime.js. */
(function(){
  try{
    if(window.__IziNativeWebSocket)return;
    window.__IziNativeWebSocket=window.WebSocket;
    window.WebSocket=function(){throw new Error('Legacy Izitrader WebSocket disabled; use authenticated Deriv realtime bridge.')};
    window.WebSocket.CONNECTING=0;window.WebSocket.OPEN=1;window.WebSocket.CLOSING=2;window.WebSocket.CLOSED=3;
  }catch(e){console.error('[Izitrader] legacy guard failed',e)}
})();
