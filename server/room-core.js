import {CHAR,skillOf} from '../dist/catalog.js';
import {S,newBattle,beginTurn,endTurnState,restoreBattle,serializeBattle,U,useSkill,configureEngine} from '../dist/engine.js';
export const ROOM_TTL=24*60*60*1000;
export function normalizeRoom(code){
  const c=String(code||'').trim().toUpperCase().replace(/[\s-]/g,'');
  if(!/^[A-Z0-9]{4,24}$/.test(c))throw Error('roomCode');
  return c;
}
export const createRoom=(now=Date.now())=>({players:[],battle:null,revision:0,turnTime:60,deadline:null,expires:now+ROOM_TTL});
export function joinRoom(room,token,turnTime,now=Date.now()){
  if(!/^[a-zA-Z0-9_-]{32,80}$/.test(token||''))throw Error('session');
  let seat=room.players.findIndex(p=>p.token===token);
  if(seat<0){if(room.players.length>=2)throw Error('roomFull');seat=room.players.length;room.players.push({token,team:[],ready:false});room.revision++;
    if(seat===0)room.turnTime=[0,30,60,90].includes(turnTime)?turnTime:60;
  }
  room.expires=now+ROOM_TTL;return seat;
}
const packEvents=events=>events.map(e=>({...e,u:e.u?{t:e.u.t,i:e.u.i}:undefined}));
function history(events,action=false){
  if(action){const e=S.log.at(-1);S.history.push({turn:Math.floor(S.T/2)+1,text:`${CHAR[e.cid].name}: ${skillOf(e.cid,e.sid).name}`});}
  for(const e of events){if(!e.u)continue;const v=e.k==='dmg'?`−${e.v} HP`:e.k==='heal'?`+${e.v} HP`:e.k==='death'?'KO':e.k==='stun'?`Stun: ${e.n}`:'';
    if(v)S.history.push({turn:Math.floor(S.T/2)+1,text:`${CHAR[e.u.cid].name}: ${v}`});}
  S.history=S.history.slice(-100);
}
function nextTurn(room,now){endTurnState();const r=beginTurn();history(r.events);room.deadline=!S.over&&room.turnTime?now+room.turnTime*1000:null;return r;}
export function expireTurn(room,now=Date.now()){
  if(!room.battle||!room.deadline||now<room.deadline)return null;
  restoreBattle(room.battle);if(S.over){room.deadline=null;return null;}
  const r=nextTurn(room,now);room.battle=serializeBattle();room.revision++;return {kind:'turn',events:packEvents(r.events),gained:r.gained};
}
export function commandRoom(room,seat,msg,now=Date.now()){
  if(!room.players[seat])throw Error('session');
  if(msg.revision!==room.revision)throw Error('stale');
  let transition={kind:msg.type,events:[]};
  if(msg.type==='ready'){
    if(room.battle)throw Error('started');
    if(!Array.isArray(msg.team)||msg.team.length!==3||new Set(msg.team).size!==3||msg.team.some(id=>!Object.hasOwn(CHAR,id)))throw Error('team');
    room.players[seat].team=msg.team.slice();room.players[seat].ready=true;
    if(room.players.length===2&&room.players.every(p=>p.ready)){
      configureEngine({rng:Math.random});newBattle('online',room.players[0].team,room.players[1].team);const r=beginTurn();history(r.events);room.battle=serializeBattle();room.deadline=room.turnTime?now+room.turnTime*1000:null;transition={kind:'start',events:packEvents(r.events)};
    }
  }else if(msg.type==='unready'){
    if(room.battle)throw Error('started');room.players[seat].ready=false;
  }else if(msg.type==='rematch'){
    if(!room.battle)throw Error('waiting');restoreBattle(room.battle);if(!S.over)throw Error('started');room.battle=null;room.deadline=null;room.players.forEach(p=>p.ready=false);
  }else{
    if(!room.battle)throw Error('waiting');restoreBattle(room.battle);configureEngine({rng:Math.random});if(S.over)throw Error('finished');
    if(msg.type==='surrender'){S.over=true;S.winner=1-seat;room.deadline=null;}
    else{
      if(S.active!==seat)throw Error('turn');
      if(msg.type==='attack'){
        if(!Number.isInteger(msg.actor)||![0,1].includes(msg.targetTeam)||!Number.isInteger(msg.target))throw Error('target');
        const u=U(seat,msg.actor),target=U(msg.targetTeam,msg.target);
        const r=useSkill(u,msg.sid,target,msg.extra);if(!r.ok)throw Error(r.r);
        history(r.events,true);transition={kind:'attack',actor:msg.actor,team:seat,sid:msg.sid,targetTeam:msg.targetTeam,target:msg.target,events:packEvents(r.events),paid:r.paid};
      }else if(msg.type==='end'){
        const r=nextTurn(room,now);transition={kind:'turn',events:packEvents(r.events),gained:r.gained};
      }else throw Error('command');
    }
    if(S.over)room.deadline=null;room.battle=serializeBattle();
  }
  room.revision++;room.expires=now+ROOM_TTL;return transition;
}
export function roomView(room,seat,online=[false,false],transition=null){
  return {type:'state',serverNow:Date.now(),seat,revision:room.revision,turnTime:room.turnTime,deadline:room.deadline,expires:room.expires,online,players:room.players.map(p=>({ready:p.ready,team:room.battle||p.ready? p.team:[]})),battle:room.battle,transition};
}
