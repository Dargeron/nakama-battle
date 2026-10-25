import { DATA } from './game-data.js';
import { VISUAL } from './visual-data.js';

export const MANA = ['F', 'R', 'P', 'E'];
export const MANA_COL = {F:'#43d18a', R:'#4f9dff', P:'#ff5866', E:'#f3eedf', C:'#090a0f'};
export const PORTRAITS = Object.fromEntries(DATA.characters.map(c=>[c.name,c.portrait]));
const targetNames = ['self','enemy','allEnemies','ally','allAllies','otherAllies','otherAlly','all'];
const sid = id => VISUAL[id].id;
const effectOwner = id => Object.values(DATA.attacks).find(a=>a.effects.some(e=>e.id===id));

// The recovered definitions remain the authority for costs, effects and timing.
// Owner update: Voluntad Ólmica has no opening cooldown; its reuse cooldown remains original.
// Durations are half-turns; execution now happens immediately on target selection.
function convertEffect(e, a) {
  const base={to:targetNames[e.target],halfTurns:e.turnsDuration,r:Math.max(1,Math.floor(e.turnsDuration/2)),originalEffectId:e.id};
  if(e.turnsDuration>1000000){base.halfTurns=Infinity;base.r=Infinity;}
  if(e.kind==='AttackEffect') {
    switch(e.effect) {
      case 0:return {...base,t:e.magnitude<0?'heal':e.turnsDuration>1?'dot':'dmg',v:Math.abs(e.magnitude),hits:Math.ceil(e.turnsDuration/2),pierce:e.piercingAttack,ignoreInv:e.ignoreInvulnerability};
      case 1:return {...base,t:'inv'};
      case 2:return {...base,t:'stun',n:a.id===635?1:e.magnitude,ignoreInv:e.ignoreInvulnerability};
      case 3:return {...base,t:'nostun'};
      case 4:return {...base,t:base.halfTurns===Infinity?'atkPerm':'atk',v:e.magnitude};
      case 5:return {...base,t:e.unpiercableDamageReduction?'unp':e.magnifier!==1?'dratio':'dred',v:e.unpiercableDamageReduction?e.magnitude:e.magnifier!==1?e.magnifier:-e.magnitude};
      case 6:return {...base,t:'res',v:e.magnitude};
    }
  }
  if(e.kind==='EnableAttack')return {...base,t:'enable',skill:sid(e.attackIds[0])};
  if(e.kind==='IncreaseAttack')return {...base,t:'boost',skill:sid(effectOwner(e.DamageEffectToIncrease[0].id).id),mult:e.attackMultiplier,add:e.attackIncrease};
  if(e.kind==='HealthModifier')return {...base,t:'halfHp',to:'self',multiply:e.multiply,increase:e.increase};
  if(e.kind==='CooldownModifier')return {...base,t:'cdUp',v:e.cooldownAdd,onlyIfNotZero:e.onlyIfNotZero};
  if(e.kind==='BorrachaScript')return {...base,t:'swap',to:'self'};
  if(e.kind==='SatanBirth')return {...base,t:'satan',to:'self'};
  if(e.kind==='Locura')return {...base,t:'locura',to:'self'};
  if(e.kind==='DesnucamientoAccidental')return {...base,t:'neck',v:e.magnitude};
  if(e.kind==='MindundiSelector')return {...base,t:'mark'};
  if(e.kind==='Manopuntura')return {...base,t:'manopuntura',v:e.magnitude,delay:Math.max(1,e.turnsDuration-2)};
  throw new Error('Unknown recovered effect: '+e.kind);
}
function ability(id){
  const a=DATA.attacks[id], v=VISUAL[id];
  return {...v,originalId:id,name:a.name,image:a.image,description:a.description,
    es:a.description,en:a.description,cost:Object.fromEntries([...MANA,'C'].map((k,i)=>[k,a.cost[i]])),
    cd:a.cooldown,startCd:a.id===555?0:a.initialCooldown,locked:!a.active,
    target:a.id===572?'allEnemies':targetNames[a.target],
    ignoreInv:a.effects.some(e=>e.ignoreInvulnerability),effects:a.effects.map(e=>convertEffect(e,a))};
}
export const CHARS=DATA.characters.map(c=>({...c,skills:c.attacks.map(ability),...(c.id==='irmina'?{alts:[620,727].map(ability)}:{})}));
export const CHAR=Object.fromEntries(CHARS.map(c=>[c.id,c]));
export function skillOf(cid,id){const c=CHAR[cid];return c&&[...c.skills,...(c.alts||[])].find(s=>s.id===id || s.originalId===id);}
export const SWAPS={rocas:'muerdo',amigos:'locura',muerdo:'rocas',locura:'amigos'};
