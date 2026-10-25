// A reconnect always requests the authoritative snapshot. Commands are never
// retried automatically: a lost acknowledgement must not repeat an attack.
export class OnlineClient {
  constructor({code,token,turnTime,onState,onConnection,onError,url,WebSocketImpl=globalThis.WebSocket}){
    Object.assign(this,{code,token,turnTime,onState,onConnection,onError,WebSocketImpl});
    this.url=url;this.stopped=false;this.revision=-1;this.connected=false;this.queue=Promise.resolve();this.attempt=0;
  }
  connect(){
    if(this.stopped)return;clearInterval(this.heartbeat);clearTimeout(this.watchdog);this.onConnection(false);
    const ws=this.socket=new this.WebSocketImpl(this.url);
    ws.onopen=()=>{if(this.stopped||ws!==this.socket)return;ws.send(JSON.stringify({type:'hello',token:this.token,turnTime:this.turnTime}));
      clearInterval(this.heartbeat);this.heartbeat=setInterval(()=>{if(ws!==this.socket||this.stopped)return;ws.send(JSON.stringify({type:'ping'}));clearTimeout(this.watchdog);this.watchdog=setTimeout(()=>ws.close(),10000);},20000);};
    ws.onmessage=e=>{
      if(this.stopped||ws!==this.socket)return;
      let msg;try{msg=JSON.parse(e.data);}catch{return;}
      if(msg.type==='pong'){clearTimeout(this.watchdog);return;}
      if(msg.type==='error'){this.onError(msg.code);return;}
      if(msg.type!=='state')return;
      this.connected=true;this.attempt=0;this.revision=msg.revision;this.onConnection(true);
      this.queue=this.queue.then(()=>{if(!this.stopped&&ws===this.socket)return this.onState(msg);}).catch(()=>this.onError('sync'));
    };
    ws.onerror=()=>{};
    ws.onclose=e=>{
      if(this.stopped||ws!==this.socket)return;this.connected=false;clearInterval(this.heartbeat);clearTimeout(this.watchdog);this.onConnection(false);
      if([4001,4002,4003].includes(e.code)){this.stop();this.onError(e.reason||'session');return;}
      this.retry=setTimeout(()=>this.connect(),Math.min(10000,500*2**this.attempt++));
    };
  }
  send(type,data={}){
    if(!this.connected||this.stopped||this.socket?.readyState!==1)return false;
    this.socket.send(JSON.stringify({...data,type,revision:this.revision}));return true;
  }
  stop(){this.stopped=true;this.connected=false;clearTimeout(this.retry);clearInterval(this.heartbeat);clearTimeout(this.watchdog);this.socket?.close();}
}
