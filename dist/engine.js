import {allocateFlexible} from './controls.js';
import {CHARS, CHAR, MANA, SWAPS, skillOf} from './catalog.js';
let rng=Math.random, translate=k=>k;
const pick=a=>a[Math.floor(rng()*a.length)];
const rnd=(a,b)=>a+rng()*(b-a);
const L=k=>translate(k);
export function configureEngine(options={}){rng=options.rng||Math.random;translate=options.translate||translate;}
export let S = null;


function newUnit(cid, t, i){
  const c=CHAR[cid]; const cds={};
  [...c.skills,...(c.alts||[])].forEach(s=>cds[s.id]=s.startCd||0);
  return {cid, t, i, hp:100, alive:true, stun:0, skip:false, acted:false, st:[], cds, skills:c.skills.map(s=>s.id), atkPerm:0, dealt:0, healed:0, support:0};
}
function newBattle(mode, teamA, teamB, options={}){
  if(!['local','cpu','online'].includes(mode)||(options.firstTeam!=null&&![0,1].includes(options.firstTeam)))throw Error('Invalid battle mode or first team.');
  for(const team of [teamA,teamB]) if(team.length!==3 || new Set(team).size!==3 || team.some(id=>!CHAR[id])) throw Error('Choose three different characters per team.');
  S = { mode, T:0, active:options.firstTeam??(rng()<.5?0:1), over:false, winner:null, log:[], firstDone:false, turnStarted:false, turnsTaken:[0,0], history:[],
    teams:[ {mana:{F:0,R:0,P:0,E:0}, units:teamA.map((c,i)=>newUnit(c,0,i))},
            {mana:{F:0,R:0,P:0,E:0}, units:teamB.map((c,i)=>newUnit(c,1,i))} ],
    picks:[teamA.slice(), teamB.slice()] };
  return S;
}
const U = (t,i)=>S.teams[t].units[i];
const allies = u=>S.teams[u.t].units.filter(x=>x.alive);
const enemies = u=>S.teams[1-u.t].units.filter(x=>x.alive);
const has = (u,k)=>u.st.some(s=>s.k===k);
const sum = (u,k)=>u.st.filter(s=>s.k===k).reduce((a,s)=>a+(s.v||0),0);
const isInv = u=>has(u,'inv');
const noStun = u=>has(u,'nostun');
const sourceStunned = u=>!noStun(u) && (u.stun>0 || u.skip);
// Stun suppresses outward recurring actions, not protection or self effects.
// The source is an exact team/slot identity, including in mirror matches.
function isPeriodicSuppressed(s, target, stunned=null){
  if(s.k!=='dot')return false;
  const source=S?.teams[s.srcT]?.units[s.srcI];
  return !!source && source!==target && (stunned ? stunned.has(source) : sourceStunned(source));
}
const flatRed = u=>sum(u,'dred');
const ratio = u=>u.st.filter(s=>s.k==='dratio').reduce((a,s)=>a*s.v,1);
const unpRed = u=>sum(u,'unp');
const atkBonus = u=>u.atkPerm+sum(u,'atk');
function boostOf(u,sid){ let mult=1, add=0; u.st.forEach(s=>{ if(s.k==='boost'&&s.skill===sid){ mult*=s.mult||1; add+=s.add||0; } }); return {mult,add}; }
function isEnabled(u,sid){ const sk=skillOf(u.cid,sid); return !!sk && (!sk.locked || u.st.some(s=>s.k==='enable'&&s.skill===sk.id)); }
const exp = e=> e.halfTurns===Infinity ? Infinity : S.T + e.halfTurns;
const roundsLeft = s=> s.exp===Infinity||s.exp==null ? Infinity : Math.max(1, Math.ceil((s.exp - S.T - 1)/2));

