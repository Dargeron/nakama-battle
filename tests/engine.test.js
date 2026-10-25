import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../dist/engine.js';
import {CHARS,skillOf,MANA} from '../dist/catalog.js';
import {DATA} from '../dist/game-data.js';
const setup=(a=['albert','oksana','maria'],b=['aimar','joey','irmina'],rng=()=>.4)=>{
 E.configureEngine({rng});E.newBattle('local',a,b,{firstTeam:0});E.beginTurn();
 E.S.teams.forEach(t=>t.mana={F:50,R:50,P:50,E:50});return E.S;
};
const u=(t,i)=>E.U(t,i);
function cast(t,i,id,tt,ti,extra=null){const sk=skillOf(u(t,i).cid,id);assert.ok(sk,'known skill '+id);const r=E.useSkill(u(t,i),sk.id,u(tt,ti),extra);assert.equal(r.ok,true,r.r);return r;}
function next(){E.endTurnState();return E.beginTurn();}
function refill(){E.S.teams.forEach(t=>t.mana={F:50,R:50,P:50,E:50});}

test('ten characters and all 42 abilities retain original artwork, prose, costs and cooldowns',()=>{
 assert.equal(CHARS.length,10);let n=0;
 for(const c of CHARS)for(const s of [...c.skills,...(c.alts||[])]){n++;const a=DATA.attacks[s.originalId];assert.equal(s.description,a.description);assert.equal(s.image,a.image);assert.deepEqual([...MANA,'C'].map(k=>s.cost[k]),a.cost);assert.equal(s.cd,a.cooldown);assert.equal(s.startCd,s.originalId===555?0:a.initialCooldown);assert.ok(s.effects.length);}
 assert.equal(n,42);
});
test('immediate damage and spending happen once, without queue or undo',()=>{
 const b=setup();cast(0,0,679,1,0);assert.equal(u(1,0).hp,80);assert.equal(b.teams[0].mana.F,49);assert.equal(b.active,0);assert.equal(b.queue,undefined);
 assert.equal(E.useSkill(u(0,0),'sillazo',u(1,0)).ok,false);assert.equal(u(1,0).hp,80);
});
test('manual generic payment is exact and invalid payment never mutates state',()=>{
 const b=setup();b.teams[0].mana={F:0,R:1,P:0,E:2};const before=JSON.stringify(b);
 assert.equal(E.useSkill(u(0,0),skillOf('albert',701).id,u(0,0),[0,0,0,0]).ok,false);assert.equal(JSON.stringify(b),before);
 cast(0,0,701,0,0,[0,0,0,1]);assert.deepEqual(b.teams[0].mana,{F:0,R:0,P:0,E:1});
});
test('single-turn stun skips exactly one enemy action turn',()=>{
 setup();cast(0,0,679,1,0);next();assert.equal(u(1,0).skip,true);assert.equal(E.canUse(u(1,0),skillOf('aimar',663).id).r,'r_stun');next();next();assert.equal(u(1,0).skip,false);
});
test('invulnerability blocks an immediate attack and expires',()=>{
 setup();cast(0,0,596,0,0);assert.equal(E.isInv(u(0,0)),true);next();cast(1,0,663,0,0);assert.equal(u(0,0).hp,100);next();next();assert.equal(E.isInv(u(0,0)),false);
});
test('Que va bypasses invulnerability for damage and stun',()=>{
 setup(['aimar','joey','irmina'],['albert','maria','olmo']);cast(0,0,695,0,0);next();cast(1,0,711,0,0);assert.equal(u(0,0).hp,80);assert.equal(u(0,0).stun,1);
});
test('stun immunity prevents stun while retaining damage',()=>{
 setup(['albert','aimar','joey'],['albert','maria','olmo']);cast(0,0,701,0,0);next();cast(1,0,679,0,1);assert.equal(u(0,1).hp,80);assert.equal(u(0,1).stun,0);
});
test('Oksana mark doubles neck-breaking damage',()=>{
 setup();cast(0,1,658,1,0);next();next();cast(0,1,640,1,0);assert.equal(u(1,0).alive,false);
});
test('Irmina transformation swaps both skills and restores originals',()=>{
 setup(['irmina','albert','miriam']);cast(0,0,681,0,0);assert.deepEqual(u(0,0).skills.slice(0,2),['muerdo','locura']);next();next();cast(0,0,681,0,0);assert.deepEqual(u(0,0).skills.slice(0,2),['rocas','amigos']);
});
test('Felipe unlock and damage buff do not compound over ticks',()=>{
 setup(['felipe','albert','miriam']);cast(0,0,613,0,0);assert.equal(E.canUse(u(0,0),skillOf('felipe',635).id).r,'r_acted');next();next();cast(0,0,708,1,0);assert.equal(u(1,0).hp,70);assert.equal(E.boostOf(u(0,0),skillOf('felipe',708).id).add,15);
});
test('Argumentemos preserves the established one-turn stun correction',()=>{
 setup(['felipe','albert','miriam']);cast(0,0,613,0,0);next();next();cast(0,0,635,1,0);assert.equal(u(1,0).hp,55);assert.equal(u(1,0).stun,1);
});
test('Anticristo arms only once and retaliates exactly once',()=>{
 setup();cast(0,2,699,0,2);next();next();assert.equal(E.canUse(u(0,2),skillOf('maria',699).id).r,'r_armed');E.hit(null,u(0,2),100,{raw:true,ignoreInv:true});assert.ok(E.S.teams[1].units.every(x=>x.hp===60));E.hit(null,u(0,2),100,{raw:true});assert.ok(E.S.teams[1].units.every(x=>x.hp===60));
});
test('Anticristo can make both last surviving characters die: draw',()=>{
 setup(['maria','albert','joey'],['albert','miriam','olmo']);cast(0,0,699,0,0);
 for(const t of [0,1])for(const i of [1,2])E.hit(null,u(t,i),100,{raw:true,ignoreInv:true});
 u(0,0).hp=20;u(1,0).hp=40;next();cast(1,0,679,0,0);assert.equal(E.S.winner,'draw');assert.equal(E.S.over,true);
});
test('damage over time ticks every two half-turns, even after caster death',()=>{
 setup(['miriam','albert','aimar']);cast(0,0,638,1,0);assert.equal(u(1,0).hp,87);E.hit(null,u(0,0),100,{raw:true});next();assert.equal(u(1,0).hp,87);next();assert.equal(u(1,0).hp,74);
});
test('two-tick attacks stop after their recovered duration',()=>{
 setup(['joey','albert','aimar']);cast(0,0,527,1,0);assert.equal(u(1,0).hp,80);next();next();assert.equal(u(1,0).hp,60);next();next();assert.equal(u(1,0).hp,60);
});
test('healing is capped and never scales with attack bonuses',()=>{
 setup(['joey','aimar','albert']);u(0,0).hp=85;u(0,0).atkPerm=100;cast(0,0,724,0,0);assert.equal(u(0,0).hp,100);assert.equal(u(0,0).healed,15);
});
test('reduction cannot turn damage into healing and piercing still meets absolute protection',()=>{
 setup();u(1,0).hp=80;E.addStatus(u(1,0),{k:'dred',v:100,exp:100});E.hit(u(0,0),u(1,0),10);assert.equal(u(1,0).hp,80);E.addStatus(u(1,0),{k:'unp',v:10,exp:100});E.hit(u(0,0),u(1,0),30,{pierce:true});assert.equal(u(1,0).hp,60);
});
test('Voluntad starts ready, preserves its health/boost effects and reuse cooldown; Locura still starts at five',()=>{
 setup(['olmo','irmina','albert']);const sk=skillOf('olmo',555);assert.equal(u(0,0).cds.voluntad,0);assert.equal(E.canUse(u(0,0),sk.id).ok,true);assert.equal(u(0,1).cds.locura,5);
 cast(0,0,555,0,0);assert.equal(u(0,0).hp,50);assert.equal(E.boostOf(u(0,0),'bastardos').mult,2);assert.equal(E.isInv(u(0,0)),true);assert.equal(u(0,0).cds.voluntad,sk.cd+1);
 next();next();assert.equal(u(0,0).cds.voluntad,6);assert.equal(u(0,1).cds.locura,4);
});
test('Conspiracy Theories has no added random knockout',()=>{
 setup(['joey','albert','aimar'],['maria','olmo','felipe'],()=>0);cast(0,0,527,1,0);assert.equal(u(1,0).hp,80);assert.equal(u(1,0).alive,true);
});
test('Locura chooses uniformly from caster plus living enemies',()=>{
 setup(['irmina','albert','aimar'],['maria','olmo','felipe'],()=>.3);
 E.hit(null,u(1,1),100,{raw:true});E.hit(null,u(1,2),100,{raw:true});u(0,0).skills=['locura'];u(0,0).cds.locura=0;
 cast(0,0,727,0,0);assert.equal(u(0,0).alive,false);assert.equal(u(1,0).alive,true);
});
test('Manopuntura protects immediately, applies delayed ten damage and then expires',()=>{
 setup(['olmo','albert','aimar']);cast(0,0,546,0,1);assert.equal(E.isInv(u(0,1)),true);assert.equal(u(0,1).hp,100);next();assert.equal(u(0,1).hp,90);next();next();assert.equal(E.isInv(u(0,1)),false);assert.equal(u(0,1).hp,90);
});
test('matching characters are allowed across teams, not within one team',()=>{
 const team=['albert','maria','irmina'];setup(team,team);assert.equal(u(0,0).cid,u(1,0).cid);assert.notEqual(u(0,0),u(1,0));assert.throws(()=>E.newBattle('local',['albert','albert','maria'],team));
});
test('round 21 and beyond never cause sudden-death damage',()=>{
 setup();for(let i=0;i<60;i++)next();assert.ok(E.S.teams.flatMap(t=>t.units).every(x=>x.hp===100));assert.equal(E.S.over,false);
});
test('save restores actions, clock and permanent effects without replay or extra chakra',()=>{
 setup();cast(0,2,699,0,2);const before=E.serializeBattle({remaining:17.4});E.clearBattle();assert.deepEqual(E.restoreBattle(before),{remaining:17.4});assert.equal(u(0,2).acted,true);assert.equal(u(0,2).st[0].exp,Infinity);const pools=JSON.stringify(E.S.teams.map(t=>t.mana));E.beginTurn();assert.equal(JSON.stringify(E.S.teams.map(t=>t.mana)),pools);assert.equal(E.serializeBattle({remaining:17.4}),before);
});
test('invalid targets, dead targets and enemy actors cannot spend resources',()=>{
 setup();const sk=skillOf('albert',679).id;const before=E.serializeBattle();assert.equal(E.useSkill(u(0,0),sk,u(0,1)).ok,false);assert.equal(E.serializeBattle(),before);assert.equal(E.useSkill(u(1,0),skillOf('aimar',663).id,u(0,0)).ok,false);E.hit(null,u(1,1),100,{raw:true});assert.equal(E.useSkill(u(0,0),sk,u(1,1)).ok,false);
});
test('every one of the 42 ability execution paths preserves valid combat state',()=>{
 let paths=0;
 for(const c of CHARS)for(const sk of [...c.skills,...(c.alts||[])]){
  const helpers=CHARS.filter(x=>x.id!==c.id).slice(0,2).map(x=>x.id);setup([c.id,...helpers],['albert','maria','joey']);
  const actor=u(0,0);actor.skills=[sk.id];actor.cds[sk.id]=0;if(sk.locked)actor.st.push({k:'enable',skill:sk.id,exp:100});
  const target=E.validTargets(actor,sk)[0];const r=E.useSkill(actor,sk.id,target);assert.equal(r.ok,true,c.id+' '+sk.name+' '+r.r);paths++;
  for(let i=0;i<4&&!E.S.over;i++)next();
  for(const x of E.S.teams.flatMap(t=>t.units))assert.ok(Number.isFinite(x.hp)&&x.hp>=0&&x.hp<=100,sk.name);
  assert.ok(E.S.teams.every(t=>MANA.every(k=>t.mana[k]>=0)));
 }
 assert.equal(paths,42);
});
test('30 seeded AI battles exercise the roster with legal instant actions',()=>{
 let finished=0,maxTurns=0;
 for(let seed=1;seed<=30;seed++){
  let state=seed;const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);
  E.configureEngine({rng});const ids=CHARS.map(c=>c.id);const a=[0,1,2].map(i=>ids[(seed+i)%10]),b=[0,1,2].map(i=>ids[(seed+4+i)%10]);E.newBattle('cpu',a,b,{firstTeam:seed%2});E.beginTurn();
  for(let t=0;t<300&&!E.S.over;t++){
   for(let i=0;i<3;i++){const choice=E.cpuPick(E.S.active);if(!choice)break;const r=E.useSkill(choice.u,choice.sid,choice.target);assert.equal(r.ok,true);if(E.S.over)break;}
   if(!E.S.over)next();
   assert.ok(E.S.teams.flatMap(t=>t.units).every(x=>Number.isFinite(x.hp)&&x.hp>=0&&x.hp<=100));assert.ok(E.S.teams.every(t=>MANA.every(k=>t.mana[k]>=0)));
  }
  if(E.S.over)finished++;maxTurns=Math.max(maxTurns,E.S.T);
 }
 assert.equal(finished,30,`finished ${finished}/30, longest ${maxTurns} half-turns`);
});

