import {normalizeRoom,createRoom,joinRoom,commandRoom,expireTurn,roomView} from './room-core.js';
const encode=x=>JSON.stringify(x,(_k,v)=>v===Infinity?'__infinity__':v);
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return Response.json({online:!!env.ROOMS,version:'nakama-online-v1'});
    if(url.pathname.startsWith('/api/room/')){
      if(request.headers.get('Origin')!==url.origin)return new Response('Forbidden', {status:403});
      if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
      let code;try{code=normalizeRoom(decodeURIComponent(url.pathname.slice(10)));}catch{return new Response('Invalid room code',{status:400});}
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(request);
    }
    return env.ASSETS.fetch(request);
  }
};
// Storage and hibernating sockets survive isolate eviction and deployments.
export class NakamaRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.room=null;this.queue=Promise.resolve();ctx.blockConcurrencyWhile(async()=>{this.room=await ctx.storage.get('room')||createRoom();});}
  enqueue(fn){const p=this.queue.then(fn);this.queue=p.catch(()=>{});return p;}
  async fetch(){
    if(this.ctx.getWebSockets().length>=8)return new Response('Room connection limit',{status:429});
    const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server);server.serializeAttachment({seat:null,joined:Date.now()});
    // Also closes unauthenticated sockets; a room is always reclaimed after 24h.
    await this.schedule();return new Response(null,{status:101,webSocket:client});
  }
  presence(){return [0,1].map(seat=>this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.seat===seat));}
  broadcast(transition=null){const online=this.presence();for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(a?.seat==null)continue;try{ws.send(encode(roomView(this.room,a.seat,online,transition)));}catch{}}}
  async schedule(){
    const pending=this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment()?.seat==null).map(ws=>ws.deserializeAttachment().joined+15000);
    await this.ctx.storage.setAlarm(Math.max(Date.now()+100,Math.min(this.room.expires,this.room.deadline||Infinity,...pending)));
  }
  async persist(transition){await this.ctx.storage.put('room',this.room);await this.schedule();this.broadcast(transition);}
  async webSocketMessage(ws,raw){return this.enqueue(async()=>{
    try{
      if(typeof raw!=='string'||raw.length>4096)throw Error('message');const msg=JSON.parse(raw),a=ws.deserializeAttachment();
      if(msg.type==='hello'){
        if(this.room.expires<=Date.now()){this.room=createRoom();for(const other of this.ctx.getWebSockets())if(other!==ws)other.close(4002,'Room expired');}
        const seat=joinRoom(this.room,msg.token,msg.turnTime);for(const other of this.ctx.getWebSockets())if(other!==ws&&other.deserializeAttachment()?.seat===seat){other.serializeAttachment({seat:null,joined:Date.now()});other.close(4001,'Connected elsewhere');}
        ws.serializeAttachment({seat,token:msg.token});await this.persist(null);return;
      }
      if(a?.seat==null||this.room.players[a.seat]?.token!==a.token)throw Error('session');
      if(msg.type==='ping'){ws.send(encode({type:'pong'}));return;}
      const expired=expireTurn(this.room);if(expired){await this.persist(expired);}
      if(msg.type==='sync'){this.broadcast();return;}
      const transition=commandRoom(this.room,a.seat,msg);await this.persist(transition);
    }catch(e){ws.send(encode({type:'error',code:e.message}));if(['roomFull','session'].includes(e.message))ws.close(4003,e.message);else this.broadcast();}
  });}
  async webSocketClose(ws,code){try{ws.close(code===1005?1000:code);}catch{}this.broadcast();}
  async webSocketError(ws){try{ws.close(1011,'Connection error');}catch{}this.broadcast();}
  async alarm(){return this.enqueue(async()=>{
    const now=Date.now();
    for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(a?.seat==null&&now-a.joined>=15000)ws.close(4003,'session');}
    if(now>=this.room.expires){for(const ws of this.ctx.getWebSockets())ws.close(4002,'Room expired');await this.ctx.storage.deleteAll();this.room=createRoom();return;}
    const r=expireTurn(this.room,now);if(r)await this.persist(r);else await this.schedule();
  });}
}