function totalMana(t){ const m=S.teams[t].mana; return m.F+m.R+m.P+m.E; }
function affordable(t, cost){
  const m=S.teams[t].mana; let need=0;
  for(const k of MANA){ if((cost[k]||0)>m[k]) return false; need+=cost[k]||0; }
  return totalMana(t) >= need + (cost.C||0);
}
function payment(t,cost,extra=null){
  const flexible=allocateFlexible(S.teams[t].mana,cost,extra);
  return flexible && Object.fromEntries(MANA.map((k,i)=>[k,(cost[k]||0)+flexible[i]]));
}
function pay(t,cost,extra=null){
  const paid=payment(t,cost,extra); if(!paid)return null;
  for(const k of MANA)S.teams[t].mana[k]-=paid[k];
  return paid;
}
function validTargets(u, sk){
  switch(sk.target){
    case 'enemy': return enemies(u);
    case 'ally': return allies(u);
    case 'self': return [u];
    case 'allEnemies': return enemies(u);
    case 'allAllies': return allies(u);
  }
  return [];
}
function canUse(u, sid){
  if(!S||!u||!S.teams[u.t]?.units.includes(u))return {ok:false,r:'r_target'};
  const sk=skillOf(u.cid,sid);
  if(!sk || !u.skills.includes(sk.id)) return {ok:false,r:'r_locked'};
  if(S.over||!S.turnStarted) return {ok:false, r:'r_wait'};
  if(u.t!==S.active) return {ok:false, r:'r_wait'};
  if(!u.alive) return {ok:false, r:'r_dead'};
  if(u.skip) return {ok:false, r:'r_stun'};
  if(u.acted) return {ok:false, r:'r_acted'};
  if(sk.effects.some(e=>e.t==='satan') && has(u,'satan')) return {ok:false,r:'r_armed'};
  if(!isEnabled(u,sid)) return {ok:false, r:'r_locked'};
  if(u.cds[sk.id]>0) return {ok:false, r:'r_cd'};
  if(!affordable(u.t, sk.cost)) return {ok:false, r:'r_mana'};
  if(!validTargets(u,sk).length) return {ok:false, r:'r_target'};
  return {ok:true};
}
function anyAction(t){ return S.teams[t].units.some(u=>u.skills.some(sid=>canUse(u,sid).ok)); }