test('numeric original ability IDs cannot bypass cooldowns or enabled-skill checks',()=>{
 setup();cast(0,0,596,0,0);next();next();const before=E.serializeBattle();
 assert.equal(E.canUse(u(0,0),596).r,'r_cd');assert.equal(E.useSkill(u(0,0),596,u(0,0)).ok,false);assert.equal(E.serializeBattle(),before);
 setup(['felipe','albert','miriam']);assert.equal(E.isEnabled(u(0,0),635),false);cast(0,0,613,0,0);assert.equal(E.isEnabled(u(0,0),635),true);
 next();next();assert.equal(E.useSkill(u(0,0),635,u(1,0)).ok,true);assert.equal(u(0,0).cds.argumentemos,2);assert.equal(u(0,0).cds[635],undefined);
});
test('no action or second pass is accepted before the next turn begins',()=>{
 E.newBattle('local',['albert','maria','olmo'],['albert','maria','olmo'],{firstTeam:0});
 assert.equal(E.canUse(u(0,0),'inv').r,'r_wait');assert.equal(E.endTurnState(),false);E.beginTurn();
 assert.equal(E.endTurnState(),true);assert.equal(E.endTurnState(),false);assert.equal(E.S.T,1);assert.equal(E.canUse(u(1,0),'inv').r,'r_wait');
 const stale=u(0,0);setup();assert.equal(E.canUse(stale,'inv').r,'r_target');
});
test('Krishna delays real cooldowns but never zero-cooldown attacks, used or unused',()=>{
 setup(['albert','joey','olmo'],['maria','miriam','aimar']);cast(0,0,679,1,2);assert.equal(u(0,0).cds.sillazo,0);
 cast(0,1,534,0,1);next();cast(1,0,660,0,0);assert.equal(u(0,0).cds.sillazo,0);assert.equal(u(0,0).cds.queva,0);
 next();assert.equal(E.canUse(u(0,0),'sillazo').ok,true);
 next();u(1,0).cds.krishna=0;cast(1,0,660,0,1);assert.equal(u(0,1).cds.inv,6);
});
test('a consumed stun ends with the skipped turn and does not linger into the opponent turn',()=>{
 setup();cast(0,0,679,1,0);next();assert.equal(u(1,0).skip,true);assert.equal(u(1,0).stun,0);
 next();assert.equal(u(1,0).skip,false);assert.equal(u(1,0).stun,0);
});
test('Locura opening cooldown ticks while hidden and Borracha neither copies nor restarts it',()=>{
 setup(['irmina','albert','olmo'],['irmina','maria','aimar']);const ir=u(0,0);
 assert.equal(ir.cds.locura,5);cast(0,0,681,0,0);assert.equal(ir.cds.locura,5);assert.equal(ir.cds.borracha,0);
 next();next();assert.equal(ir.cds.locura,4);cast(0,0,681,0,0);assert.equal(ir.skills[1],'amigos');
 next();next();assert.equal(ir.cds.locura,3);cast(0,0,722,1,0);assert.equal(ir.cds.amigos,4);
 next();next();assert.equal(ir.cds.locura,2);cast(0,0,681,0,0);assert.equal(ir.cds.locura,2);assert.equal(ir.cds.amigos,3);
 const saved=E.serializeBattle();E.restoreBattle(saved);assert.equal(u(0,0).cds.locura,2);
 next();next();assert.equal(u(0,0).cds.locura,1);assert.equal(E.canUse(u(0,0),'locura').r,'r_cd');
 next();next();assert.equal(u(0,0).cds.locura,0);assert.equal(E.canUse(u(0,0),'locura').ok,true);
 assert.equal(u(1,0).skills[1],'amigos','opposing Irmina has her own form');
});
test('normal cooldowns block the documented number of subsequent own turns',()=>{
 setup(['maria','joey','albert']);cast(0,0,660,1,0);
 for(let round=1;round<=2;round++){next();next();assert.equal(E.canUse(u(0,0),'krishna').r,'r_cd');}
 next();next();assert.equal(E.canUse(u(0,0),'krishna').ok,true);
});
test('malformed saves are rejected before replacing the current battle',()=>{
 setup();const current=E.S,valid=JSON.parse(E.serializeBattle());
 const corruptions=[b=>delete b.teams[0].units[0].cds,b=>b.teams[0].units[0].skills=['locura'],b=>b.teams[0].units[0].t=1,b=>b.teams[0].units[0].alive=false,b=>b.turnsTaken=[0,0],b=>b.teams[1].mana.F=-1,b=>b.history=null,b=>b.teams[0].units[0].st=[{k:'dot',v:20,left:1,nextTick:2,exp:4,srcT:9,srcI:0}],b=>b.log=[{cid:'missing',sid:'inv',t:0,target:'self'}]];
 for(const corrupt of corruptions){const saved=structuredClone(valid);corrupt(saved.battle);assert.throws(()=>E.restoreBattle(JSON.stringify(saved)));assert.equal(E.S,current);}
});
test('resuming older v2 saves repairs false zero-CD cooldowns and stale stun flags',()=>{
 setup();const saved=JSON.parse(E.serializeBattle());saved.battle.teams[0].units[0].cds.sillazo=3;saved.battle.teams[1].units[0].skip=true;
 E.restoreBattle(JSON.stringify(saved));assert.equal(u(0,0).cds.sillazo,0);assert.equal(u(1,0).skip,false);assert.equal(u(1,2).cds.locura,5);assert.equal(E.S.T,0);
});
test('all 42 abilities and their live statuses survive saves throughout their lifetimes',()=>{
 let paths=0;
 for(const c of CHARS)for(const sk of [...c.skills,...(c.alts||[])]){
   const helpers=CHARS.filter(x=>x.id!==c.id).slice(0,2).map(x=>x.id);setup([c.id,...helpers],['albert','maria','joey']);
   if(c.alts?.some(x=>x.id===sk.id)){cast(0,0,681,0,0);next();next();}
   if(sk.locked){cast(0,0,c.id==='felipe'?613:663,c.id==='felipe'?0:1,0);next();next();}
   u(0,0).cds[sk.id]=0;const result=E.useSkill(u(0,0),sk.id,E.validTargets(u(0,0),sk)[0]);assert.equal(result.ok,true,sk.name);paths++;
   for(let turn=0;turn<7;turn++){
     const saved=E.serializeBattle({remaining:41});E.restoreBattle(saved);assert.equal(E.serializeBattle({remaining:41}),saved,sk.name);
     if(E.S.over)break;next();
   }
 }
 assert.equal(paths,42);
});

