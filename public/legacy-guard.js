/* Block the obsolete public Demo WebSocket, but allow Deriv's authenticated OTP URL used by the realtime bridge. */
(function(){
  try{
    if(window.__IziNativeWebSocket)return;
    window.__IziNativeWebSocket=window.WebSocket;
    const Native=window.__IziNativeWebSocket;
    function GuardedWebSocket(url,protocols){
      if(typeof url==='string'&&/[?&]otp=/.test(url))return protocols===undefined?new Native(url):new Native(url,protocols);
      this.readyState=3;this.url=url||'';this.onopen=null;this.onmessage=null;this.onerror=null;this.onclose=null;
    }
    GuardedWebSocket.prototype.send=function(){};
    GuardedWebSocket.prototype.close=function(){if(typeof this.onclose==='function')this.onclose({type:'close'})};
    GuardedWebSocket.prototype.addEventListener=function(){};
    GuardedWebSocket.prototype.removeEventListener=function(){};
    GuardedWebSocket.CONNECTING=0;GuardedWebSocket.OPEN=1;GuardedWebSocket.CLOSING=2;GuardedWebSocket.CLOSED=3;
    window.WebSocket=GuardedWebSocket;
  }catch(e){console.error('[Izitrader] legacy guard failed',e)}
})();