/* ---- effect resolution: returns an ordered list of UI events ---- */
let EV = [];
function ev(o){ EV.push(o); }
function hit(src, tgt, amount, o={}){
  if(!tgt.alive) return 0;
  if(isInv(tgt) && !o.ignoreInv){ ev({k:'block', u:tgt}); return 0; }
  let d = amount;
  if(!o.pierce && !o.raw){ d = (d - flatRed(tgt)) * ratio(tgt); }
  if(!o.raw) d -= unpRed(tgt);
  d = Math.max(0, Math.trunc(d));
  d=Math.min(tgt.hp,d);
  tgt.hp = Math.max(0, tgt.hp - d);
  if(src && src.t!==tgt.t) src.dealt += d;
  ev({k:'dmg', u:tgt, v:d, pierce:o.pierce, big:d>=40});
  if(tgt.hp<=0) die(tgt);
  return d;
}
function heal(src, tgt, v){
  if(!tgt.alive) return;
  const before=tgt.hp; tgt.hp=Math.min(100,tgt.hp+v); const h=tgt.hp-before; src.healed+=h;
  ev({k:'heal', u:tgt, v:h});
}
function die(u){
  if(!u.alive) return;
  u.alive=false; u.hp=0; u.stun=0; u.skip=false;
  const satan = has(u,'satan');
  u.st=[];
  ev({k:'death', u});
  if(satan){
    ev({k:'satan', u});
    S.teams[1-u.t].units.filter(e=>e.alive).forEach(e=>{ const d=Math.min(e.hp,40); e.hp=Math.max(0,e.hp-40); u.dealt+=d; ev({k:'dmg',u:e,v:d,pierce:true,big:true}); if(e.hp<=0) die(e); });
  }
}
function addStatus(u, s){
  if(!u.alive) return;
  u.st.push(s); ev({k:'status',u,s});
}
function applyEffect(caster, sk, e, tgt){
  const tag = {from:sk.id, icon:sk.icon, src:caster.cid, srcT:caster.t, srcI:caster.i};
  const pow = base=>{ const b=boostOf(caster, sk.id); return Math.trunc(base*b.mult + b.add) + atkBonus(caster); };
  switch(e.t){
    case 'dmg': hit(caster, tgt, e.raw? e.v : pow(e.v), {pierce:e.pierce, ignoreInv:e.ignoreInv, raw:e.raw}); break;
    case 'dot': {
      const v=pow(e.v); hit(caster, tgt, v, {pierce:e.pierce,ignoreInv:e.ignoreInv});
      if(tgt.alive && e.hits>1) addStatus(tgt, {...tag, k:'dot', v, left:e.hits-1, srcT:caster.t, srcI:caster.i, pierce:e.pierce, ignoreInv:e.ignoreInv, nextTick:S.T+2, exp:exp(e)});
      break; }
    case 'heal': heal(caster, tgt, e.v); break;
    case 'stun':
      if(!tgt.alive) break;
      if(isInv(tgt)&&!e.ignoreInv){ ev({k:'block',u:tgt}); break; }
      if(noStun(tgt)){ ev({k:'text',u:tgt,txt:L('immune'),c:'#7fe8ff'}); break; }
      caster.support+=Math.max(0,e.n-tgt.stun)*15; tgt.stun=Math.max(tgt.stun, e.n); ev({k:'stun',u:tgt,n:e.n}); break;
    case 'manopuntura': addStatus(tgt,{...tag,k:'inv',exp:exp(e)}); addStatus(tgt,{...tag,k:'delayed',v:e.v,due:S.T+e.delay,exp:exp(e)}); break;
    case 'inv': caster.support+=tgt.hp<60?20:5; addStatus(tgt,{...tag,k:'inv',exp:exp(e)}); break;
    case 'dred': addStatus(tgt,{...tag,k:'dred',v:e.v,exp:exp(e)}); break;
    case 'dratio': addStatus(tgt,{...tag,k:'dratio',v:e.v,exp:exp(e)}); break;
    case 'unp': addStatus(tgt,{...tag,k:'unp',v:e.v,exp:exp(e)}); break;
    case 'atk': addStatus(tgt,{...tag,k:'atk',v:e.v,exp:exp(e)}); break;
    case 'atkPerm': tgt.atkPerm+=e.v; ev({k:'text',u:tgt,txt:'+'+e.v+' ATK',c:'#ffb35c',sm:true}); break;
    case 'nostun': caster.support+=tgt.stun*10; tgt.stun=0; tgt.skip=false; addStatus(tgt,{...tag,k:'nostun',exp:exp(e)}); break;
    case 'res': addStatus(tgt,{...tag,k:'res',v:e.v,exp:exp(e)}); break;
    case 'enable': addStatus(tgt,{...tag,k:'enable',skill:e.skill,exp:exp(e)}); ev({k:'unlock',u:tgt,skill:e.skill}); break;
    case 'boost': addStatus(tgt,{...tag,k:'boost',skill:e.skill,mult:e.mult||1,add:e.add||0,exp:exp(e)}); break;
    case 'cdUp': if(!tgt.alive||isInv(tgt)) break; Object.keys(tgt.cds).forEach(k=>{ if(tgt.cds[k]>0||!e.onlyIfNotZero) tgt.cds[k]+=e.v; }); ev({k:'text',u:tgt,txt:'+'+e.v+' CD',c:'#c9a7ff',sm:true}); break;
    case 'halfHp': tgt.hp=Math.max(0,Math.floor(tgt.hp*e.multiply)+e.increase); ev({k:'dmg',u:tgt,v:0,half:true}); if(!tgt.hp)die(tgt); break;
    case 'mark': if(tgt.alive && !isInv(tgt)) addStatus(tgt,{...tag,k:'mark',exp:exp(e)}); break;
    case 'satan': addStatus(tgt,{...tag,k:'satan',exp:Infinity}); break;
    case 'swap': tgt.skills = tgt.skills.map(s=>SWAPS[s]||s); ev({k:'text',u:tgt,txt:L('drunk'),c:'#ffcf5c'}); ev({k:'swap',u:tgt}); break;
    case 'locura': {
      ev({k:'text',u:caster,txt:L('madness'),c:'#e58bff'});
      const pool = [caster,...enemies(caster)].filter(u=>u.alive);
      const victim = pick(pool); if(victim){ if(victim!==caster) caster.dealt+=victim.hp; ev({k:'dmg',u:victim,v:victim.hp,big:true}); die(victim); }
      break; }
    case 'neck': { const m=tgt.st.some(s=>s.k==='mark'&&s.src===caster.cid&&s.srcT===caster.t); hit(caster, tgt, pow(e.v)*(m?2:1), {pierce:true}); break; }
  }
}
function recipients(caster, sk, e, target){
  const to = e.to || ({enemy:'target', ally:'target', self:'self', allEnemies:'allEnemies', allAllies:'allAllies'})[sk.target];
  if(to==='self') return [caster];
  if(to==='allEnemies') return enemies(caster);
  if(to==='allAllies') return allies(caster);
  return [target];
}
function useSkill(u,sid,target,extra=null){
  if(!S || !u || !S.teams[u.t]?.units.includes(u))return {ok:false,r:'r_target',events:[],paid:{}};
  const valid=canUse(u,sid), sk=skillOf(u.cid,sid);
  if(!valid.ok)return {...valid,events:[],paid:{}};
  if(!validTargets(u,sk).includes(target))return {ok:false,r:'r_target',events:[],paid:{}};
  const paid=pay(u.t,sk.cost,extra);
  if(!paid)return {ok:false,r:'r_mana',events:[],paid:{}};
  sid=sk.id;
  // acted already prevents a second move. Zero-CD skills must stay at zero:
  // a synthetic 1 would let Krishna delay a skill that has no cooldown.
  EV=[]; u.cds[sid]=sk.cd>0?sk.cd+1:0; u.acted=true;
  S.log.push({t:u.t,cid:u.cid,sid,target:sk.target==='enemy'||sk.target==='ally'?target.cid:sk.target});
  if(S.log.length>100)S.log.shift();
  for(const e of sk.effects){for(const r of recipients(u,sk,e,target)){if(r)applyEffect(u,sk,e,r);}}
  checkWin();
  return {ok:true,events:EV,paid};
}
function checkWin(){
  if(S.over) return;
  const deadA = S.teams[0].units.every(x=>!x.alive), deadB = S.teams[1].units.every(x=>!x.alive);
  if(deadA||deadB){ S.over=true; S.winner = deadA&&deadB ? 'draw' : (deadA?1:0); }
}
/* Begin the active team's turn; returns events (DoT ticks etc). */
function beginTurn(){
  if(!S || S.over || S.turnStarted)return {events:[],gained:{F:0,R:0,P:0,E:0}};
  S.turnStarted=true; EV=[]; const t=S.active;
  S.teams.forEach(tm=>tm.units.forEach(u=>{ u.st = u.st.filter(s=> s.exp==null || s.exp===Infinity || s.exp > S.T); }));
  // Snapshot stun before ticking: a periodic death must not clear a caster's
  // stun early and make other simultaneous ticks depend on roster order.
  const stunned=new Set(S.teams.flatMap(tm=>tm.units).filter(sourceStunned));
  // Skipped ticks consume their scheduled opportunity; never defer or catch up.
  S.teams.forEach(tm=>tm.units.forEach(u=>{
    for(const s of u.st.slice()){
      if(!u.alive)break;
      if(s.k==='dot' && s.left>0 && s.nextTick<=S.T){
        if(!isPeriodicSuppressed(s,u,stunned))hit(U(s.srcT,s.srcI),u,s.v,{pierce:s.pierce,ignoreInv:s.ignoreInv});
        s.left--; s.nextTick+=2;
      }
      if(s.k==='delayed' && s.due<=S.T){hit(null,u,s.v,{raw:true,ignoreInv:true});s.exp=S.T;}
    }
    u.st=u.st.filter(s=>s.exp>S.T && !(s.k==='dot'&&s.left<=0));
  }));
  checkWin();
  const tm=S.teams[t];
  tm.units.forEach(u=>{
    u.acted=false;
    if(!u.alive){ u.skip=false; return; }
    if(noStun(u)) u.stun=0;
    u.skip = u.stun>0; if(u.skip) u.stun--;
    if(S.turnsTaken[t]>0)Object.keys(u.cds).forEach(k=>{ if(u.cds[k]>0)u.cds[k]--; });
  });
  S.turnsTaken[t]++;
  const gained={F:0,R:0,P:0,E:0};
  const n = S.over?0:tm.units.filter(u=>u.alive).reduce((a,u)=>a+1+sum(u,'res'),0);
  for(let i=0;i<n;i++){ const k=pick(MANA); tm.mana[k]++; gained[k]++; }
  return {events:EV, gained};
}
function endTurnState(){ if(!S||S.over||!S.turnStarted)return false; S.teams[S.active].units.forEach(u=>u.skip=false); S.T++; S.active=1-S.active; S.turnStarted=false; return true; }

