import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import * as Engine from '../dist/engine.js';
import * as Catalog from '../dist/catalog.js';
import {AbilityGesture,allocateFlexible} from '../dist/controls.js';
import {OnlineClient} from '../dist/online.js';
import {DATA} from '../dist/game-data.js';

// Real HTML parsing and event bubbling, with clock/audio/canvas shims.
// This tests application behavior, not CSS rendering or browser audio.
function harness(options={}){
 Engine.clearBattle();
 const {window}=parseHTML(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'));
 const {document}=window,storage=new Map(Object.entries(options.storage||{})),timers=new Map(),listeners=new Map();let now=1000,id=0,active=document.body;
 Object.defineProperty(document,'activeElement',{get:()=>active});document.hidden=false;
 const proto=window.HTMLElement.prototype;
 proto.focus=function(){active=this;};proto.getBoundingClientRect=function(){return {left:10,top:10,width:100,height:100};};
 proto.showModal=function(){this.open=true;this.setAttribute('open','');};proto.close=function(){this.open=false;this.removeAttribute('open');};
 window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({}, {get:(o,k)=>o[k]??(k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const on=(k,fn)=>{if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(fn);};
 const fakeWindow={devicePixelRatio:1,matchMedia:()=>({matches:options.reduced!==false})};
 const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const deps={};for(const m of source.matchAll(/import \{([^}]+)\} from '\.\/([^']+)'/g)){const mod=m[2]==='catalog.js'?Catalog:m[2]==='engine.js'?Engine:m[2]==='online.js'?{OnlineClient}:{AbilityGesture,allocateFlexible};for(const n of m[1].split(',').map(s=>s.trim())){assert.ok(n in mod,'export '+n);deps[n]=mod[n];}}
 const ctx=vm.createContext({...deps,document,window:fakeWindow,innerWidth:options.width||1440,innerHeight:options.height||900,matchMedia:fakeWindow.matchMedia,
  console,crypto:webcrypto,location:options.location,navigator:{clipboard:{writeText:()=>Promise.resolve()}},URLSearchParams,Date,Uint8Array,performance:{now:()=>now},Math,JSON,Number,String,Array,Object,Promise,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  Audio:class{play(){this.playing=true;return Promise.resolve();}pause(){this.playing=false;}},
  addEventListener:on,requestAnimationFrame(){},cancelAnimationFrame(){},
  setTimeout(fn,ms=0){const key=++id;timers.set(key,{fn,at:now+ms});return key;},clearTimeout:k=>timers.delete(k),setInterval(){return ++id;},clearInterval(){}});
 Object.defineProperty(ctx,'S',{get:()=>Engine.S});
 vm.runInContext(source.replace(/^import .*;\n/gm,'')+`\nglobalThis.api={startBattle,onSkillTap,onUnitTap,inspectSkill,commit,clearPick,openPause,closeModal,endTurn,buildBoard,update,openSettings,openHowTo,openCharInfo,openSelect,choose,renderSelect,openHistory,resumeBattle,saveBattle,scheduleAutoPass,drawTimer,timerLoop,finish,adjustPayment,gesture,FX,AUDIO,joinOnline,leaveOnline,openOnline,onlineSend,applyOnlineState,humanTurn,getNet:()=>NET,getPick:()=>PICK,getBusy:()=>BUSY,getPaused:()=>PAUSED,getSettings:()=>SETTINGS,getTimer:()=>TIMER,getScreen:()=>SCREEN,getSelection:()=>SEL};`,ctx);
 ctx.api.FX.beam=()=>Promise.resolve();Engine.configureEngine({rng:()=>.01});
 function event(el,type='click',detail=1){const e=new window.Event(type,{bubbles:true,cancelable:true});e.detail=detail;el.dispatchEvent(e);}
 const query=s=>document.querySelector(s);
 const click=(s,detail=1)=>{const el=typeof s==='string'?query(s):s;assert.ok(el,'click target '+s);event(el,'click',detail);};
 async function micro(){for(let i=0;i<16;i++)await Promise.resolve();}
 async function advance(ms){const until=now+ms;for(let count=0;count<1000;count++){await micro();let next=null;for(const [key,t] of timers){if(t.at<=until&&(!next||t.at<next[1].at))next=[key,t];}if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn();if(count===999)throw Error('Timer loop did not settle');}now=until;await micro();}
 const key=(el,k)=>{const e=new window.Event('keydown',{bubbles:true,cancelable:true});e.key=k;el.dispatchEvent(e);};
 return {api:ctx.api,query,click,key,event,advance,micro,storage,document,timers,get now(){return now;},globalKey:k=>listeners.get('keydown')?.forEach(fn=>fn({key:k}))};
}
async function ready(a=['albert','olmo','irmina'],b=['aimar','joey','maria']){
 const h=harness();h.api.startBattle('local',a,b);h.click('#c-go');await h.micro();
 Engine.S.teams.forEach(t=>t.mana={F:20,R:20,P:20,E:20});h.api.update();return h;
}
const actor=(t=0,i=0)=>Engine.U(t,i);
const skill=(t=0,i=0,sid='sillazo')=>`.unit[data-t="${t}"][data-i="${i}"] .sk[data-sid="${sid}"]`;
const card=(t,i)=>`.unit[data-t="${t}"][data-i="${i}"]`;

test('title, animated canvases, original music and original battle art initialize',async()=>{
 const h=harness();assert.ok(h.query('#b-cpu'));assert.ok(h.query('#bg'));assert.ok(h.query('#fx'));assert.equal(h.api.getSettings().musicStyle,'original');
 h.api.openSelect('local');assert.equal(h.document.querySelectorAll('.rcard[data-c]').length,10);assert.equal(h.document.querySelectorAll('.locked').length,0);
});
test('single click selects without spending; clicking enemy portrait executes immediately',async()=>{
 const h=await ready();const before={...Engine.S.teams[0].mana};h.click(skill());
 assert.equal(h.query('#modal'),null);assert.equal(h.document.querySelectorAll('.unit.target').length,3);assert.deepEqual(Engine.S.teams[0].mana,before);assert.match(h.query('#dock').textContent,/Elige tu objetivo/);
 h.click(card(1,1)+' .pf img');assert.equal(actor(1,1).hp,80);assert.equal(actor().acted,true);assert.equal(h.api.getPick(),null);assert.equal(Engine.S.active,0);
 await h.advance(5000);assert.equal(h.api.getBusy(),false);assert.equal(Engine.S.active,0);
});
test('desktop double click shows exact original description and does not attack',async()=>{
 const h=await ready();const before=Engine.serializeBattle();h.click(skill(),1);h.click(skill(),2);
 assert.ok(h.query('#modal').open);assert.ok(h.query('#modal').textContent.includes(DATA.attacks[679].description));assert.equal(Engine.serializeBattle(),before);assert.equal(h.api.getPick(),null);
 h.event(h.query(skill()),'dblclick',2);assert.equal(h.document.querySelectorAll('#modal').length,1);
});
test('bottom-row targeting stays in the same reserved tray through selection, payment, and inspection',async()=>{
 const h=await ready();const slot=h.query('.target-slot'),dock=h.query('#dock'),button=h.query(skill(0,2,'rocas'));
 assert.equal(slot.previousElementSibling,h.query('.allies'));assert.equal(dock.parentElement,slot);assert.equal(dock.hidden,true);
 const before=Engine.serializeBattle();h.click(button,1);
 assert.equal(h.query('.target-slot'),slot);assert.equal(h.query('#dock'),dock);assert.equal(dock.hidden,false);
 assert.equal(h.query(skill(0,2,'rocas')),button,'first click must preserve the original button');
 assert.equal(h.query('.target-copy').getAttribute('role'),'status');
 h.click(button,2);assert.ok(h.query('#modal').open);assert.equal(dock.hidden,true);assert.equal(h.query('.target-slot'),slot);assert.equal(Engine.serializeBattle(),before);
 h.api.closeModal();h.click(skill(0,0,Catalog.skillOf('albert',701).id));h.query('.payment').open=true;
 assert.equal(h.query('.payment').closest('.target-slot'),slot);h.click('#d-x');assert.equal(dock.hidden,true);assert.equal(h.query('.target-slot'),slot);
});
test('two touch clicks with detail one inspect instead of firing',async()=>{
 const h=await ready();h.click(skill(),1);await h.advance(180);h.click(skill(),1);assert.ok(h.query('#modal'));assert.equal(actor().acted,false);assert.equal(actor(1,0).hp,100);
});
test('changing abilities quickly does not count as a double tap',async()=>{
 const h=await ready();h.click(skill());h.click(skill(0,0,'inv'));assert.equal(h.query('#modal'),null);assert.equal(h.api.getPick().sid,'inv');assert.equal(h.document.querySelectorAll('.unit.target').length,1);
});
test('self and allied targets accept the whole character card and keyboard',async()=>{
 const h=await ready();h.click(skill(0,0,'inv'));const row=h.query(card(0,0));assert.equal(row.getAttribute('tabindex'),'0');h.key(row,'Enter');assert.equal(Engine.isInv(actor()),true);await h.advance(5000);
 h.click(skill(0,1,'manopuntura'));h.click(card(0,2)+' .aname');assert.equal(Engine.isInv(actor(0,2)),true);assert.equal(actor(0,1).acted,true);
});
test('area attacks mark all enemies and execute through any marked card',async()=>{
 const h=await ready();h.click(skill(0,2,'rocas'));assert.equal(h.document.querySelectorAll('.unit.target').length,3);h.click(card(1,2));assert.deepEqual(Engine.S.teams[1].units.map(x=>x.hp),[85,85,85]);
});
test('custom chakra control rejects incomplete payment and spends chosen colors exactly',async()=>{
 const h=await ready();const sid=Catalog.skillOf('albert',701).id;h.click(skill(0,0,sid));
 assert.ok(h.query('.payment'));assert.ok(h.query('#pay-controls'));const extra=h.api.getPick().extra;const autoIndex=extra.findIndex(x=>x>0);h.api.adjustPayment(autoIndex,-1);
 h.click(card(0,1));assert.equal(actor().acted,false);assert.ok(h.api.getPick());
 h.api.adjustPayment(3,1);h.click(card(0,1));assert.deepEqual(Engine.S.teams[0].mana,{F:20,R:19,P:20,E:19});assert.equal(actor().acted,true);
});
test('Escape and cancel clear highlights without spending',async()=>{
 const h=await ready();const before=Engine.serializeBattle();h.click(skill());h.globalKey('Escape');assert.equal(h.api.getPick(),null);h.click(skill());h.click('#d-x');assert.equal(h.document.querySelectorAll('.unit.target').length,0);assert.equal(Engine.serializeBattle(),before);
});
test('unavailable skills remain inspectable and never spend chakra',async()=>{
 const h=await ready();Engine.S.teams[0].mana={F:0,R:0,P:0,E:0};h.api.update();h.click(skill());assert.equal(h.api.getPick().ok,false);assert.equal(h.document.querySelectorAll('.unit.target').length,0);h.click(skill(),2);assert.ok(h.query('#modal'));assert.equal(actor().acted,false);
});
test('timer pauses for targeting, dialogs, animations and a hidden tab',async()=>{
 const h=await ready();const clock=h.api.getTimer();clock.left=60;clock.last=h.now;clock.run=true;
 h.click(skill());h.api.timerLoop(h.now+1000);assert.equal(clock.left,60);h.api.clearPick();h.api.openPause();h.api.timerLoop(h.now+2000);assert.equal(clock.left,60);
 h.api.closeModal();h.document.hidden=true;h.api.timerLoop(h.now+3000);assert.equal(clock.left,60);h.document.hidden=false;
 h.click(skill());h.click(card(1,0));h.api.timerLoop(h.now+4000);assert.equal(clock.left,60);
});
test('local handoff waits for Ready, without giving resources twice',async()=>{
 const h=await ready();const handoff=h.api.endTurn();assert.equal(Engine.S.active,1);assert.equal(Engine.S.turnStarted,false);const mana={...Engine.S.teams[1].mana};
 h.click('#c-go');await handoff;assert.equal(Engine.S.turnStarted,true);assert.equal(Object.values(Engine.S.teams[1].mana).reduce((a,b)=>a+b,0),Object.values(mana).reduce((a,b)=>a+b,0)+3);
});
test('automatic passing starts disabled and is opt-in',async()=>{
 const h=await ready();assert.equal(h.api.getSettings().autoPass,false);Engine.S.teams[0].units.forEach(u=>u.acted=true);h.api.scheduleAutoPass();await h.advance(2000);assert.equal(Engine.S.active,0);
 h.api.getSettings().autoPass=true;h.api.scheduleAutoPass();await h.advance(1500);assert.equal(Engine.S.active,1);assert.equal(h.query('#curtain').hidden,false);
});
test('refresh/resume preserves immediate attack, remaining clock and permanent status',async()=>{
 const h=await ready();h.click(skill());h.click(card(1,0));await h.advance(5000);h.api.getTimer().left=23.5;h.api.saveBattle();const saved=h.storage.get('unnb-battle-v2');assert.ok(saved);
 Engine.clearBattle();h.api.resumeBattle();assert.equal(actor(1,0).hp,80);assert.equal(actor().acted,true);assert.equal(h.api.getTimer().left,23.5);assert.equal(Engine.S.active,0);
});
test('settings expose adaptive/wide layouts, music/effects, language and auto-pass',async()=>{
 const h=await ready();h.api.openSettings();const text=h.query('#modal').textContent;for(const x of ['Panorámico','Original','Ambiental','Efectos','Idioma','Pasar'])assert.ok(text.includes(x),x);
 h.click('[data-key="layout"] [data-v="wide"]');assert.equal(h.document.documentElement.dataset.layout,'wide');h.click('[data-key="lang"] [data-v="en"]');assert.equal(h.document.documentElement.lang,'en');
});
test('mirror teams can be selected without duplicate characters within a squad',async()=>{
 const h=harness();h.api.openSelect('local');for(const id of ['albert','maria','irmina','albert','maria','irmina'])h.api.choose(id);assert.deepEqual(Array.from(h.api.getSelection().picks[0]),Array.from(h.api.getSelection().picks[1]));assert.equal(h.query('#s-fight').disabled,false);
});
test('battle history retains damage and uses original ability names',async()=>{
 const h=await ready();h.click(skill());h.click(card(1,0));await h.advance(5000);h.api.openHistory();assert.match(h.query('#modal').textContent,/Sillazo en la espinilla/);assert.match(h.query('#modal').textContent,/−20 HP/);
});
test('draw results render both teams without a winner index error',async()=>{
 const h=await ready();Engine.S.over=true;Engine.S.winner='draw';h.api.finish();await h.advance(1000);assert.match(h.query('#modal').textContent,/¡Empate!/);assert.equal(h.document.querySelectorAll('.result .faces3 img').length,6);assert.ok(h.query('#r-again'));
});
test('all referenced original art, music and bundled font files exist',()=>{
 const root=new URL('../dist/',import.meta.url);const paths=[...DATA.characters.map(c=>c.portrait),...Object.values(DATA.attacks).map(a=>a.image),'assets/menu.mp3','assets/battle.mp3'];
 for(const css of ['style.css','fonts.css'])for(const m of fs.readFileSync(new URL(css,root),'utf8').matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g))paths.push(m[1]);
 for(const path of paths){assert.ok(fs.existsSync(new URL(path,root)),path);assert.ok(fs.statSync(new URL(path,root)).size>0,path);}
 assert.equal(Catalog.MANA_COL.C,'#090a0f');assert.equal(Catalog.MANA_COL.E,'#f3eedf');
 const html=fs.readFileSync(new URL('index.html',root),'utf8');assert.ok(!html.includes('fonts.googleapis.com'));
});
test('gesture supports delayed second clicks as selection and exact flexible allocation',()=>{
 let time=0,selected=0,inspected=0;const g=new AbilityGesture({now:()=>time,select:()=>selected++,inspect:()=>inspected++});g.click('a',{});time=800;g.click('a',{});assert.equal(selected,2);assert.equal(inspected,0);
 assert.deepEqual(allocateFlexible({F:0,R:1,P:2,E:0},{R:1,C:2}),[0,0,2,0]);assert.equal(allocateFlexible({F:0,R:1,P:2,E:0},{R:1,C:2},[0,1,1,0]),null);
});

test('CPU waits while the tab is hidden and while an information dialog is open',async()=>{
 const h=harness();h.api.startBattle('cpu',['albert','maria','irmina'],['aimar','joey','olmo']);await h.micro();Engine.S.teams.forEach(t=>t.mana={F:20,R:20,P:20,E:20});
 await h.api.endTurn();h.document.hidden=true;const before=Engine.serializeBattle();await h.advance(1600);assert.equal(Engine.serializeBattle(),before);
 h.document.hidden=false;h.api.openCharInfo('aimar');await h.advance(1600);assert.equal(Engine.serializeBattle(),before);
 h.api.closeModal();await h.advance(15000);assert.ok(Engine.S.log.length>0);assert.equal(Engine.S.active,0);assert.equal(h.api.getBusy(),false);
});
test('quitting during an animation cannot advance or damage a new battle',async()=>{
 const h=await ready();h.click(skill());h.click(card(1,0));h.api.openPause();h.click('#p-quit');assert.equal(h.api.getScreen(),'title');
 h.api.startBattle('local',['albert','joey','maria'],['albert','joey','maria']);h.click('#c-go');await h.micro();const match=Engine.S;await h.advance(5000);assert.equal(Engine.S,match);assert.ok(Engine.S.teams.flatMap(t=>t.units).every(u=>u.hp===100));assert.equal(Engine.S.active,0);
});

// Linkedom parses the real CSS. This verifies which rules match the actual
// elements at each breakpoint; it does not pretend to do browser layout.
function stylesAt(h,el,width,height){
 let sheet=h.query('style[data-test]');if(!sheet){sheet=h.document.createElement('style');sheet.setAttribute('data-test','');sheet.textContent=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');h.document.head.appendChild(sheet);}
 const matched=[];
 const mediaMatches=media=>{
   if(media.includes('prefers-reduced-motion'))return false;
   for(const m of media.matchAll(/\((min|max)-(width|height):\s*(\d+)px\)/g)){const n=m[2]==='width'?width:height;if(m[1]==='min'?n<+m[3]:n>+m[3])return false;}
   return true;
 };
 function matches(selector){if(selector.includes('::')||/:(hover|active|focus-visible|focus)\b/.test(selector))return false;return el.matches(selector.trim());}
 function walk(rules){for(const r of rules){if(r.type===4){if(mediaMatches(r.media.mediaText))walk(r.cssRules);}else if(r.type===1&&r.selectorText.split(',').some(matches))matched.push(r);}}
 walk(sheet.sheet.cssRules);return matched;
}
test('injured health bars never acquire battlefield flex sizing in any screen mode',async()=>{
 const h=await ready();
 for(const layout of ['auto','compact','wide'])for(const [w,ht] of [[360,640],[390,844],[844,390],[1024,768],[1440,900],[2560,1080]])for(const hp of [100,60,31,30,0]){
   h.document.documentElement.dataset.layout=layout;actor(1,0).hp=hp;actor(1,0).alive=hp>0;actor(0,0).hp=hp;actor(0,0).alive=hp>0;h.api.update();
   for(const selector of [card(1,0)+' .hp',card(0,0)+' .hp']){
     const rules=stylesAt(h,h.query(selector),w,ht);
     for(const rule of rules){
       assert.ok(!rule.style['min-height']||parseFloat(rule.style['min-height'])<=12,`${layout} ${w}x${ht} HP ${hp}: ${rule.selectorText} changes health-bar height`);
       assert.notEqual(rule.style.display,'flex',`${rule.selectorText} gives a health bar the controls' layout`);
     }
   }
 }
});
test('end-turn controls retain intrinsic height and remain outside character cards',async()=>{
 const h=await ready();actor(1,0).hp=50;actor(0,0).hp=50;h.api.update();
 const end=h.query('#b-end'),center=end.closest('.battle-center');assert.ok(center);assert.equal(end.closest('.unit'),null);assert.equal(center.previousElementSibling,h.query('.enemies'));
 for(const [w,ht] of [[360,640],[844,390],[1440,900]]){
   for(const r of stylesAt(h,center,w,ht))if(r.style.flex)assert.equal(r.style.flex.split(' ').at(-1),'auto','center must grow to fit wrapped controls');
   assert.equal(end.disabled,false);assert.equal(end.style.visibility,'visible');
 }
 h.click(end);assert.equal(Engine.S.active,1);assert.equal(h.query('#curtain').hidden,false);
});
test('Borracha shows the real opening cooldown and the original description explains it',async()=>{
 const h=await ready(['irmina','albert','olmo']);h.click(skill(0,0,'borracha'));h.click(card(0,0));await h.advance(2000);
 assert.ok(h.query(skill(0,0,'locura')));assert.equal(h.query(skill(0,0,'locura')+' .cd').textContent,'5');assert.equal(h.query(skill(0,0,'borracha')+' .cd'),null);
 h.click(skill(0,0,'locura'),1);h.click(skill(0,0,'locura'),2);assert.match(h.query('#modal').textContent,/Recarga inicial: 5/);assert.ok(h.query('#modal').textContent.includes(DATA.attacks[727].description));
});
test('invalid saved settings fall back to safe playable defaults',()=>{
 const h=harness({storage:{'unnb-settings':JSON.stringify({turnTime:'broken',autoPass:'false',lang:'xx',layout:'tiny',musicStyle:'bad',sfx:false})}});
 const s=h.api.getSettings();assert.equal(s.turnTime,60);assert.equal(s.autoPass,false);assert.equal(s.lang,'es');assert.equal(s.layout,'auto');assert.equal(s.musicStyle,'original');assert.equal(s.sfx,false);
});
test('a stale CPU team-selection screen cannot relabel a local match',async()=>{
 const h=harness();h.api.openSelect('cpu');h.api.startBattle('local',['albert','olmo','maria'],['albert','irmina','aimar']);
 assert.match(h.query('#curtain').textContent,/Equipo Azul/);h.click('#c-go');await h.micro();assert.match(h.query('#b-who').textContent,/Equipo Azul/);
});
test('keyboard events on the roster info button do not also select that character',()=>{
 const h=harness();h.api.openSelect('local');const info=h.query('[data-info="irmina"]');h.key(info,'Enter');assert.equal(h.api.getSelection().picks[0].length,0);h.click(info);assert.ok(h.query('#modal'));
});
test('quitting before projectile launch cannot show old impact effects in a new game',async()=>{
 const h=await ready();let impacts=0;h.api.FX.burst=()=>impacts++;h.api.FX.ring=()=>impacts++;h.api.FX.slash=()=>impacts++;
 h.click(skill());h.click(card(1,0));h.api.openPause();h.click('#p-quit');
 h.api.startBattle('local',['albert','joey','maria'],['albert','joey','maria']);h.click('#c-go');await h.advance(3000);
 assert.equal(impacts,0);assert.equal(h.document.querySelectorAll('.pop').length,0);assert.equal(h.api.getBusy(),false);
});
test('saving during turn-start damage retains the new timer and never ticks damage twice',async()=>{
 const h=await ready(['joey','albert','olmo']);h.click(skill(0,0,'conspiracy'));h.click(card(1,0));await h.advance(2000);
 h.click('#b-end');h.click('#c-go');await h.micro();h.api.getTimer().left=0;
 h.click('#b-end');h.click('#c-go');await h.micro();assert.equal(h.api.getBusy(),true);
 const saved=h.storage.get('unnb-battle-v2'),snapshot=JSON.parse(saved);assert.equal(snapshot.ui.remaining,60);assert.equal(snapshot.battle.teams[1].units[0].hp,60);
 h.api.openPause();h.click('#p-quit');h.storage.set('unnb-battle-v2',saved);h.api.resumeBattle();
 assert.equal(actor(1,0).hp,60);assert.equal(h.api.getTimer().left,60);await h.advance(3000);assert.equal(actor(1,0).hp,60);
});
test('surrender interrupts presentation without overwriting the result or hanging a rematch',async()=>{
 const h=await ready();h.click(skill());h.click(card(1,0));h.api.openPause();h.click('#p-sur');h.click('#p-sur');await h.advance(3000);
 assert.equal(Engine.S.over,true);assert.equal(Engine.S.winner,1);assert.ok(h.query('#r-again'));assert.equal(h.api.getBusy(),false);
 h.click('#r-again');h.click('#c-go');await h.advance(3000);assert.equal(Engine.S.over,false);assert.equal(h.api.getBusy(),false);assert.ok(Engine.S.teams.flatMap(t=>t.units).every(u=>u.hp===100));
});

test('both teams open prominent effect cards before collapsed original abilities',async()=>{
 const h=await ready();h.click(skill(0,2,'rocas'));h.click(card(1,1));await h.advance(5000);
 for(const [t,i] of [[0,2],[1,1]]){
  h.click(card(t,i)+' .pf img');const section=h.query('.character-effects');assert.ok(section);assert.ok(section.querySelector('.effect-card'));
  assert.equal(section.nextElementSibling.tagName,'DETAILS');assert.equal(section.nextElementSibling.hasAttribute('open'),false);
  const effect=section.querySelector('.effect-card');assert.ok(effect.querySelector('.effect-duration').getAttribute('aria-label').includes('Duración restante'));
  assert.match(effect.querySelector('.effect-source').textContent,/Irmina/);assert.match(effect.querySelector('.effect-source').textContent,/Lanzarrocas/);
  assert.ok(effect.querySelector('.effect-source img').getAttribute('src').startsWith('assets/'));
  assert.ok(h.query('.character-abilities').textContent.includes(Catalog.skillOf(actor(t,i).cid,actor(t,i).skills[0]).description));h.api.closeModal();
 }
});
test('status window explains suppressed damage and preserved protection with remaining durations',async()=>{
 const h=await ready();h.click(skill(0,2,'rocas'));h.click(card(1,1));await h.advance(5000);actor(0,2).stun=2;h.api.update();
 h.click(card(1,1));assert.match(h.query('.effect-mechanic').textContent,/15/);assert.match(h.query('.effect-duration').textContent,/1 activación restante/);
 assert.match(h.query('.effect-warning').textContent,/Suprimido por aturdimiento/);assert.match(h.query('.effect-note').textContent,/no se recuperan/);h.api.closeModal();
 h.click(card(0,2)+' .pf img');assert.equal(h.document.querySelectorAll('.effect-card').length,2);assert.match(h.query('.character-effects').textContent,/2 turnos/);
 assert.match(h.query('.character-effects').textContent,/protección sigue activa/);assert.match(h.query('.character-effects').textContent,/−10 daño/);
});
test('pending health loss is named and explained, and empty statuses are explicit',async()=>{
 const h=await ready();h.click(card(0,0)+' .pf img');assert.match(h.query('.effects-empty').textContent,/Sin efectos activos/);assert.equal(h.query('.effect-card'),null);h.api.closeModal();
 h.click(skill(0,1,'manopuntura'));h.click(card(0,2));await h.advance(5000);h.click(card(0,2)+' .pf img');
 assert.equal(h.document.querySelectorAll('.effect-card').length,2);assert.match(h.query('.character-effects').textContent,/Pérdida de salud pendiente/);
 assert.match(h.query('.character-effects').textContent,/−10 HP/);assert.match(h.query('.character-effects').textContent,/Próximo turno/);assert.match(h.query('.character-effects').textContent,/incluso con aturdimiento/);
});
test('English effect cards localize suppression and identify mirror sources by team',async()=>{
 const h=await ready(['miriam','albert','aimar'],['miriam','joey','irmina']);h.api.getSettings().lang='en';
 const result=Engine.useSkill(actor(0,0),'amor',actor(1,1));assert.equal(result.ok,true);actor(0,0).stun=1;h.api.update();h.click(card(1,1));
 const text=h.query('.character-effects').textContent;assert.match(text,/Active effects/);assert.match(text,/Suppressed by stun/);assert.match(text,/13 damage per turn/);assert.match(text,/permanent/);assert.match(text,/Source: Miriam · Blue Team/);assert.match(text,/skipped ticks are lost/);
 assert.ok(!text.includes('s_dot'));assert.ok(!text.includes('Infinity'));assert.equal(h.api.getPick(),null);
});

// Browser-facing online flow with the actual WebSocket client and real DOM.
class UISocket {
 static sockets=[];
 constructor(url){this.url=url;this.readyState=0;this.sent=[];UISocket.sockets.push(this);}
 send(s){this.sent.push(JSON.parse(s));}
 close(){this.readyState=3;}
 open(){this.readyState=1;this.onopen();}
 receive(msg){this.onmessage({data:JSON.stringify(msg)});}
}
const onlineLocation={protocol:'https:',host:'game.test',origin:'https://game.test',pathname:'/',hash:''};
function roomMessage(battle=null,seat=0,revision=2){return {type:'state',seat,revision,turnTime:60,deadline:Date.now()+60000,online:[true,true],players:[{ready:false,team:[]},{ready:false,team:[]}],battle,transition:null};}
async function onlineUI(seat=0,battle=null){
 const old=globalThis.WebSocket;globalThis.WebSocket=UISocket;const h=harness({location:onlineLocation});h.api.joinOnline('NINJA42');const net=h.api.getNet(),ws=net.client.socket;ws.open();ws.receive(roomMessage(battle,seat));await net.client.queue;globalThis.WebSocket=old;return {...h,ws,net};
}
function onlineSnapshot(){Engine.configureEngine({rng:()=>.01});Engine.newBattle('online',['albert','olmo','irmina'],['aimar','joey','maria'],{firstTeam:0});Engine.beginTurn();Engine.S.teams.forEach(t=>t.mana={F:20,R:20,P:20,E:20});return Engine.serializeBattle();}

test('online menu validates room codes and makes joining available without an account',async()=>{
 const h=harness({location:onlineLocation});h.click('#b-online');assert.ok(h.query('#online-form'));assert.ok(h.query('#room-code').value.length>=4);
 h.query('#room-code').value='!!';h.event(h.query('#online-form'),'submit');assert.match(h.query('#room-error').textContent,/4/);h.api.closeModal();
});
test('online room chooses only your three characters and sends Ready instead of starting locally',async()=>{
 const h=await onlineUI(1);assert.equal(h.api.getSelection().picker,1);assert.equal(h.document.querySelectorAll('.rcard').length,10);
 for(const id of ['albert','olmo','irmina'])h.api.choose(id);
 assert.deepEqual(Array.from(h.api.getSelection().picks[0]),[]);assert.equal(h.api.getSelection().picks[1].length,3);h.click('#s-fight');
 assert.equal(h.ws.sent.at(-1).type,'ready');assert.deepEqual(h.ws.sent.at(-1).team,['albert','olmo','irmina']);assert.equal(Engine.S,null);h.api.leaveOnline();
});
test('both online perspectives keep their own team below and cannot act on the other turn',async()=>{
 const snapshot=onlineSnapshot(),h=await onlineUI(1,snapshot);
 assert.ok(h.query('.allies .unit[data-t="1"]'));assert.ok(h.query('.enemies .unit[data-t="0"]'));assert.equal(h.api.humanTurn(),false);assert.equal(h.query('#b-end').disabled,true);
 h.click('.allies .sk');assert.equal(h.document.querySelectorAll('.unit.target').length,0);h.api.leaveOnline();
});
test('online target click sends one command, leaves HP untouched until acknowledgement, and preserves double-click inspection',async()=>{
 const h=await onlineUI(0,onlineSnapshot());h.click(skill(),1);h.click(skill(),2);assert.ok(h.query('#modal').open);h.api.closeModal();assert.equal(h.ws.sent.length,1);
 h.click(skill());h.click(card(1,0));assert.equal(h.ws.sent.at(-1).type,'attack');assert.equal(actor(1,0).hp,100);assert.equal(h.api.getNet().pending,true);
 h.click(card(1,1));assert.equal(h.ws.sent.filter(m=>m.type==='attack').length,1);h.api.leaveOnline();
});
test('authoritative attack acknowledgement animates exactly once without double damage',async()=>{
 const snapshot=onlineSnapshot(),h=await onlineUI(0,snapshot);h.click(skill());h.click(card(1,0));
 Engine.restoreBattle(snapshot);const result=Engine.useSkill(actor(), 'sillazo',actor(1,0));const next=Engine.serializeBattle();Engine.restoreBattle(snapshot);
 const msg={...roomMessage(next,0,3),transition:{kind:'attack',team:0,actor:0,sid:'sillazo',targetTeam:1,target:0,paid:result.paid,events:result.events.map(e=>({...e,u:e.u?{t:e.u.t,i:e.u.i}:undefined}))}};
 h.ws.receive(msg);await h.micro();await h.advance(6000);await h.net.client.queue;assert.equal(actor(1,0).hp,80);assert.equal(h.net.pending,false);assert.equal(h.api.getBusy(),false);
 h.ws.receive({...msg,transition:null});await h.net.client.queue;assert.equal(actor(1,0).hp,80);h.api.leaveOnline();
});
test('online End Turn waits for server; received turn keeps perspective fixed and local save intact',async()=>{
 const snapshot=onlineSnapshot(),h=await onlineUI(0,snapshot);h.storage.set('unnb-battle-v2','existing solo match');h.click('#b-end');assert.equal(Engine.S.active,0);assert.equal(h.ws.sent.at(-1).type,'end');
 Engine.endTurnState();Engine.beginTurn();const next=Engine.serializeBattle();Engine.restoreBattle(snapshot);h.ws.receive({...roomMessage(next,0,3),transition:{kind:'turn',events:[]}});await h.net.client.queue;
 assert.equal(Engine.S.active,1);assert.ok(h.query('.allies .unit[data-t="0"]'));assert.equal(h.storage.get('unnb-battle-v2'),'existing solo match');h.api.leaveOnline();
});
test('online disconnect disables attacks, reconnect restores authoritative state and own seat',async()=>{
 const snapshot=onlineSnapshot(),h=await onlineUI(0,snapshot);h.net.client.onConnection(false);assert.equal(h.api.humanTurn(),false);assert.equal(h.query('#b-end').disabled,true);
 h.ws.receive(roomMessage(snapshot,0,3));await h.net.client.queue;assert.equal(h.api.humanTurn(),true);assert.ok(h.query('.allies .unit[data-t="0"]'));h.api.leaveOnline();
});
test('online surrender is sent for your own seat even on opponent turn; no local outcome is invented',async()=>{
 const h=await onlineUI(1,onlineSnapshot());h.api.openPause();h.click('#p-sur');h.click('#p-sur');assert.equal(h.ws.sent.at(-1).type,'surrender');assert.equal(Engine.S.over,false);h.api.leaveOnline();
});

test('finished victories and draws remove Continue immediately and after reloading the menu',async()=>{
 for(const winner of [0,1,'draw']){
  const h=await ready();Engine.S.over=true;Engine.S.winner=winner;h.api.finish();
  assert.equal(h.storage.has('unnb-battle-v2'),false);
  h.api.saveBattle();assert.equal(h.storage.has('unnb-battle-v2'),false,'background saving must not restore a finished match');
  await h.advance(1000);h.click('#r-menu');assert.equal(h.query('#b-resume'),null);
  const reloaded=harness({storage:Object.fromEntries(h.storage)});assert.equal(reloaded.query('#b-resume'),null);
 }
});
test('surrender removes Continue, while quitting an unfinished match still allows resuming',async()=>{
 const h=await ready();h.api.openPause();h.click('#p-quit');assert.ok(h.query('#b-resume'));
 h.click('#b-resume');assert.equal(Engine.S.over,false);h.api.openPause();h.click('#p-sur');h.click('#p-sur');await h.advance(1000);h.click('#r-menu');assert.equal(h.query('#b-resume'),null);assert.equal(h.storage.has('unnb-battle-v2'),false);
});
test('old completed saves are removed on startup and a stale Continue cannot reopen results',async()=>{
 const h=await ready();Engine.S.over=true;Engine.S.winner=0;const legacy=Engine.serializeBattle();
 const reloaded=harness({storage:{'unnb-battle-v2':legacy}});assert.equal(reloaded.query('#b-resume'),null);assert.equal(reloaded.storage.has('unnb-battle-v2'),false);assert.equal(Engine.S,null);
 reloaded.storage.set('unnb-battle-v2',legacy);reloaded.api.resumeBattle();await reloaded.advance(1000);assert.equal(reloaded.api.getScreen(),'title');assert.equal(reloaded.query('#modal'),null);assert.equal(Engine.S,null);
});
test('startup detects an unfinished save without loading it or displaying stale invalid saves',async()=>{
 const h=await ready(),unfinished=Engine.serializeBattle();
 const reloaded=harness({storage:{'unnb-battle-v2':unfinished}});assert.ok(reloaded.query('#b-resume'));assert.equal(Engine.S,null);
 const invalid=harness({storage:{'unnb-battle-v2':'broken json'}});assert.equal(invalid.query('#b-resume'),null);
});