test('a three-tick ability loses turns two and three to a two-turn caster stun',()=>{
 setup(['miriam','albert','aimar'],['oksana','joey','irmina']);
 const sk=skillOf('miriam','amor');E.applyEffect(u(0,0),sk,{...sk.effects[0],hits:3,halfTurns:6},u(1,1));assert.equal(u(1,1).hp,87);
 next();cast(1,0,658,0,0);assert.equal(u(0,0).stun,2);
 next();assert.equal(u(0,0).skip,true);assert.equal(u(1,1).hp,87);assert.equal(u(1,1).st.find(s=>s.k==='dot').left,1);
 next();next();assert.equal(u(0,0).skip,true);assert.equal(u(1,1).hp,87);assert.ok(!u(1,1).st.some(s=>s.k==='dot'));
 next();next();assert.equal(u(0,0).skip,false);assert.equal(u(1,1).hp,87,'no deferred damage');
});
test('all four recurring abilities suppress every outward tick while the caster is stunned',()=>{
 for(const [cid,id] of [['alex','furia'],['irmina','rocas'],['joey','conspiracy'],['miriam','amor']]){
  setup([cid,'albert','aimar'],['oksana','joey','irmina']);cast(0,0,id,1,1);const hp=E.S.teams[1].units.map(x=>x.hp),dealt=u(0,0).dealt;
  next();cast(1,0,'duda',0,0);const result=next();
  assert.deepEqual(E.S.teams[1].units.map(x=>x.hp),hp,id);assert.equal(u(0,0).dealt,dealt,id);
  assert.ok(!result.events.some(e=>e.k==='dmg'&&e.u.t===1),id+' must not emit hit animations');
 }
});
test('Amor resumes on schedule after stun, without catching up, including save/restore',()=>{
 setup(['miriam','albert','aimar'],['oksana','joey','irmina']);cast(0,0,'amor',1,1);next();cast(1,0,'duda',0,0);
 E.restoreBattle(E.serializeBattle());next();assert.equal(u(1,1).hp,87);assert.equal(u(0,0).skip,true);
 E.restoreBattle(E.serializeBattle());next();next();assert.equal(u(1,1).hp,87);assert.equal(u(0,0).skip,true);
 next();next();assert.equal(u(0,0).skip,false);assert.equal(u(1,1).hp,74);assert.equal(u(1,1).st.find(s=>s.k==='dot').nextTick,8);
});
test('Lanzarrocas protection stays active while its outward damage is suppressed',()=>{
 setup(['irmina','albert','aimar'],['oksana','joey','maria']);cast(0,0,'rocas',1,1);next();cast(1,0,'duda',0,0);next();
 assert.equal(u(0,0).skip,true);assert.ok(E.has(u(0,0),'dred'));assert.ok(E.S.teams[1].units.every(x=>x.hp===85));
 assert.equal(E.hit(u(1,1),u(0,0),20),10,'damage reduction still applies');next();next();assert.ok(!E.has(u(0,0),'dred'),'protection expires normally');
});
test('Manopuntura protection and delayed health cost are retained when the caster is stunned',()=>{
 setup(['olmo','albert','aimar'],['oksana','joey','maria']);cast(0,0,'manopuntura',0,1);u(0,0).stun=2;
 next();assert.equal(u(0,1).hp,90);assert.equal(E.isInv(u(0,1)),true);next();assert.equal(u(0,0).skip,true);assert.equal(E.isInv(u(0,1)),true);
 assert.equal(E.hit(u(1,1),u(0,1),20),0);next();assert.equal(E.isInv(u(0,1)),false);assert.equal(u(0,1).hp,90);
});
test('target stun does not suppress incoming periodic damage; self effects also keep ticking',()=>{
 setup(['miriam','albert','aimar']);cast(0,0,'amor',1,0);u(1,0).stun=2;next();next();assert.equal(u(1,0).hp,74);
 setup(['miriam','albert','aimar']);const sk=skillOf('miriam','amor');E.applyEffect(u(0,0),sk,{...sk.effects[0],hits:3,halfTurns:6},u(0,0));u(0,0).stun=2;
 next();next();assert.equal(u(0,0).skip,true);assert.equal(u(0,0).hp,74,'self effect survives stun');
});
test('mirror casters have separate stun suppression and immunity prevents suppression',()=>{
 setup(['miriam','albert','aimar'],['miriam','oksana','joey']);cast(0,0,'amor',1,2);next();cast(1,0,'amor',0,2);cast(1,1,'duda',0,0);next();
 assert.equal(u(1,2).hp,87);next();assert.equal(u(0,2).hp,74,'opposing Miriam keeps ticking');
 setup(['miriam','albert','aimar']);cast(0,0,'amor',1,0);
 const sk=skillOf('albert','plan');E.applyEffect(u(0,1),sk,sk.effects.find(e=>e.t==='nostun'),u(0,0));u(0,0).stun=2;
 next();next();assert.equal(u(1,0).hp,74);assert.equal(u(0,0).skip,false);
});
test('periodic suppression uses stun at the boundary, independent of periodic death order',()=>{
 setup(['miriam','albert','aimar'],['joey','oksana','irmina']);cast(0,0,'amor',1,0);
 const sk=skillOf('joey','conspiracy');E.applyEffect(u(1,0),sk,sk.effects[0],u(0,0));u(0,0).hp=10;u(0,0).stun=1;
 next();next();assert.equal(u(0,0).alive,false);assert.equal(u(1,0).hp,87,'death clearing stun cannot revive a suppressed tick');
 next();next();assert.equal(u(1,0).hp,74,'established posthumous periodic damage resumes after stun');
});