/* ===================== CPU opponent ===================== */
function estimateHit(src, tgt, base, o={}){
  if(!tgt.alive) return 0;
  if(isInv(tgt)&&!o.ignoreInv) return 0;
  let d=base; if(!o.pierce&&!o.raw) d=(d-flatRed(tgt))*ratio(tgt); if(!o.raw) d-=unpRed(tgt);
  return Math.max(0,Math.min(tgt.hp,Math.trunc(d)));
}
function scoreAction(u, sid, target){
  const sk=skillOf(u.cid,sid); let s=0;
  const b=boostOf(u,sid), pow=v=>v*b.mult+b.add+atkBonus(u);
  const threat = e=>e.alive && !e.skip ? 1 : .35;
  for(const e of sk.effects){
    for(const r of recipients(u,sk,e,target)){
      if(!r||!r.alive) continue;
      const enemy = r.t!==u.t;
      switch(e.t){
        case 'dmg': { if(!enemy) { s-= e.v*.8; if(r.hp<=e.v+5) s-=200; break; }
          const d=estimateHit(u,r,pow(e.v),e); s+=d*1.1 + (d>=r.hp?70:0) + (100-r.hp)*.15; break; }
        case 'dot': { const d=estimateHit(u,r,pow(e.v),e); s+=d*(e.hits>99?3:e.hits)*.85 + (d>=r.hp?60:0); break; }
        case 'neck': { const m=has(r,'mark'); const d=estimateHit(u,r,pow(e.v)*(m?2:1),{pierce:true}); s+=d*1.1+(d>=r.hp?80:0); break; }
        case 'heal': { const miss=100-r.hp; s+= Math.min(miss,e.v)*(r.hp<45?1.6:1) - (miss<e.v*.4?15:0); break; }
        case 'stun': if(!isInv(r)&&!noStun(r)&&r.stun<e.n) s+= 20*e.n*threat(r)*(r.hp>25?1:.5); break;
        case 'inv': { if(isInv(r)) { s-=10; break; } const danger = r.hp<55 ? 45 : r.hp<80?14:4; s+=danger*(e.r||1)*.8; break; }
        case 'dred': case 'unp': s+= has(r,e.t)?2:e.v*1.4; break;
        case 'dratio': s+= has(r,'dratio')?2:(r.hp<70?50:28); break;
        case 'atk': s+= has(r,'atk')?2:8; break;
        case 'atkPerm': s+= 14; break;
        case 'nostun': s+= noStun(r)?2:(r.stun>0?22:9); break;
        case 'res': s+= 16; break;
        case 'enable': s+= u.st.some(x=>x.k==='enable'&&x.skill===e.skill)?2:22; break;
        case 'boost': s+= u.st.some(x=>x.k==='boost'&&x.skill===e.skill)?2:14; break;
        case 'cdUp': s+= Object.values(r.cds).filter(v=>v>0).length*6; break;
        case 'halfHp': s-= r.hp*.35; if(r.hp<40) s-=60; break;
        case 'mark': s+= 12; break;
        case 'satan': s+= has(r,'satan')?-40:(r.hp<60?42:20); break;
        case 'swap': { const toAlt = r.skills.includes('rocas'); s+= toAlt ? (u.cds.locura===0?30:14) : 8; break; }
        case 'locura': {const n=enemies(u).length;s+=(n*65-90)/(n+1);break;}
        case 'manopuntura': s+=r.hp<50?25:3; break;
        case 'ko': s+= 6; break;
      }
    }
  }
  const c=sk.cost; const spent=(c.F||0)+(c.R||0)+(c.P||0)+(c.E||0)+(c.C||0);
  s -= spent*5;
  return s + rnd(-6,6);
}
function cpuPick(t){
  const opts=[];
  S.teams[t].units.forEach(u=>{ u.skills.forEach(sid=>{ if(!canUse(u,sid).ok) return; const sk=skillOf(u.cid,sid);
    const tg = (sk.target==='enemy'||sk.target==='ally') ? validTargets(u,sk) : [validTargets(u,sk)[0]];
    tg.forEach(x=>opts.push({u, sid, target:x, score:scoreAction(u,sid,x)})); }); });
  opts.sort((a,b)=>b.score-a.score);
  return opts[0] && opts[0].score>4 ? opts[0] : null;
}


