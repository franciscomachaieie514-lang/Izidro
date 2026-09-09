/* Neutralize the obsolete inline Demo/public-WebSocket layer. */
(function(){
  try{
    if(window.__IziNativeWebSocket)return;
    window.__IziNativeWebSocket=window.WebSocket;
    function LegacyBlockedWebSocket(){this.readyState=3;this.url=arguments[0]||'';this.onopen=null;this.onmessage=null;this.onerror=null;this.onclose=null;}
    LegacyBlockedWebSocket.prototype.send=function(){};
    LegacyBlockedWebSocket.prototype.close=function(){if(typeof this.onclose==='function')this.onclose({type:'close'})};
    LegacyBlockedWebSocket.prototype.addEventListener=function(){};
    LegacyBlockedWebSocket.prototype.removeEventListener=function(){};
    LegacyBlockedWebSocket.CONNECTING=0;LegacyBlockedWebSocket.OPEN=1;LegacyBlockedWebSocket.CLOSING=2;LegacyBlockedWebSocket.CLOSED=3;
    window.WebSocket=LegacyBlockedWebSocket;
  }catch(e){console.error('[Izitrader] legacy guard failed',e)}
})();
