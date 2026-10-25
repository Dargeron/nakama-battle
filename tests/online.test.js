import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,normalizeRoom,commandRoom,expireTurn,roomView,ROOM_TTL} from '../server/room-core.js';
import {S,restoreBattle,serializeBattle,U,configureEngine,cpuPick} from '../dist/engine.js';
import {OnlineClient} from '../dist/online.js';
import worker,{NakamaRoom} from '../server/worker.js';
const a='a'.repeat(48),b='b'.repeat(48),c='c'.repeat(48),ta=['albert','olmo','irmina'],tb=['aimar','joey','maria'];
const cmd=(r,seat,type,data={},now=2000)=>commandRoom(r,seat,{type,revision:r.revision,...data},now);
function setup(time=0){const r=createRoom(1000);joinRoom(r,a,time,1000);joinRoom(r,b,time,1000);cmd(r,0,'ready',{team:ta});cmd(r,1,'ready',{team:tb});return r;}
function rich(r){restoreBattle(r.battle);S.teams.forEach(t=>t.mana={F:30,R:30,P:30,E:30});r.battle=serializeBattle();return S.active;}

test('room codes ignore case, spaces and hyphens; invalid paths are rejected',()=>{
 assert.equal(normalizeRoom('  ninja-42 '),'NINJA42');for(const s of ['a','../room','你好','a'.repeat(25)])assert.throws(()=>normalizeRoom(s));
});
test('same code has two stable seats, reconnect reuses seat, third player cannot join',()=>{
 const r=createRoom(0);assert.equal(joinRoom(r,a,30,0),0);assert.equal(joinRoom(r,b,0,0),1);assert.equal(joinRoom(r,a,90,1),0);assert.equal(r.turnTime,30);assert.throws(()=>joinRoom(r,c,30),/roomFull/);assert.throws(()=>joinRoom(r,'short',0),/session/);
});
test('both independently confirm teams; matching characters allowed and duplicates rejected',()=>{
 const r=createRoom();joinRoom(r,a,0);cmd(r,0,'ready',{team:ta});assert.equal(r.battle,null);joinRoom(r,b,60);assert.throws(()=>cmd(r,1,'ready',{team:['albert','albert','olmo']}),/team/);
 cmd(r,1,'ready',{team:ta});restoreBattle(r.battle);assert.equal(S.mode,'online');assert.deepEqual(S.picks,[ta,ta]);assert.equal(S.turnStarted,true);assert.equal(S.turnsTaken.reduce((x,y)=>x+y),1);
});
test('room snapshots contain no player credentials; malformed teams cannot use prototype keys',()=>{
 const r=createRoom();joinRoom(r,a,0);assert.throws(()=>cmd(r,0,'ready',{team:['constructor','olmo','irmina']}),/team/);
 const json=JSON.stringify(roomView(r,0));assert.ok(!json.includes(a));assert.equal(JSON.parse(json).players[0].ready,false);
});
test('server rejects opponent moves, invalid targets, reused actors and stale duplicate clicks',()=>{
 const r=setup(),t=rich(r),unit=U(t,0),sid=unit.skills[1];
 assert.throws(()=>cmd(r,1-t,'end'),/turn/);const before=r.battle;
 assert.throws(()=>cmd(r,t,'attack',{actor:0,sid,targetTeam:7,target:0}),/target/);assert.equal(r.battle,before);
 // Guaranteed legal base attacks: Albert sillazo / Aimar mordisco, find through CPU.
 restoreBattle(r.battle);configureEngine({rng:()=>.01});const move=cpuPick(t);assert.ok(move);
 const msg={type:'attack',revision:r.revision,actor:move.u.i,sid:move.sid,targetTeam:move.target.t,target:move.target.i,extra:null};
 const tr=commandRoom(r,t,msg);assert.equal(tr.kind,'attack');assert.ok(tr.events.length);const after=r.battle;
 assert.throws(()=>commandRoom(r,t,msg),/stale/);assert.equal(r.battle,after);
 assert.throws(()=>cmd(r,t,'attack',{...msg,actor:move.u.i,revision:r.revision}),/r_acted/);
});
test('custom chakra spending is authoritative and cannot overspend or underpay',()=>{
 const r=setup(),t=rich(r);restoreBattle(r.battle);configureEngine({rng:()=>.01});let move=cpuPick(t);const before=r.battle;
 assert.throws(()=>cmd(r,t,'attack',{actor:move.u.i,sid:move.sid,targetTeam:move.target.t,target:move.target.i,extra:[999,999,999,999]}),/r_mana/);assert.equal(r.battle,before);
});
test('online end turn is server-side, advances cooldown and chakra exactly once',()=>{
 const r=setup();restoreBattle(r.battle);const t=S.active,old=S.T;const revision=r.revision;
 const tr=cmd(r,t,'end');restoreBattle(r.battle);assert.equal(S.active,1-t);assert.equal(S.T,old+1);assert.equal(S.turnStarted,true);assert.equal(tr.kind,'turn');assert.throws(()=>commandRoom(r,t,{type:'end',revision}),/stale/);
});
test('room hibernation/JSON persistence resumes without reapplying any damage or opening cooldowns',()=>{
 const r=setup();const copy=JSON.parse(JSON.stringify(r));const before=copy.battle;assert.equal(joinRoom(copy,a,30,3000),0);assert.equal(copy.battle,before);restoreBattle(copy.battle);assert.equal(U(0,2).cds.locura,5);
});
test('shared clock uses real deadlines; stale timeout commands cannot advance two turns',()=>{
 const r=setup(30),deadline=r.deadline;assert.equal(expireTurn(r,deadline-1),null);restoreBattle(r.battle);const t=S.active,revision=r.revision;
 const tr=expireTurn(r,deadline);assert.equal(tr.kind,'turn');restoreBattle(r.battle);assert.equal(S.active,1-t);assert.equal(r.deadline,deadline+30000);
 assert.throws(()=>commandRoom(r,t,{type:'end',revision},deadline),/stale/);assert.equal(expireTurn(r,deadline),null);
});
test('either player may surrender; rematch needs two new confirmations and preserves mirror teams',()=>{
 const r=setup();restoreBattle(r.battle);const t=1-S.active;cmd(r,t,'surrender');restoreBattle(r.battle);assert.equal(S.winner,1-t);assert.equal(r.deadline,null);
 cmd(r,0,'rematch');assert.equal(r.battle,null);assert.ok(r.players.every(p=>!p.ready));cmd(r,1,'ready',{team:ta});assert.equal(r.battle,null);cmd(r,0,'ready',{team:ta});restoreBattle(r.battle);assert.equal(S.over,false);
});
test('multiple room instances share one engine module without leaking state between battles',()=>{
 const r1=setup(),r2=setup();rich(r1);rich(r2);restoreBattle(r1.battle);const t1=S.active;restoreBattle(r2.battle);const t2=S.active;
 cmd(r1,t1,'end');const untouched=r1.battle;cmd(r2,t2,'surrender');assert.equal(r1.battle,untouched);restoreBattle(r1.battle);assert.equal(S.over,false);
});
test('30 online protocol matches finish with authoritative valid snapshots after every move',()=>{
 for(let n=0;n<30;n++){
  const r=setup();let over=false;
  for(let turn=0;turn<350&&!over;turn++){
   restoreBattle(r.battle);const t=S.active;
   for(let i=0;i<3;i++){
    restoreBattle(r.battle);configureEngine({rng:()=>.37});if(S.over)break;const m=cpuPick(t);if(!m)break;
    cmd(r,t,'attack',{actor:m.u.i,sid:m.sid,targetTeam:m.target.t,target:m.target.i});restoreBattle(r.battle);
   }
   restoreBattle(r.battle);if(!S.over)cmd(r,t,'end');restoreBattle(r.battle);over=S.over;
  }
  assert.ok(over,'match '+n);
 }
});
class FakeSocket{
 static all=[];
 constructor(url){this.url=url;this.readyState=0;this.sent=[];FakeSocket.all.push(this);}
 send(s){this.sent.push(JSON.parse(s));}close(){this.readyState=3;}
 open(){this.readyState=1;this.onopen();}message(m){this.onmessage({data:JSON.stringify(m)});}
}
function client(){const states=[],errors=[],connections=[];const x=new OnlineClient({code:'NINJA42',token:a,turnTime:60,url:'wss://example.test/api/room/NINJA42',WebSocketImpl:FakeSocket,onState:m=>states.push(m),onConnection:s=>connections.push(s),onError:e=>errors.push(e)});x.connect();return {x,ws:x.socket,states,errors,connections};}
test('client authenticates inside websocket, never puts session token in the URL',async()=>{
 const {x,ws,states}=client();ws.open();assert.ok(!ws.url.includes(a));assert.equal(ws.sent[0].token,a);ws.message({type:'state',revision:3});await x.queue;assert.equal(states.length,1);assert.equal(x.connected,true);assert.ok(x.send('end'));assert.deepEqual(ws.sent[1],{type:'end',revision:3});x.stop();assert.equal(x.send('end'),false);
});
test('reconnection requests a fresh snapshot and never resends an unacknowledged attack',async()=>{
 const {x,ws}=client();ws.open();ws.message({type:'state',revision:3});await x.queue;x.send('attack',{actor:0});x.connected=false;x.connect();const next=x.socket;next.open();assert.deepEqual(next.sent.map(m=>m.type),['hello']);next.message({type:'state',revision:4});await x.queue;assert.equal(x.revision,4);x.stop();
});
test('room full or replaced connections stop reconnecting and surface a reason',()=>{
 const {x,ws,errors}=client();ws.onclose({code:4003,reason:'roomFull'});assert.equal(x.stopped,true);assert.deepEqual(errors,['roomFull']);
});
test('messages from an abandoned socket cannot affect a new connection',async()=>{
 const {x,ws,states}=client();x.connect();ws.message({type:'state',revision:99});await x.queue;assert.equal(states.length,0);x.stop();
});
test('worker only accepts same-origin websocket rooms and serves static assets otherwise',async()=>{
 const env={ASSETS:{fetch:()=>new Response('assets')},ROOMS:{idFromName:x=>x,get:id=>({fetch:()=>new Response(id)})}};
 assert.equal((await worker.fetch(new Request('https://game.test/api/room/TEST'),env)).status,403);
 assert.equal((await worker.fetch(new Request('https://game.test/api/room/TEST',{headers:{Origin:'https://game.test'}}),env)).status,426);
 assert.equal(await (await worker.fetch(new Request('https://game.test/'),env)).text(),'assets');
 assert.equal(await (await worker.fetch(new Request('https://game.test/api/room/ninja-42',{headers:{Origin:'https://game.test',Upgrade:'websocket'}}),env)).text(),'NINJA42');
 assert.equal((await worker.fetch(new Request('https://game.test/api/room/TEST',{headers:{Origin:'https://evil.test',Upgrade:'websocket'}}),env)).status,403);
});
test('hibernation server persists two seats, broadcasts identical battles, and retains reconnect identity',async()=>{
 const data=new Map(),sockets=[],ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,structuredClone(v)),setAlarm:async()=>{},deleteAll:async()=>data.clear()},getWebSockets:()=>sockets,blockConcurrencyWhile(fn){this.ready=fn();}};
 const socket=()=>{let a={seat:null,joined:Date.now()};const ws={messages:[],serializeAttachment:v=>a=v,deserializeAttachment:()=>a,send:v=>ws.messages.push(JSON.parse(v)),close:()=>{sockets.splice(sockets.indexOf(ws),1);}};sockets.push(ws);return ws;};
 const room=new NakamaRoom(ctx,{});await ctx.ready;const x=socket(),y=socket();await room.webSocketMessage(x,JSON.stringify({type:'hello',token:a,turnTime:0}));await room.webSocketMessage(y,JSON.stringify({type:'hello',token:b,turnTime:0}));
 await room.webSocketMessage(x,JSON.stringify({type:'ready',revision:room.room.revision,team:ta}));await room.webSocketMessage(y,JSON.stringify({type:'ready',revision:room.room.revision,team:tb}));
 assert.equal(x.messages.at(-1).battle,y.messages.at(-1).battle);assert.ok(!JSON.stringify(x.messages).includes(b));
 const restored=new NakamaRoom(ctx,{});await ctx.ready;assert.equal(restored.room.battle,room.room.battle);const z=socket();await restored.webSocketMessage(z,JSON.stringify({type:'hello',token:a,turnTime:0}));assert.equal(z.messages.at(-1).seat,0);assert.equal(z.messages.at(-1).battle,room.room.battle);
});