export function serializeBattle(ui={}){
  return JSON.stringify({version:2,battle:S,ui},(_k,v)=>v===Infinity?'__infinity__':v);
}
export function restoreBattle(json){
  const saved=JSON.parse(json,(_k,v)=>v==='__infinity__'?Infinity:v), b=saved.battle;
  const fail=()=>{throw Error('Invalid battle save');},count=v=>Number.isSafeInteger(v)&&v>=0;
  if(saved.version!==2||!b||!['local','cpu','online'].includes(b.mode)||b.teams?.length!==2||![0,1].includes(b.active)||!count(b.T)||typeof b.over!=='boolean'||typeof b.turnStarted!=='boolean')fail();
  if(b.over?![0,1,'draw'].includes(b.winner):b.winner!==null)fail();
  if(b.turnsTaken?.length!==2||!b.turnsTaken.every(count)||b.turnsTaken[0]+b.turnsTaken[1]!==b.T+Number(b.turnStarted))fail();
  if(!Array.isArray(b.log)||!Array.isArray(b.history)||b.picks?.length!==2)fail();
  const statusKinds=new Set(['dot','delayed','inv','dred','dratio','unp','atk','nostun','res','enable','boost','mark','satan']);
  for(const [t,tm] of b.teams.entries()){
    if(tm.units?.length!==3||!tm.mana||MANA.some(k=>!count(tm.mana[k])))fail();
    if(new Set(tm.units.map(u=>u.cid)).size!==3||JSON.stringify(b.picks[t])!==JSON.stringify(tm.units.map(u=>u.cid)))fail();
    for(const [i,u] of tm.units.entries()){
      if(!CHAR[u.cid]||u.t!==t||u.i!==i||!count(u.hp)||u.hp>100||typeof u.alive!=='boolean'||u.alive!==(u.hp>0)||!Array.isArray(u.st))fail();
      if(!count(u.stun)||typeof u.skip!=='boolean'||typeof u.acted!=='boolean'||['atkPerm','dealt','healed','support'].some(k=>!count(u[k])))fail();
      const c=CHAR[u.cid],skills=[...c.skills,...(c.alts||[])],normal=c.skills.map(s=>s.id),alternate=normal.map(s=>SWAPS[s]||s);
      if(![JSON.stringify(normal),JSON.stringify(alternate)].includes(JSON.stringify(u.skills))||!u.cds||skills.some(s=>!count(u.cds[s.id]))||Object.keys(u.cds).some(id=>!skillOf(u.cid,id)))fail();
      for(const s of u.st){
        if(!s||!statusKinds.has(s.k)||!(s.exp===Infinity||count(s.exp)))fail();
        const src=b.teams[s.srcT]?.units?.[s.srcI];
        if(!src||s.src!==src.cid||!skillOf(src.cid,s.from))fail();
        if(['dot','delayed','dred','unp','atk','res'].includes(s.k)&&!count(s.v))fail();
        if(s.k==='dratio'&&(!Number.isFinite(s.v)||s.v<0||s.v>1))fail();
        if(['enable','boost'].includes(s.k)&&!skillOf(u.cid,s.skill))fail();
        if(s.k==='boost'&&(!Number.isFinite(s.mult)||s.mult<0||!Number.isFinite(s.add)))fail();
        if(s.k==='dot'&&(!count(s.left)||!count(s.nextTick)))fail();
        if(s.k==='delayed'&&!count(s.due))fail();
      }
    }
  }
  if(b.log.some(e=>!e||![0,1].includes(e.t)||!skillOf(e.cid,e.sid)||typeof e.target!=='string')||b.history.some(e=>!e||!count(e.turn)||typeof e.text!=='string'))fail();
  // Repair the previous build's synthetic cooldowns and consumed stun flags
  // when an otherwise valid v2 match is resumed; no actions are replayed.
  for(const [t,tm] of b.teams.entries())for(const u of tm.units){
    for(const id of Object.keys(u.cds))if(skillOf(u.cid,id).cd===0)u.cds[id]=0;
    if(t!==b.active||!b.turnStarted)u.skip=false;
  }
  S=b;return saved.ui||{};
}
export function clearBattle(){S=null;}
export {isEnabled,newBattle,U,allies,enemies,has,sum,isInv,noStun,isPeriodicSuppressed,roundsLeft,canUse,anyAction,validTargets,useSkill,beginTurn,endTurnState,cpuPick,payment,checkWin,hit,applyEffect,addStatus,atkBonus,boostOf,estimateHit};
