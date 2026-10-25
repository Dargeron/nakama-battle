import {CHARS, CHAR, PORTRAITS, MANA, MANA_COL, skillOf} from './catalog.js';
import {S,isEnabled,newBattle,U,allies,enemies,has,isInv,noStun,isPeriodicSuppressed,roundsLeft,canUse,anyAction,validTargets,useSkill,beginTurn,endTurnState,cpuPick,configureEngine,serializeBattle,restoreBattle,clearBattle,payment,checkWin} from './engine.js';
import {AbilityGesture,allocateFlexible} from './controls.js';
import {OnlineClient} from './online.js';
/* Original skill glyphs, 24x24, drawn with currentColor strokes */
const GLYPH = {
 shield:'<path d="M12 2.8l7.5 3v5.6c0 4.6-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5.2-7.5-9.8V5.8z"/><path d="M8.6 12l2.4 2.4 4.6-4.8"/>',
 car:'<path d="M3 15.5v-3.2l2.2-4.6h10.6l3.2 4.6 2 .6v2.6H3z"/><circle cx="7.4" cy="16.2" r="2"/><circle cx="16.8" cy="16.2" r="2"/><path d="M6.4 11.6h11"/>',
 firecar:'<path d="M5 16.5v-2.8l2-4h9.4l2.6 4 1.6.5v2.3H5z"/><circle cx="8.6" cy="17" r="1.8"/><circle cx="16.8" cy="17" r="1.8"/><path d="M4.2 12.8C2.4 11 3.4 9.2 2.2 7.4M6.6 8.4C5.6 6.6 6.8 5 6 3.2M10.4 7.2c-.6-1.6.4-2.8-.2-4.4"/>',
 feast:'<path d="M3 12.5h18c0 4.4-3.8 7.3-9 7.3s-9-2.9-9-7.3z"/><path d="M8 9.4c-.8-1.2.8-2 0-3.4M12 9.4c-.8-1.2.8-2 0-3.4M16 9.4c-.8-1.2.8-2 0-3.4"/><path d="M9.5 19.8l-1 1.8h7l-1-1.8"/>',
 wheel:'<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="1.6"/><path d="M12 3.6v6.8M12 13.6v6.8M3.6 12h6.8M13.6 12h6.8M6 6l4.8 4.8M13.2 13.2L18 18M18 6l-4.8 4.8M10.8 13.2L6 18"/>',
 croc:'<path d="M2.5 13.4c2.4 0 3.2-2.6 6-2.6h9.2l3.8 1.4-3.6 1.4H9.4"/><path d="M10 10.8l.9-1.4.9 1.4.9-1.4.9 1.4.9-1.4.9 1.4M10 13.6l.9 1.2.9-1.2.9 1.2.9-1.2.9 1.2"/><path d="M2 18.6c1.6-1.2 3.2-1.2 4.8 0s3.2 1.2 4.8 0 3.2-1.2 4.8 0 3.2 1.2 4.8 0"/><circle cx="16.4" cy="9.4" r=".6"/>',
 bulb:'<path d="M9 17.6h6M9.8 20.6h4.4"/><path d="M12 3.4a6 6 0 00-3.4 11c.6.5.8 1.2.8 2.1h5.2c0-.9.2-1.6.8-2.1A6 6 0 0012 3.4z"/><path d="M12 7.4v4M10 9.4h4"/>',
 moon:'<path d="M19.2 14.2A7.6 7.6 0 019.8 4.8a7.6 7.6 0 109.4 9.4z"/><path d="M14.6 4h3.6l-3.6 3.6h3.6M19 9.2h2.2L19 11.4h2.2"/>',
 pad:'<path d="M7.2 8h9.6a4 4 0 014 4.4l-.5 3.6a2.4 2.4 0 01-4.2 1.2L14.6 15H9.4l-1.5 2.2a2.4 2.4 0 01-4.2-1.2l-.5-3.6A4 4 0 017.2 8z"/><path d="M7.6 10.4v3M6.1 11.9h3"/><circle cx="15.6" cy="11" r=".7"/><circle cx="17.4" cy="12.8" r=".7"/>',
 storm:'<path d="M3.5 5.5h15M5 9h13.5M7 12.5h10M9 16h6.6M10.6 19.5h3.2"/><path d="M18.5 5.5c2 0 2 3.5 0 3.5M17 12.5c1.8 0 1.8 3.5-.4 3.5"/>',
 aura:'<circle cx="12" cy="12" r="3.6"/><path d="M12 2.6v3.2M12 18.2v3.2M2.6 12h3.2M18.2 12h3.2M5.4 5.4l2.2 2.2M16.4 16.4l2.2 2.2M18.6 5.4l-2.2 2.2M7.6 16.4l-2.2 2.2"/>',
 flame:'<path d="M12 21.2c-4 0-6.6-2.6-6.6-6.2 0-3.4 2.4-5 3.4-8 1.4 1.4 1.8 3 1.8 4.4 1.4-1.6 2.6-4.6 1.8-8.2 3.8 2 6.2 6.6 6.2 11.2 0 3.8-2.6 6.8-6.6 6.8z"/><path d="M12 21.2c-1.8 0-3-1.2-3-3 0-1.6 1.2-2.6 1.8-4 .8.8 1.2 1.6 1.2 2.4.8-.6 1.4-1.6 1.4-2.8 1.2 1 1.6 2.4 1.6 4 0 2-1.2 3.4-3 3.4z"/>',
 bubble:'<path d="M4 5.5h16v10.2h-8.6L6.6 19.8v-4.1H4z"/><path d="M9.4 8.6v3M9.4 13.2v.2M13.4 8.4c1.2-.6 2.8 0 2.8 1.2 0 1.4-2 1.4-2 2.6M14.2 13.6v.2"/>',
 rock:'<path d="M4 16.8l2.4-7.2 5-4 6.4 1.8 2.6 6-2.8 5.4H8z"/><path d="M11.4 5.6l1.2 5.4 5.2-4.4M12.6 11l-6.2-1.4M12.6 11l1.6 7.4"/>',
 ghost:'<path d="M6 20V10.4a6 6 0 0112 0V20l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z"/><circle cx="9.8" cy="10.6" r="1"/><circle cx="14.2" cy="10.6" r="1"/><path d="M10.4 14.4c1 .8 2.2.8 3.2 0"/>',
 bottle:'<path d="M10 2.8h4v4.4c2 1 3 2.6 3 4.8v8.2a1.2 1.2 0 01-1.2 1.2H8.2A1.2 1.2 0 017 20.2V12c0-2.2 1-3.8 3-4.8z"/><path d="M7 13.2h10M7 17.6h10"/><path d="M20 4.6l1.2-1.2M19.4 7.6h1.8"/>',
 bite:'<path d="M3 9.6C6 6.4 18 6.4 21 9.6c-1.2 5.6-4.4 8.4-9 8.4s-7.8-2.8-9-8.4z"/><path d="M5.2 9.4l1.6 2.4 1.8-2.6 1.8 2.6 1.6-2.6 1.6 2.6 1.8-2.6 1.8 2.6 1.6-2.4M7 15.6l1.6-1.8 1.6 1.8 1.8-1.8 1.8 1.8 1.6-1.8 1.6 1.8"/>',
 spiral:'<path d="M12 12.2c0-.8.8-1.2 1.4-.8.8.6.6 2-.4 2.4-1.4.6-3-.4-3-2 0-2.2 2.4-3.6 4.4-2.8 2.6 1 3.2 4.4 1.6 6.4-2 2.6-6.2 2.4-8-.4-2.2-3.4-.2-8 3.6-9 4.4-1.2 8.6 2.4 8.2 7"/>',
 note:'<path d="M9 17.6V5.4l11-2v12"/><circle cx="6.6" cy="17.8" r="2.6"/><circle cx="17.6" cy="15.4" r="2.6"/><path d="M9 9.2l11-2"/>',
 pyramid:'<path d="M12 3L2.8 20h18.4z"/><path d="M7.6 13.4c2.6-2.6 6.2-2.6 8.8 0-2.6 2.6-6.2 2.6-8.8 0z"/><circle cx="12" cy="13.4" r="1.2"/><path d="M12 6.2v-4M17.4 7.6l2-2M6.6 7.6l-2-2"/>',
 selfheart:'<path d="M12 19.6S4.4 15 4.4 9.6A3.8 3.8 0 0112 7.4a3.8 3.8 0 017.6 2.2c0 5.4-7.6 10-7.6 10z"/><path d="M12 10.4v4.8M9.6 12.8h4.8"/>',
 whip:'<path d="M3.4 20.6l3.4-3.4"/><path d="M6.8 17.2C9 12 4.6 8.6 8.6 5.2c3.6-3 9 .4 11.2 4.4"/><circle cx="10.4" cy="4.6" r="1"/><circle cx="14.4" cy="5.2" r="1"/><circle cx="17.6" cy="7" r="1"/><circle cx="19.8" cy="9.8" r="1.2"/>',
 meteor:'<circle cx="15.4" cy="15.4" r="4.6"/><path d="M12.2 12.2L3.4 3.4M14.6 10.8L8.6 2.8M10.8 14.6L2.8 8.6"/><path d="M14 15.4l1.6 1.4M16.4 13.4l.4 1"/>',
 horns:'<path d="M5.4 3.6c-.6 3 .4 5.4 2.8 6.6M18.6 3.6c.6 3-.4 5.4-2.8 6.6"/><path d="M12 21c-4 0-6.4-3-6.4-6.6 0-3.4 2.8-5.4 6.4-5.4s6.4 2 6.4 5.4C18.4 18 16 21 12 21z"/><path d="M8.8 14l2.2 1.2M15.2 14L13 15.2M10 18.4c1.2-.6 2.8-.6 4 0"/>',
 nothing:'<circle cx="12" cy="12" r="7.2" stroke-dasharray="1.6 2.6"/><path d="M12 2.2v1.6M12 20.2v1.6M2.2 12h1.6M20.2 12h1.6"/>',
 eye:'<path d="M2 12c2.6-4.4 6-6.6 10-6.6s7.4 2.2 10 6.6c-2.6 4.4-6 6.6-10 6.6S4.6 16.4 2 12z"/><circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="1" />',
 heart:'<path d="M12 20.4S3.4 15.2 3.4 9.2A4.4 4.4 0 0112 7a4.4 4.4 0 018.6 2.2c0 6-8.6 11.2-8.6 11.2z"/><path d="M16.8 3.6l1.4 1.4M20.2 4.8l-.4 1.8M14.6 2.4l.2 1.4"/>',
 question:'<path d="M8.4 8.6c0-2.4 1.8-4 3.8-4s3.8 1.4 3.8 3.4c0 2.8-3.8 2.8-3.8 6"/><path d="M12.2 18.6v.4"/><path d="M4 6.2c-.6-1.4.6-2.4 1.6-2M18.6 3.2c1-.4 2.2.6 1.6 2M3.4 16.4c-.4 1 .2 2 1.2 2M20.6 16.4c.4 1-.2 2-1.2 2"/>',
 crack:'<path d="M13.4 2.4L8.6 10.2l4 1.6-4.4 9.8"/><path d="M15.6 7.6l3-.6M16.4 12.4l3.6 1.2M5 7l2.8 1.4M4.6 14.2l3.2-.6"/>',
 cat:'<path d="M4.6 3.8l3.8 4a9 9 0 017.2 0l3.8-4v9c0 4.4-3.4 7.4-7.4 7.4s-7.4-3-7.4-7.4z"/><path d="M8.4 12.4c.8-.8 1.6-.8 2.2 0M13.4 12.4c.8-.8 1.6-.8 2.2 0M11 15.6l1 .8 1-.8M2 14.6l4 .4M2.4 17.8l3.8-.8M22 14.6l-4 .4M21.6 17.8l-3.8-.8"/>',
 katanas:'<path d="M4 20L18.8 5.2l1.6-2.6-2.6 1.6L3 19"/><path d="M20 20L5.2 5.2 3.6 2.6l2.6 1.6L21 19"/><path d="M6.2 15.6l2.2 2.2M17.8 15.6l-2.2 2.2"/>',
 peak:'<path d="M2.4 20.4L9.4 8l3.4 5.4 2.6-3.6 6.2 10.6z"/><path d="M14.6 9.8V2.8l4.2 1.4-4.2 1.6"/><path d="M7.6 11.2l1.8 1.4 1.4-1"/>',
 needles:'<path d="M7.4 21v-6.4L5 11.4a1.4 1.4 0 012-2l1.8 1.8V5.6a1.4 1.4 0 012.8 0v4.6-1.4a1.4 1.4 0 012.8 0v1.4-.6a1.4 1.4 0 012.8 0v5.6c0 3.4-2 5.8-4.8 5.8z"/><path d="M17.8 2.4l-2.6 5M20.8 5.2l-3.8 3.4M12 1.4v4"/>',
};
function glyphSVG(name, size){
  return `<svg viewBox="0 0 24 24" width="${size||'100%'}" height="${size||'100%'}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPH[name]||GLYPH.nothing}</svg>`;
}
/* small UI glyphs */
const UI_ICON = {
 pause:'<path d="M8 5v14M16 5v14"/>',
 sound:'<path d="M4 9.5h3.6L12.4 5v14l-4.8-4.5H4z"/><path d="M15.6 9a4.2 4.2 0 010 6M18.2 6.4a8 8 0 010 11.2"/>',
 mute:'<path d="M4 9.5h3.6L12.4 5v14l-4.8-4.5H4z"/><path d="M16 9.4l5 5M21 9.4l-5 5"/>',
 close:'<path d="M6 6l12 12M18 6L6 18"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.2"/>',
 lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.2 10.5V7.6a3.8 3.8 0 017.6 0v2.9"/>',
 swords:'<path d="M4 20L18.8 5.2l1.6-2.6-2.6 1.6L3 19"/><path d="M20 20L5.2 5.2 3.6 2.6l2.6 1.6L21 19"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 dice:'<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="8.6" cy="8.6" r=".9"/><circle cx="15.4" cy="15.4" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="15.4" cy="8.6" r=".9"/><circle cx="8.6" cy="15.4" r=".9"/>',
 gear:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8"/>',
 book:'<path d="M4 4.6h6.4A2.6 2.6 0 0113 7.2v13a2 2 0 00-2-2H4zM20 4.6h-6.4A2.6 2.6 0 0011 7.2v13a2 2 0 012-2h7z"/>',
 cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9.5 2.8V6M14.5 2.8V6M9.5 18v3.2M14.5 18v3.2M2.8 9.5H6M2.8 14.5H6M18 9.5h3.2M18 14.5h3.2"/><circle cx="12" cy="12" r="2"/>',
 duo:'<circle cx="8.4" cy="8.4" r="3.2"/><circle cx="16.4" cy="9.6" r="2.6"/><path d="M2.8 19.4c.6-3.4 2.8-5.2 5.6-5.2s5 1.8 5.6 5.2M14.2 14.8c3.4-.6 6 1 6.8 4.6"/>',
 stun:'<path d="M12 3.5l1.9 4.1 4.4.5-3.3 3 .9 4.4L12 13.3l-3.9 2.2.9-4.4-3.3-3 4.4-.5z"/>',
 sword:'<path d="M14.5 4.5L20 3l-1.5 5.5-9 9-4-4z"/><path d="M5.5 13.5l5 5M4 20l2.5-2.5"/>',
 down:'<path d="M12 4v15M6 13l6 6 6-6"/>',
 up:'<path d="M12 20V5M6 11l6-6 6 6"/>',
 skull:'<path d="M12 3a7.5 7.5 0 00-7.5 7.5c0 2.6 1.2 4.4 3 5.6V20h9v-3.9c1.8-1.2 3-3 3-5.6A7.5 7.5 0 0012 3z"/><circle cx="9.2" cy="11" r="1.6"/><circle cx="14.8" cy="11" r="1.6"/>',
 target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 hourglass:'<path d="M6.5 3h11M6.5 21h11M7.5 3c0 5 9 5 9 9s-9 4-9 9M16.5 3c0 5-9 5-9 9s9 4 9 9"/>',
};
function uiIcon(name, size){
  return `<svg viewBox="0 0 24 24" width="${size||20}" height="${size||20}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UI_ICON[name]}</svg>`;
}

/* ===================== Settings & i18n ===================== */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const rnd = (a,b)=>a+Math.random()*(b-a);
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];
const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

const SETTINGS = {lang:'es', sfx:true, music:true, turnTime:60, shake:!REDUCED, autoPass:false, layout:'auto', musicStyle:'original'};
try{
  const saved=JSON.parse(localStorage.getItem('unnb-settings')||'{}');
  for(const k of ['music','sfx','shake','autoPass'])if(typeof saved?.[k]==='boolean')SETTINGS[k]=saved[k];
  for(const [k,values] of Object.entries({lang:['es','en'],layout:['auto','compact','wide'],musicStyle:['original','procedural'],turnTime:[0,30,60,90]}))if(values.includes(saved?.[k]))SETTINGS[k]=saved[k];
}catch(e){}
function saveSettings(){ applyLayout(); try{ localStorage.setItem('unnb-settings', JSON.stringify(SETTINGS)); }catch(e){} }

const STR = {
 es:{
  tagline:'Remake de la Alpha 0.1', vsCpu:'Jugar contra la CPU', local:'2 jugadores', localSub:'mismo dispositivo',
  roster:'Nakamas', howto:'Cómo se juega', settings:'Ajustes', chooseTeam:'Elige tu equipo', blue:'Equipo Azul', red:'Equipo Rojo',
  you:'Tú', cpu:'CPU', picking:'Elige', pickYou:'Elige 3 nakamas para tu equipo', pickBlue:'Turno de elección: <b>Equipo Azul</b>', pickRed:'Turno de elección: <b>Equipo Rojo</b>',
  ready:'Equipos listos. ¡A luchar!', cpuPicking:'La CPU está eligiendo…', random:'Aleatorio', clear:'Borrar', fight:'¡Lucha!', soon:'Próximamente',
  turn:'Turno', turnOf:'Turno de', yourTurn:'Tu turno', cpuTurn:'Turno de la CPU', endTurn:'Fin del turno', pass:'Pasa el dispositivo',
  passSub:'Que el otro equipo no mire. Toca cuando estés listo.', imReady:'¡Estoy listo!', stunned:'Aturdido', done:'Hecho', dead:'K.O.',
  pickTarget:'Toca un objetivo marcado', cast:'Lanzar', cancel:'Cancelar', more:'Leer descripción', less:'Ocultar descripción',
  cd:'Enfriamiento', turns:'turnos', turn1:'turno', free:'Gratis', any:'Cualquiera',
  t_enemy:'1 enemigo', t_ally:'1 aliado', t_self:'Uno mismo', t_allEnemies:'Todos los enemigos', t_allAllies:'Todo el equipo',
  r_dead:'Está fuera de combate', r_acted:'Ya ha actuado este turno', r_stun:'Está aturdido', r_cd:'En enfriamiento', r_locked:'Habilidad bloqueada', r_mana:'No hay maná suficiente', r_target:'No hay objetivos válidos', r_wait:'No es tu turno',
  pause:'Pausa', resume:'Continuar', surrender:'Rendirse', quit:'Salir al menú', rematch:'Revancha', newTeams:'Nuevos equipos', menu:'Menú',
  victory:'¡Victoria!', defeat:'Derrota', wins:'gana', turnsPlayed:'Turnos', dmgDone:'Daño hecho', mvp:'MVP',
  lang:'Idioma', sound:'Efectos', music:'Música', timer:'Tiempo por turno', shake:'Temblor de pantalla', on:'Sí', off:'No', none:'∞',
  blocked:'¡Bloqueado!', sudden:'¡Muerte súbita!', stunTxt:'¡Aturdido!', immune:'¡Inmune!', ko:'¡K.O.!', givesUp:'¡Se rinde!', madness:'¡Locura!', satan:'¡Anticristo!', drunk:'¡Borracha!',
  used:'usa', on_:'sobre', allE:'todos los enemigos', allA:'su equipo', timeUp:'¡Se acabó el tiempo!', cantAct:'Nadie puede actuar',
  close:'Cerrar', statuses:'Efectos activos', noStatus:'Sin efectos activos', alts:'Habilidades alternativas (Borracha)', turnN:'Turno',
  effectSource:'Origen', effectRemaining:'Duración restante', effectTick:'activación restante', effectTicks:'activaciones restantes', effectOnce:'Una vez', effectSuppressed:'Suprimido por aturdimiento', effectSuppressedHelp:'El lanzador está aturdido: no se activa. La duración sigue contando; las activaciones perdidas no se recuperan.', effectStunHelp:'No puede actuar. Su daño y sus efectos periódicos hacia otros no se activan; conserva la protección y los efectos propios.', effectProtectionHelp:'La protección sigue activa aunque el lanzador esté aturdido.', effectSkills:'Habilidades', effectDelayed:'Se aplica una vez al vencer el plazo, incluso con aturdimiento.', effectNextTurn:'Próximo turno', effectImmune:'Inmunidad',
  dmg:'daño', pierce:'penetrante', heal:'Cura', stunN:'Aturde', invN:'Invulnerable', reduce:'Reducción de daño', unpN:'Reducción imperforable', atkN:'Ataque', perm:'permanente',
  dot:'por turno', hits:'durante', ignoresInv:'Ignora invulnerabilidad', nostunN:'Ignora aturdimientos', resN:'Recurso extra', unlock:'Desbloquea', boostN:'Potencia',
  cdUpN:'Retrasa enfriamientos', halfN:'Mitad de vida', markN:'Marca de duda', satanN:'Venganza al morir', swapN:'Cambia habilidades', locuraN:'Mata a alguien al azar', neckN:'x2 contra marcados',
  koN:'10% K.O.', forever:'para siempre', s_inv:'Invulnerable', s_stun:'Aturdido', s_dred:'Reduce daño', s_dratio:'Reduce daño', s_unp:'Reducción imperforable', s_atk:'Ataque extra', s_atkPerm:'Ataque permanente',
  s_nostun:'Ignora aturdimientos', s_res:'Recurso extra', s_enable:'Habilidad desbloqueada', s_boost:'Habilidad potenciada', s_mark:'Duda infinita (mindundi)', s_satan:'Anticristo latente', s_dot:'Daño por turno', rLeft:'restantes',
  how:[
   '<b>Dos equipos de tres nakamas.</b> Gana quien deje fuera de combate a los tres rivales.',
   '<b>Maná:</b> al empezar tu turno, cada nakama vivo genera 1 maná aleatorio. El maná sobrante se guarda para los siguientes turnos.',
   '<b>Cada nakama actúa una vez por turno.</b> Toca una habilidad, lee el pergamino y toca un objetivo marcado en dorado.',
   'Los rombos grises cuestan <b>maná de cualquier tipo</b>. Los números sobre una habilidad son los turnos de enfriamiento.',
   '<b>Penetrante</b> ignora la reducción de daño. <b>Imperforable</b> reduce incluso el daño penetrante. <b>Invulnerable</b> bloquea todo salvo lo que lo ignore.',
   'Toca el retrato de cualquier nakama para ver sus habilidades y estados activos.',
   'Si se acaba el tiempo, el turno pasa automáticamente.', 'A partir del turno 21 llega la <b>muerte súbita</b>: cada nakama pierde cada vez más vida al empezar su turno.'],
  manaNames:{F:'Fuerza',R:'Racionalidad',P:'Pasión',E:'Espiritualidad',C:'Cualquiera'},
 },
 en:{
  tagline:'Remake of Alpha 0.1', vsCpu:'Play vs CPU', local:'2 players', localSub:'same device',
  roster:'Nakamas', howto:'How to play', settings:'Settings', chooseTeam:'Choose your team', blue:'Blue Team', red:'Red Team',
  you:'You', cpu:'CPU', picking:'Pick', pickYou:'Pick 3 nakamas for your team', pickBlue:'Now picking: <b>Blue Team</b>', pickRed:'Now picking: <b>Red Team</b>',
  ready:'Teams ready. Fight!', cpuPicking:'The CPU is choosing…', random:'Random', clear:'Clear', fight:'Fight!', soon:'Coming soon',
  turn:'Turn', turnOf:'Turn:', yourTurn:'Your turn', cpuTurn:'CPU turn', endTurn:'End turn', pass:'Pass the device',
  passSub:'Don’t let the other team peek. Tap when you are ready.', imReady:'I’m ready!', stunned:'Stunned', done:'Done', dead:'K.O.',
  pickTarget:'Tap a highlighted target', cast:'Cast', cancel:'Cancel', more:'Read description', less:'Hide description',
  cd:'Cooldown', turns:'turns', turn1:'turn', free:'Free', any:'Any',
  t_enemy:'1 enemy', t_ally:'1 ally', t_self:'Self', t_allEnemies:'All enemies', t_allAllies:'Whole team',
  r_dead:'Knocked out', r_acted:'Already acted this turn', r_stun:'Stunned', r_cd:'On cooldown', r_locked:'Skill locked', r_mana:'Not enough mana', r_target:'No valid targets', r_wait:'Not your turn',
  pause:'Paused', resume:'Resume', surrender:'Surrender', quit:'Quit to menu', rematch:'Rematch', newTeams:'New teams', menu:'Menu',
  victory:'Victory!', defeat:'Defeat', wins:'wins', turnsPlayed:'Turns', dmgDone:'Damage dealt', mvp:'MVP',
  lang:'Language', sound:'Sound effects', music:'Music', timer:'Turn time', shake:'Screen shake', on:'On', off:'Off', none:'∞',
  blocked:'Blocked!', sudden:'Sudden death!', stunTxt:'Stunned!', immune:'Immune!', ko:'K.O.!', givesUp:'Gives up!', madness:'Madness!', satan:'Antichrist!', drunk:'Drunk!',
  used:'uses', on_:'on', allE:'all enemies', allA:'the team', timeUp:'Time’s up!', cantAct:'Nobody can act',
  close:'Close', statuses:'Active effects', noStatus:'No active effects', alts:'Alternate skills (Borracha)', turnN:'Turn',
  effectSource:'Source', effectRemaining:'Time remaining', effectTick:'tick remaining', effectTicks:'ticks remaining', effectOnce:'Once', effectSuppressed:'Suppressed by stun', effectSuppressedHelp:'The caster is stunned: this does not activate. Duration keeps counting down; skipped ticks are lost.', effectStunHelp:'Cannot act. Recurring damage and effects on others do not activate; protection and self effects stay active.', effectProtectionHelp:'Protection stays active even while the caster is stunned.', effectSkills:'Abilities', effectDelayed:'Applies once when due, including while stunned.', effectNextTurn:'Next turn', effectImmune:'Immunity',
  dmg:'damage', pierce:'piercing', heal:'Heal', stunN:'Stun', invN:'Invulnerable', reduce:'Damage reduction', unpN:'Unpierceable reduction', atkN:'Attack', perm:'permanent',
  dot:'per turn', hits:'for', ignoresInv:'Ignores invulnerability', nostunN:'Ignore stuns', resN:'Extra resource', unlock:'Unlocks', boostN:'Boosts',
  cdUpN:'Delays cooldowns', halfN:'Half health', markN:'Doubt mark', satanN:'Revenge on death', swapN:'Swaps skills', locuraN:'Kills someone at random', neckN:'x2 vs marked',
  koN:'10% K.O.', forever:'forever', s_inv:'Invulnerable', s_stun:'Stunned', s_dred:'Damage reduction', s_dratio:'Damage reduction', s_unp:'Unpierceable reduction', s_atk:'Bonus attack', s_atkPerm:'Permanent attack',
  s_nostun:'Ignores stuns', s_res:'Extra resource', s_enable:'Skill unlocked', s_boost:'Skill boosted', s_mark:'Infinite Doubt (nobody)', s_satan:'Antichrist dormant', s_dot:'Damage over time', rLeft:'left',
  how:[
   '<b>Two teams of three nakamas.</b> Knock out all three rivals to win.',
   '<b>Mana:</b> at the start of your turn, each living nakama generates 1 random mana. Leftover mana carries over.',
   '<b>Each nakama acts once per turn.</b> Tap a skill, read the scroll, then tap a target highlighted in gold.',
   'Grey diamonds cost <b>mana of any type</b>. A number over a skill shows its remaining cooldown.',
   '<b>Piercing</b> ignores damage reduction. <b>Unpierceable</b> reduction even lowers piercing damage. <b>Invulnerable</b> blocks everything except skills that ignore it.',
   'Tap any nakama’s portrait to see their skills and active effects.',
   'When the timer runs out, the turn passes automatically.', 'From turn 21 on, <b>sudden death</b> kicks in: every nakama loses more and more health at the start of its turn.'],
  manaNames:{F:'Strength',R:'Reason',P:'Passion',E:'Spirit',C:'Any'},
 }
};
const L = k => (STR[SETTINGS.lang]||STR.es)[k] ?? STR.es[k] ?? k;

Object.assign(STR.es,{draw:'¡Empate!',autoPass:'Pasar si nadie puede actuar',layout:'Campo de batalla',auto:'Adaptable',compact:'Compacto',wide:'Panorámico',fullscreen:'Pantalla completa',musicStyle:'Banda sonora',original:'Original',procedural:'Ambiental',history:'Crónica del combate',spending:'Elegir chakras',automatic:'Automático',remaining:'por asignar',pickTarget:'Elige tu objetivo',inspectHint:'Un clic: elegir · Doble clic: descripción',r_armed:'Anticristo ya está preparado',r_payment:'Completa el reparto de chakras',s_delayed:'Pérdida de salud pendiente',saveError:'No se pudo guardar en este navegador',loadError:'No se pudo recuperar la partida',drawSub:'Los dos equipos han caído',s_support:'Apoyo',noHistory:'La batalla acaba de comenzar.'});
Object.assign(STR.en,{draw:'Draw!',autoPass:'Pass when no actions remain',layout:'Battlefield',auto:'Adaptive',compact:'Compact',wide:'Widescreen',fullscreen:'Fullscreen',musicStyle:'Soundtrack',original:'Original',procedural:'Ambient',history:'Battle history',spending:'Choose chakra',automatic:'Automatic',remaining:'left to assign',pickTarget:'Choose your target',inspectHint:'Click: select · Double-click: description',r_armed:'Antichrist is already armed',r_payment:'Finish allocating chakra',s_delayed:'Pending health loss',saveError:'This browser could not save the battle',loadError:'The battle could not be restored',drawSub:'Both teams have fallen',s_support:'Support',noHistory:'The battle has just begun.'});
STR.es.how=STR.es.how.filter(x=>!x.includes('muerte súbita'));
STR.en.how=STR.en.how.filter(x=>!x.includes('sudden death'));
STR.es.how[2]='<b>Cada nakama actúa una vez por turno.</b> Un clic elige una habilidad; después toca un objetivo amarillo para ejecutarla inmediatamente. Doble clic o doble toque abre la descripción original. No se puede deshacer.';
STR.en.how[2]='<b>Each nakama acts once per turn.</b> Click a skill, then a yellow target to execute it immediately. Double-click or double-tap opens its original description. Attacks cannot be undone.';
STR.es.how[3]='Los rombos negros cuestan <b>chakra de cualquier tipo</b>. Puedes elegir qué colores gastar. Los números sobre una habilidad indican su recarga.';
STR.en.how[3]='Black diamonds cost <b>chakra of any type</b>. You can choose which colors to spend. Numbers on skills indicate their cooldown.';
STR.es.how.push('Ambos equipos pueden elegir al mismo nakama. No hay muerte súbita. El pase por falta de acciones es opcional y empieza desactivado.');
STR.en.how.push('Opposing teams may choose the same character. There is no sudden death. Passing when no actions remain is optional and starts switched off.');
Object.assign(STR.es,{initialCd:'Recarga inicial',initialCdHint:'Cuenta desde el inicio del combate, incluso antes de usarla.',transformCdHint:'Borracha no reinicia la recarga.',cdNow:'Recarga restante',ownTurns:'turnos de tu equipo'});
Object.assign(STR.en,{initialCd:'Starting cooldown',initialCdHint:'Counts down from the start of battle, even before first use.',transformCdHint:'Borracha does not reset it.',cdNow:'Cooldown remaining',ownTurns:'of your team’s turns'});
STR.es.how.push('Voluntad Ólmica está disponible desde el principio, si tienes los chakras necesarios. Locura empieza con 5 turnos de recarga, que se reducen en los turnos de su equipo incluso antes de usar Borracha.');
STR.en.how.push('Voluntad Ólmica is available from the start if you have the required chakra. Locura starts with a 5-turn cooldown, which counts down on its team’s turns even before using Borracha.');
configureEngine({translate:L});
function applyLayout(){ document.documentElement.dataset.layout=SETTINGS.layout; document.documentElement.lang=SETTINGS.lang; }
applyLayout();

/* ===================== Audio (all synthesized) ===================== */
const AUDIO = (()=>{
  const tracks={menu:new Audio('assets/menu.mp3'),battle:new Audio('assets/battle.mp3')};
  Object.values(tracks).forEach(a=>{a.loop=true;a.preload='none';a.volume=.35;});
  let unlocked=false, scene='menu';
  function syncTracks(){for(const [key,a] of Object.entries(tracks)){if(unlocked&&SETTINGS.music&&SETTINGS.musicStyle==='original'&&!document.hidden&&key===scene)a.play().catch(()=>{});else a.pause();}}
  let ctx=null, master, sfxBus, musBus, noiseBuf, musicTimer=null, nextBar=0, bar=0, intensity=0;
  function init(){
    unlocked=true;syncTracks();
    if(ctx) { if(ctx.state==='suspended') ctx.resume(); return; }
    try{ ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    master = ctx.createGain(); master.gain.value=.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = SETTINGS.sfx?.8:0; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = (SETTINGS.music&&SETTINGS.musicStyle==='procedural')?.32:0; musBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate*1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    startMusic();
  }
  function apply(){syncTracks(); if(!ctx)return; sfxBus.gain.setTargetAtTime(SETTINGS.sfx?.8:0, ctx.currentTime,.05); musBus.gain.setTargetAtTime((SETTINGS.music&&SETTINGS.musicStyle==='procedural')?.32:0, ctx.currentTime,.3); }
  function env(g, t, a, peak, dec){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec); }
  function osc(type, f, t, dur, peak, bus, f2){
    const o=ctx.createOscillator(), g=ctx.createGain(); o.type=type; o.frequency.setValueAtTime(f,t);
    if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur);
    env(g,t,.005,peak,dur); o.connect(g); g.connect(bus||sfxBus); o.start(t); o.stop(t+dur+.05);
  }
  function noise(t, dur, peak, type, f, f2, q, bus){
    const s=ctx.createBufferSource(); s.buffer=noiseBuf; const fl=ctx.createBiquadFilter(); fl.type=type||'lowpass';
    fl.frequency.setValueAtTime(f||1200,t); if(f2) fl.frequency.exponentialRampToValueAtTime(f2,t+dur); fl.Q.value=q||1;
    const g=ctx.createGain(); env(g,t,.004,peak,dur); s.connect(fl); fl.connect(g); g.connect(bus||sfxBus); s.start(t); s.stop(t+dur+.05);
  }
  const S = {
    click(){ const t=ctx.currentTime; osc('sine',880,t,.06,.18); osc('sine',1320,t+.02,.05,.08); },
    select(){ const t=ctx.currentTime; osc('triangle',660,t,.08,.2); osc('triangle',990,t+.05,.12,.16); },
    deny(){ const t=ctx.currentTime; osc('square',180,t,.12,.08); osc('square',140,t+.08,.14,.08); },
    pickChar(){ const t=ctx.currentTime; noise(t,.18,.35,'bandpass',800,3200,2); osc('sine',520,t,.15,.18,null,780); },
    slash(){ const t=ctx.currentTime; noise(t,.22,.6,'bandpass',600,6000,3); osc('sawtooth',300,t,.12,.05,null,1200); },
    hit(big){ const t=ctx.currentTime; osc('sine',big?110:160,t,big?.45:.25,.9,null,40); noise(t,big?.35:.18,big?.8:.5,'lowpass',big?2400:3200,200,1); },
    fire(){ const t=ctx.currentTime; noise(t,.6,.6,'bandpass',300,2400,1.5); noise(t+.05,.5,.3,'lowpass',800,200,1); osc('sawtooth',90,t,.5,.12,null,50); },
    heal(){ const t=ctx.currentTime; [523,659,784,1046].forEach((f,i)=>{osc('sine',f,t+i*.07,.5,.16); osc('triangle',f*2,t+i*.07,.3,.04);}); },
    shield(){ const t=ctx.currentTime; osc('sine',880,t,.9,.2); osc('sine',1318,t,.7,.12); osc('sine',1760,t+.03,.5,.06); },
    stun(){ const t=ctx.currentTime; for(let i=0;i<5;i++) osc('triangle',1200-i*120,t+i*.06,.12,.12); },
    buff(){ const t=ctx.currentTime; [392,494,587,784].forEach((f,i)=>osc('triangle',f,t+i*.06,.35,.14)); noise(t,.4,.15,'highpass',3000,8000,1); },
    dark(){ const t=ctx.currentTime; osc('sawtooth',110,t,.8,.18,null,55); osc('sawtooth',116,t,.8,.14,null,58); noise(t,.8,.2,'lowpass',600,100,4); },
    madness(){ const t=ctx.currentTime; for(let i=0;i<8;i++) osc('square',rnd(200,900),t+i*.05,.08,.07); noise(t,.5,.2,'bandpass',1500,300,6); },
    death(){ const t=ctx.currentTime; osc('sawtooth',320,t,.9,.22,null,40); noise(t,.7,.4,'lowpass',1800,100,1); osc('sine',60,t,.8,.6,null,30); },
    taiko(){ const t=ctx.currentTime; osc('sine',150,t,.5,1,null,55); noise(t,.08,.4,'lowpass',900,300,1); osc('sine',75,t+.18,.4,.6,null,40); },
    win(){ const t=ctx.currentTime; [294,349,392,440,523,587].forEach((f,i)=>{osc('triangle',f,t+i*.11,.5,.18); osc('sine',f*2,t+i*.11,.4,.06);}); osc('triangle',587,t+.7,1.4,.2); osc('triangle',880,t+.7,1.4,.12); },
    lose(){ const t=ctx.currentTime; [440,415,392,330].forEach((f,i)=>osc('triangle',f,t+i*.22,.5,.16)); },
    mana(){ const t=ctx.currentTime; osc('sine',1568,t,.15,.08); osc('sine',2093,t+.04,.15,.06); },
    tick(){ const t=ctx.currentTime; osc('square',1000,t,.03,.05); },
  };
  function play(name, arg){ if(!ctx||!SETTINGS.sfx||document.hidden) return; try{ S[name]&&S[name](arg); }catch(e){} }
  /* ---- generative music: Japanese in-scale over taiko groove ---- */
  const SCALE=[0,1,5,7,8]; // in-sen / miyako-bushi flavour
  const ROOT=146.83; // D3
  let melIdx=2;
  function note(deg, oct){ const n=SCALE.length; const o=Math.floor(deg/n); const st=SCALE[((deg%n)+n)%n]+12*(o+oct); return ROOT*Math.pow(2,st/12); }
  function pluck(f,t,peak,dur){ // koto-ish
    const o=ctx.createOscillator(), o2=ctx.createOscillator(), g=ctx.createGain(), fl=ctx.createBiquadFilter();
    o.type='triangle'; o2.type='sawtooth'; o.frequency.value=f; o2.frequency.value=f*1.003; fl.type='lowpass'; fl.frequency.setValueAtTime(f*8,t); fl.frequency.exponentialRampToValueAtTime(f*1.5,t+dur);
    const g2=ctx.createGain(); g2.gain.value=.25; o2.connect(g2); g2.connect(fl); o.connect(fl); fl.connect(g); g.connect(musBus);
    env(g,t,.004,peak,dur); o.start(t); o2.start(t); o.stop(t+dur+.1); o2.stop(t+dur+.1);
  }
  function drum(t,peak,f){ const o=ctx.createOscillator(),g=ctx.createGain(); o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(f*.4,t+.3); env(g,t,.003,peak,.35); o.connect(g); g.connect(musBus); o.start(t); o.stop(t+.45);
    noise(t,.05,peak*.25,'lowpass',700,200,1,musBus); }
  function shaker(t,peak){ noise(t,.04,peak,'highpass',6000,9000,1,musBus); }
  function scheduleBar(t0){
    const beat=60/(92+intensity*22), bars=bar++;
    // drone
    const dro=ctx.createOscillator(), dg=ctx.createGain(); dro.type='sine'; dro.frequency.value=ROOT/2; dg.gain.setValueAtTime(.0001,t0); dg.gain.exponentialRampToValueAtTime(.12,t0+beat); dg.gain.exponentialRampToValueAtTime(.0001,t0+beat*4); dro.connect(dg); dg.connect(musBus); dro.start(t0); dro.stop(t0+beat*4+.1);
    // taiko pattern
    const pat = intensity>0.5 ? [1,0,.6,0,1,.5,.7,.4] : [1,0,0,0,.7,0,.4,0];
    pat.forEach((v,i)=>{ if(v) drum(t0+i*beat/2, v*(.5+intensity*.35), i%4===0?110:150); });
    for(let i=0;i<8;i++) shaker(t0+i*beat/2+beat/4, .04+intensity*.05);
    // melody
    const steps = intensity>0.5 ? 8 : 4;
    for(let i=0;i<steps;i++){
      if(Math.random()<.25) continue;
      melIdx += pick([-2,-1,-1,1,1,2,0]); melIdx=Math.max(-1,Math.min(9,melIdx));
      pluck(note(melIdx,1), t0+i*beat*4/steps, .16, beat*1.6);
    }
    if(bars%4===0) pluck(note(0,0), t0, .14, beat*3.5);
    return beat*4;
  }
  function startMusic(){
    if(musicTimer) return;
    nextBar = ctx.currentTime+.2;
    musicTimer = setInterval(()=>{ if(!ctx || document.hidden || !SETTINGS.music || SETTINGS.musicStyle!=='procedural'){if(ctx)nextBar=ctx.currentTime+.2;return;} while(nextBar < ctx.currentTime+0.6){ nextBar += scheduleBar(nextBar); } }, 150);
  }
  return {init,play,apply,setIntensity(v){intensity=v;scene=v>.5?'battle':'menu';syncTracks();},visibility(){syncTracks();if(ctx){if(document.hidden)ctx.suspend();else if(unlocked)ctx.resume().catch(()=>{});}},get ready(){return !!ctx;}};
})();

/* ===================== Animated background ===================== */
const BG = (()=>{
  const cv=$('#bg'), g=cv.getContext('2d');
  let W=0,H=0,DPR=1, t0=performance.now(), last=t0;
  const mouse={x:.5,y:.5,tx:.5,ty:.5};
  const mood={tint:[75,141,255], target:[75,141,255], intensity:0, tInt:0, embers:0, tEmbers:0, flash:0};
  const layers=[]; const stars=[]; let petals=[], embers=[], birds=[]; let clouds=[];
  function periodic(n, amp){ const h=[]; for(let k=1;k<=n;k++) h.push({k:pick([1,2,3,4,5,6,7,8,9,11,13,16].slice(0,6+k)), a:amp/k*rnd(.6,1.2), p:rnd(0,Math.PI*2)}); return u=>h.reduce((s,c)=>s+c.a*Math.sin(2*Math.PI*c.k*u+c.p),0); }
  function setup(){
    layers.length=0;
    layers.push({f:periodic(6,.07), base:.62, speed:.004, col:[34,38,74], depth:.2});
    layers.push({f:periodic(6,.08), base:.71, speed:.009, col:[22,25,52], depth:.45, pagoda:.33});
    layers.push({f:periodic(5,.06), base:.83, speed:.018, col:[12,14,32], depth:.8, trees:true});
    stars.length=0; for(let i=0;i<140;i++) stars.push({x:Math.random(), y:Math.pow(Math.random(),1.6)*.6, r:rnd(.3,1.4), p:rnd(0,6), s:rnd(.5,2)});
    clouds = Array.from({length:5},()=>({x:Math.random(), y:rnd(.08,.4), w:rnd(.25,.5), s:rnd(.004,.012), a:rnd(.05,.12)}));
    petals = Array.from({length: REDUCED?10:(innerWidth<600?26:44)},()=>newPetal(true));
  }
  function newPetal(any){ return {x:Math.random()*1.2-.1, y:any?Math.random():-0.05, vy:rnd(.02,.05), vx:rnd(-.01,.02), r:rnd(3,6), a:rnd(0,6), va:rnd(-2,2), sway:rnd(0,6), c:pick(['#f7b6c8','#ffd1dc','#f39ab4','#ffe4ec'])}; }
  function resize(){ DPR=Math.min(window.devicePixelRatio||1, innerWidth<700?1.5:1.75); W=innerWidth; H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; g.setTransform(DPR,0,0,DPR,0,0); }
  function rgb(c,a){ return `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`; }
  function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function frame(now){
    if(document.hidden){last=now;requestAnimationFrame(frame);return;}
    const dt=REDUCED?0:Math.min(.05,(now-last)/1000); last=now; const T=REDUCED?0:(now-t0)/1000;
    mouse.x+=(mouse.tx-mouse.x)*.04; mouse.y+=(mouse.ty-mouse.y)*.04;
    for(let i=0;i<3;i++) mood.tint[i]+=(mood.target[i]-mood.tint[i])*Math.min(1,dt*1.5);
    mood.intensity+=(mood.tInt-mood.intensity)*dt*1.2; mood.embers+=(mood.tEmbers-mood.embers)*dt;
    mood.flash=Math.max(0,mood.flash-dt*2.5);
    const tint=mood.tint;
    // sky
    const sky=g.createLinearGradient(0,0,0,H);
    sky.addColorStop(0, rgb(mix([8,9,24],tint,.06),1));
    sky.addColorStop(.55, rgb(mix([26,22,58],tint,.18+mood.intensity*.12),1));
    sky.addColorStop(1, rgb(mix([58,32,64],tint,.25+mood.intensity*.15),1));
    g.fillStyle=sky; g.fillRect(0,0,W,H);
    // stars
    for(const s of stars){ const a=.35+.65*Math.abs(Math.sin(T*s.s+s.p)); g.fillStyle=`rgba(255,248,230,${a*.8})`; g.beginPath(); g.arc(s.x*W+(mouse.x-.5)*-6, s.y*H, s.r, 0, 7); g.fill(); }
    // moon
    const mr=Math.max(38, Math.min(W,H)*.1), mx=W*.78+(mouse.x-.5)*-14, my=H*.2+(mouse.y-.5)*-8;
    const glow=g.createRadialGradient(mx,my,mr*.6,mx,my,mr*4.5); glow.addColorStop(0,`rgba(255,236,200,${.28+mood.intensity*.08})`); glow.addColorStop(1,'rgba(255,236,200,0)');
    g.fillStyle=glow; g.fillRect(0,0,W,H);
    const mg=g.createRadialGradient(mx-mr*.3,my-mr*.3,mr*.1,mx,my,mr); mg.addColorStop(0,'#fffaf0'); mg.addColorStop(1, rgb(mix([246,226,190],tint,.12),1));
    g.fillStyle=mg; g.beginPath(); g.arc(mx,my,mr,0,7); g.fill();
    g.fillStyle='rgba(180,160,130,.18)'; [[-.3,.1,.22],[.25,-.2,.15],[.1,.35,.12],[-.05,-.4,.09]].forEach(c=>{g.beginPath(); g.arc(mx+c[0]*mr,my+c[1]*mr,c[2]*mr,0,7); g.fill();});
    // clouds
    for(const c of clouds){ c.x+=c.s*dt; if(c.x>1.3) c.x=-.5; const cx=c.x*W, cy=c.y*H, cw=c.w*W;
      const cg=g.createRadialGradient(cx,cy,0,cx,cy,cw*.5); cg.addColorStop(0,rgb(mix([200,190,220],tint,.2),c.a)); cg.addColorStop(1,rgb([200,190,220],0));
      g.save(); g.translate(cx,cy); g.scale(1,.28); g.translate(-cx,-cy); g.fillStyle=cg; g.beginPath(); g.arc(cx,cy,cw*.5,0,7); g.fill(); g.restore(); }
    // birds
    if(!REDUCED && Math.random()<dt*.04 && birds.length<6){ const y=rnd(.12,.4); for(let i=0;i<pick([1,3,4]);i++) birds.push({x:-.05-i*.03, y:y+rnd(-.03,.03), s:rnd(.05,.08), p:rnd(0,6)}); }
    g.strokeStyle='rgba(10,10,20,.75)'; g.lineWidth=1.6;
    birds=birds.filter(b=>{ b.x+=b.s*dt; const bx=b.x*W, by=b.y*H+Math.sin(T*2+b.p)*4, w=Math.sin(T*9+b.p)*4;
      g.beginPath(); g.moveTo(bx-7,by-w); g.quadraticCurveTo(bx-3,by-2,bx,by); g.quadraticCurveTo(bx+3,by-2,bx+7,by-w); g.stroke(); return b.x<1.1; });
    // mountains
    layers.forEach((L,li)=>{
      const off = T*L.speed + (mouse.x-.5)*L.depth*.03;
      const col = mix(L.col, tint, .08+li*.02+mood.intensity*.05);
      g.fillStyle=rgb(col,1); g.beginPath(); g.moveTo(0,H);
      const step=Math.max(4,W/160);
      for(let x=0;x<=W+step;x+=step){ const u=x/W*.5+off; g.lineTo(x, H*(L.base - L.f(u)) + (mouse.y-.5)*L.depth*10); }
      g.lineTo(W,H); g.closePath(); g.fill();
      if(L.pagoda!==undefined){ // repeating pagoda silhouette
        for(let k=-1;k<=2;k++){ const u=L.pagoda+k; const x=(u-off)*W*2; if(x<-80||x>W+80) continue;
          const y=H*(L.base - L.f(L.pagoda)) + (mouse.y-.5)*L.depth*10; drawPagoda(x,y,Math.min(W,H)*.06,col); } }
      if(L.trees){ g.fillStyle=rgb(col,1); for(let k=0;k<22;k++){ const u=k/22; let x=((u-off*2)%1+1)%1*W*1.1-W*.05; const y=H*(L.base - L.f(x/W*.5+off))+(mouse.y-.5)*L.depth*10; drawPine(x,y,Math.min(W,H)*(.04+((k*7)%5)*.008)); } }
      // mist band above each layer
      const my2=H*(L.base-.04); const mist=g.createLinearGradient(0,my2-H*.08,0,my2+H*.06);
      mist.addColorStop(0,rgb(mix([180,170,210],tint,.25),0)); mist.addColorStop(.6,rgb(mix([180,170,210],tint,.25),.07+.03*Math.sin(T*.4+li))); mist.addColorStop(1,rgb([180,170,210],0));
      g.fillStyle=mist; g.fillRect(0,my2-H*.08,W,H*.14);
    });
    // embers (battle intensity)
    if(!REDUCED && Math.random()<mood.embers*dt*30) embers.push({x:Math.random(), y:1.02, vy:rnd(.05,.14), vx:rnd(-.02,.02), r:rnd(1,2.6), life:1});
    embers=embers.filter(e=>{ e.y-=e.vy*dt; e.x+=e.vx*dt+Math.sin(T*3+e.y*20)*.0006; e.life-=dt*.35; g.fillStyle=`rgba(255,${150+Math.random()*60|0},80,${Math.max(0,e.life)})`; g.beginPath(); g.arc(e.x*W,e.y*H,e.r,0,7); g.fill(); return e.life>0; });
    // petals
    const wind = Math.sin(T*.3)*.02 + .01;
    for(const p of petals){ p.y+=p.vy*dt; p.x+=(p.vx+wind)*dt+Math.sin(T*1.5+p.sway)*(REDUCED?0:.0008); p.a+=p.va*dt;
      if(p.y>1.05||p.x>1.15) Object.assign(p,newPetal(false));
      g.save(); g.translate(p.x*W,p.y*H); g.rotate(p.a); g.scale(1,Math.abs(Math.sin(p.a*1.3))*.6+.4); g.fillStyle=p.c; g.globalAlpha=.85;
      g.beginPath(); g.ellipse(0,0,p.r,p.r*.6,0,0,7); g.fill(); g.restore(); }
    g.globalAlpha=1;
    // vignette + flash
    const vg=g.createRadialGradient(W/2,H*.45,Math.min(W,H)*.3,W/2,H*.5,Math.max(W,H)*.8); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,`rgba(2,2,8,${.55+mood.intensity*.1})`);
    g.fillStyle=vg; g.fillRect(0,0,W,H);
    if(mood.flash>0){ g.fillStyle=rgb(mix([255,255,255],tint,.3),mood.flash*.35); g.fillRect(0,0,W,H); }
    requestAnimationFrame(frame);
  }
  function drawPagoda(x,y,s,col){
    g.fillStyle=rgb(col,1); g.fillRect(x-s*.08,y-s*3.2,s*.16,s*3.2);
    for(let i=0;i<4;i++){ const yy=y-s*(.6+i*.75), w=s*(1-i*.17);
      g.beginPath(); g.moveTo(x-w*1.15,yy); g.quadraticCurveTo(x-w*.6,yy-s*.18,x,yy-s*.35); g.quadraticCurveTo(x+w*.6,yy-s*.18,x+w*1.15,yy); g.lineTo(x+w*.7,yy+s*.06); g.lineTo(x-w*.7,yy+s*.06); g.fill();
      g.fillRect(x-w*.55,yy,w*1.1,s*.5); }
  }
  function drawPine(x,y,s){ g.beginPath(); g.moveTo(x,y-s*2.2); g.lineTo(x+s*.55,y-s*.9); g.lineTo(x+s*.3,y-s*.9); g.lineTo(x+s*.75,y+2); g.lineTo(x-s*.75,y+2); g.lineTo(x-s*.3,y-s*.9); g.lineTo(x-s*.55,y-s*.9); g.fill(); }
  addEventListener('resize',()=>{ resize(); });
  addEventListener('pointermove',e=>{ mouse.tx=e.clientX/innerWidth; mouse.ty=e.clientY/innerHeight; },{passive:true});
  resize(); setup(); requestAnimationFrame(frame);
  return {
    team(t){ mood.target = t===0?[75,141,255]:t===1?[255,77,97]:[140,120,220]; },
    battle(on){ mood.tInt=on?1:0; mood.tEmbers=on?.6:0; },
    flash(v){ if(REDUCED)return; mood.flash=Math.max(mood.flash,v||1); },
    calm(){ mood.target=[140,120,220]; mood.tInt=0; mood.tEmbers=0; },
  };
})();

/* ===================== FX layer (particles over the UI) ===================== */
const FX = (()=>{
  const cv=$('#fx'), g=cv.getContext('2d'); let W,H,DPR; let parts=[], beams=[], rings=[], slashes=[]; let running=false, last=0, frameId=0;
  function resize(){ DPR=Math.min(window.devicePixelRatio||1,2); W=innerWidth; H=innerHeight; cv.width=W*DPR; cv.height=H*DPR; g.setTransform(DPR,0,0,DPR,0,0); }
  addEventListener('resize',resize); resize();
  function kick(){ if(!running){ running=true; last=performance.now(); frameId=requestAnimationFrame(loop); } }
  function loop(now){
    frameId=0;
    const dt=Math.min(.05,(now-last)/1000); last=now; g.clearRect(0,0,W,H);
    g.globalCompositeOperation='lighter';
    rings=rings.filter(r=>{ r.t+=dt; const k=r.t/r.d; if(k>=1) return false; g.strokeStyle=r.c; g.globalAlpha=1-k; g.lineWidth=r.w*(1-k)+1; g.beginPath(); g.arc(r.x,r.y,r.r0+(r.r1-r.r0)*(1-Math.pow(1-k,3)),0,7); g.stroke(); return true; });
    beams=beams.filter(b=>{ b.t+=dt; const k=Math.min(1,b.t/b.d); const e=1-Math.pow(1-k,2);
      const x=b.x0+(b.x1-b.x0)*e, y=b.y0+(b.y1-b.y0)*e - Math.sin(k*Math.PI)*b.arc;
      b.trail.push([x,y]); if(b.trail.length>14) b.trail.shift();
      g.globalAlpha=1; for(let i=1;i<b.trail.length;i++){ const a=i/b.trail.length; g.strokeStyle=b.c; g.globalAlpha=a*.9; g.lineWidth=b.w*a; g.beginPath(); g.moveTo(...b.trail[i-1]); g.lineTo(...b.trail[i]); g.stroke(); }
      g.fillStyle='#fff'; g.globalAlpha=1; g.beginPath(); g.arc(x,y,b.w*.45,0,7); g.fill();
      if(Math.random()<.8) parts.push({x,y,vx:rnd(-40,40),vy:rnd(-40,40),life:.5,max:.5,r:rnd(1.5,3.5),c:b.c,g:0});
      if(k>=1){ b.done&&b.done(); return false; } return true; });
    slashes=slashes.filter(s=>{ s.t+=dt; const k=s.t/s.d; if(k>=1) return false; const grow=Math.min(1,k*3), fade=k<.4?1:1-(k-.4)/.6;
      g.strokeStyle=s.c; g.lineCap='round'; g.globalAlpha=fade; g.lineWidth=s.w*fade;
      g.beginPath(); g.moveTo(s.x-s.dx, s.y-s.dy); g.lineTo(s.x-s.dx+2*s.dx*grow, s.y-s.dy+2*s.dy*grow); g.stroke();
      g.strokeStyle='#fff'; g.lineWidth=s.w*.35*fade; g.stroke(); return true; });
    parts=parts.filter(p=>{ p.life-=dt; if(p.life<=0) return false; p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=.985; p.vy*=.985;
      const a=p.life/p.max; g.globalAlpha=a; g.fillStyle=p.c;
      if(p.star){ drawStar(p.x,p.y,p.r*(.6+a*.6)); } else { g.beginPath(); g.arc(p.x,p.y,p.r*(.4+a*.6),0,7); g.fill(); }
      return true; });
    g.globalAlpha=1; g.globalCompositeOperation='source-over';
    if(parts.length||beams.length||rings.length||slashes.length) frameId=requestAnimationFrame(loop); else { running=false; g.clearRect(0,0,W,H); }
  }
  function drawStar(x,y,r){ g.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4, rr=i%2?r*.35:r; g.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);} g.closePath(); g.fill(); }
  const scale = REDUCED?.35:1;
  return {
    clear(){cancelAnimationFrame(frameId);frameId=0;running=false;beams.forEach(b=>b.done?.());parts=[];beams=[];rings=[];slashes=[];g.clearRect(0,0,W,H);},
    burst(x,y,c,n=26,spd=260,opts={}){ for(let i=0;i<n*scale;i++){ const a=rnd(0,Math.PI*2), s=rnd(.25,1)*spd; parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(opts.up||0),life:rnd(.4,.9),max:.9,r:rnd(2,opts.r||5),c:Array.isArray(c)?pick(c):c,g:opts.g??380,star:opts.star}); } kick(); },
    rise(x,y,c,n=22,w=60){ for(let i=0;i<n*scale;i++) parts.push({x:x+rnd(-w,w),y:y+rnd(-10,40),vx:rnd(-15,15),vy:rnd(-160,-60),life:rnd(.7,1.3),max:1.3,r:rnd(2,4.5),c:Array.isArray(c)?pick(c):c,g:-40,star:Math.random()<.4}); kick(); },
    ring(x,y,c,r1=90,d=.55,w=8){ rings.push({x,y,c,r0:8,r1,d,t:0,w}); kick(); },
    beam(x0,y0,x1,y1,c,d=.38,w=10,arc=60){ return new Promise(res=>{ beams.push({x0,y0,x1,y1,c,d,w,arc,t:0,trail:[],done:res}); kick(); }); },
    slash(x,y,c,len=90,ang){ const a=ang??rnd(-.9,-.5); slashes.push({x,y,c,dx:Math.cos(a)*len,dy:Math.sin(a)*len,w:9,d:.38,t:0}); kick(); },
  };
})();

/* ===================== UI ===================== */
const TEAMCOL = ['var(--blue)','var(--red)'];
const TEAMHEX = ['#4b8dff','#ff4d61'];
let SCREEN = 'title';
let SEL = null;           // character-select state
let PICK = null;          // {u, sid} selected skill in battle
let BUSY = false;         // animations running
let PAUSED = false;
let TIMER = {left:60, run:false, last:0, warned:false};
let GENERATION=0, HANDOFF=false, autoPassTimer=null, finishing=false;
let NET=null; // room connection; battle state always comes from the server
let VIEW = 0;             // which team sits at the bottom

Object.assign(STR.es,{online:'Jugar online',room:'Sala',roomHelp:'Los dos escribís el mismo código. Elegid equipo y pulsad Listo.',roomCode:'Código de sala',joinRoom:'Entrar en la sala',newRoom:'Nuevo código',connecting:'Conectando…',reconnecting:'Reconectando…',opponentOffline:'Tu rival está desconectado',opponentWaiting:'Esperando a tu amigo…',onlineReady:'Listo para luchar',waitingReady:'Esperando al rival…',changeTeam:'Cambiar equipo',onlineHelp:'La sala dura 24 horas desde la última actividad. El reloj online sigue aunque abras un menú o cambies de aplicación.',leaveRoom:'Salir de la sala',roomFull:'Esta sala ya tiene dos jugadores. Usad otro código.',roomCodeError:'Usa de 4 a 24 letras o números.',onlineError:'No se pudo conectar. Comprueba la conexión y vuelve a entrar.',onlineOnly:'Abre la versión web para jugar online.',stale:'La partida ha avanzado. Inténtalo de nuevo.',roomLink:'Copiar enlace',copied:'Enlace copiado',onlineSeat:'Tu equipo',onlineTimer:'Reloj compartido',noTimer:'Sin límite',onlineWait:'Esperando el turno de tu rival',roomExpired:'La sala ha caducado. Crea otra.',connectedElsewhere:'Esta sala se ha abierto en otra pestaña.'});
Object.assign(STR.en,{online:'Play online',room:'Room',roomHelp:'Both friends enter the same code. Choose your teams and press Ready.',roomCode:'Room code',joinRoom:'Join room',newRoom:'New code',connecting:'Connecting…',reconnecting:'Reconnecting…',opponentOffline:'Your friend is disconnected',opponentWaiting:'Waiting for your friend…',onlineReady:'Ready to fight',waitingReady:'Waiting for opponent…',changeTeam:'Change team',onlineHelp:'Rooms last 24 hours after the last activity. The online clock keeps running in menus and while the app is in the background.',leaveRoom:'Leave room',roomFull:'This room already has two players. Use another code.',roomCodeError:'Use 4–24 letters or numbers.',onlineError:'Could not connect. Check your connection and rejoin.',onlineOnly:'Open the web version to play online.',stale:'The match has advanced. Please try again.',roomLink:'Copy invite link',copied:'Link copied',onlineSeat:'Your team',onlineTimer:'Shared clock',noTimer:'No time limit',onlineWait:'Waiting for your opponent’s turn',roomExpired:'Room expired. Create another.',connectedElsewhere:'This room was opened in another tab.'});
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function teamName(t){ if((SCREEN==='select'?SEL?.mode:S?.mode)==='cpu') return t===0?L('you'):L('cpu'); return t===0?L('blue'):L('red'); }
function mainMana(cost){ return MANA.find(k=>cost[k]) || 'C'; }
function pipsHTML(cost){ const out=[]; MANA.forEach(k=>{ for(let i=0;i<(cost[k]||0);i++) out.push(`<i style="--mc:${MANA_COL[k]}"></i>`); }); for(let i=0;i<(cost.C||0);i++) out.push(`<i style="--mc:${MANA_COL.C}"></i>`); return out.join(''); }
function costHTML(cost){ const p=pipsHTML(cost); return p ? `<span class="costs" title="${MANA.concat('C').filter(k=>cost[k]).map(k=>cost[k]+' '+L('manaNames')[k]).join(', ')}">${p}</span>` : `<span class="costs"><span class="free">${L('free')}</span></span>`; }
function turnsTxt(n){ return n===1? `1 ${L('turn1')}` : `${n} ${L('turns')}`; }
function descOf(sk){ return sk.description; }
function skillName(cid, sid){ const s=skillOf(cid,sid); return s?s.name:sid; }
function tagsFor(cid, sk){
  const T=[]; const add=(c,t)=>T.push(`<span class="${c}">${esc(t)}</span>`);
  sk.effects.forEach(e=>{
    switch(e.t){
      case 'dmg': add('d', `${e.v} ${L('dmg')}${e.pierce?' '+L('pierce'):''}`); break;
      case 'dot': add('d', e.hits>99 ? `${e.v} ${L('dmg')} ${L('dot')} · ${L('forever')}` : `${e.v} ${L('dmg')} ${L('hits')} ${turnsTxt(e.hits)}`); break;
      case 'neck': add('d', `${e.v} ${L('dmg')} ${L('pierce')}`); add('d', L('neckN')); break;
      case 'heal': add('h', `${L('heal')} ${e.v}`); break;
      case 'stun': add('s', `${L('stunN')} ${turnsTxt(e.n)}`); break;
      case 'inv': add('b', `${L('invN')} ${turnsTxt(e.r)}`); break;
      case 'dred': add('b', `${L('reduce')} −${e.v} · ${turnsTxt(e.r)}`); break;
      case 'dratio': add('b', `${L('reduce')} ${Math.round((1-e.v)*100)}% · ${turnsTxt(e.r)}`); break;
      case 'unp': add('b', `${L('unpN')} −${e.v} · ${turnsTxt(e.r)}`); break;
      case 'atk': add('b', `${L('atkN')} +${e.v} · ${turnsTxt(e.r)}`); break;
      case 'atkPerm': add('b', `${L('atkN')} +${e.v} ${L('perm')}`); break;
      case 'nostun': add('b', `${L('nostunN')} · ${e.r===Infinity?L('forever'):turnsTxt(e.r)}`); break;
      case 'res': add('b', `${L('resN')} +${e.v} · ${turnsTxt(e.r)}`); break;
      case 'enable': add('b', `${L('unlock')} ${skillName(cid,e.skill)}`); break;
      case 'boost': add('b', `${L('boostN')} ${skillName(cid,e.skill)} ${e.mult!==1?'×'+e.mult:'+'+e.add}`); break;
      case 'cdUp': add('s', `${L('cdUpN')} +${e.v}`); break;
      case 'halfHp': add('d', L('halfN')); break;
      case 'mark': add('s', L('markN')); break;
      case 'satan': add('d', L('satanN')); break;
      case 'swap': add('b', L('swapN')); break;
      case 'locura': add('d', L('locuraN')); break;
      case 'manopuntura': add('b', `${L('invN')} ${turnsTxt(e.r)}`); add('d', `${e.v} ${L('dmg')}`); break;
    }
  });
  if(sk.ignoreInv) add('s', L('ignoresInv'));
  return T.join('');
}
function medalHTML(sk){ const m=mainMana(sk.cost); return `<div class="medal ${m==='E'?'light':''}" style="--sc:${MANA_COL[m]}"><img src="${sk.image}" alt=""></div>`; }
function skillBlock(cid, sk, cls=''){
  return `<div class="skl ${cls}">${medalHTML(sk)}<div><h4>${esc(sk.name)}</h4>
    <div class="row" style="margin-top:4px">${costHTML(sk.cost)}<span class="meta">CD ${sk.cd} · ${L('t_'+sk.target)}</span></div>
    ${sk.startCd?`<p class="cooldown-note"><b>${L('initialCd')}: ${sk.startCd} ${L('ownTurns')}.</b> ${L('initialCdHint')} ${cid==='irmina'?L('transformCdHint'):''}</p>`:''}
    <div class="tags">${tagsFor(cid,sk)}</div><p>${esc(descOf(sk))}</p></div></div>`;
}

/* ---------- generic modal (paper scroll) ---------- */
function openModal(inner,opts={}){
  closeModal();
  const d=document.createElement('dialog');d.id='modal';d.className='scrim';d._returnFocus=document.activeElement;d._onClose=opts.onClose;
  d.innerHTML=`<div class="scroll"><div class="rod"></div><div class="paper ${opts.cls||''}">${opts.noClose?'':`<button class="closex" data-close aria-label="${L('close')}">${uiIcon('close',18)}</button>`}${inner}</div><div class="rod"></div></div>`;
  d.addEventListener('click',e=>{if((e.target===d&&!opts.noClose)||e.target.closest('[data-close]'))closeModal();});
  d.addEventListener('cancel',e=>{e.preventDefault();if(!opts.noClose)closeModal();});
  document.body.appendChild(d);d.showModal();AUDIO.play('select');return d;
}
function closeModal(){
  const m=$('#modal');if(!m)return;
  m.close();m.remove();m._onClose?.();
  if(m._returnFocus?.isConnected)m._returnFocus.focus();
}

function toast(msg){ $$('.toast').forEach(t=>t.remove()); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2300); }
function banner(text, sub, color){
  const b=$('#banner'); b.innerHTML=`<div class="band" style="--bc:${color}"><span>${esc(text)}${sub?`<small>${esc(sub)}</small>`:''}</span></div>`;
  b.hidden=false; clearTimeout(banner._t); banner._t=setTimeout(()=>{ b.hidden=true; b.innerHTML=''; },1550);
}
function popAt(x,y,text,color,cls=''){
  const p=document.createElement('div'); p.className='pop '+cls; p.textContent=text; p.style.left=x+'px'; p.style.top=y+'px'; p.style.color=color;
  document.body.appendChild(p); setTimeout(()=>p.remove(),1350);
}

/* ---------- screens ---------- */
function showScreen(id){
  $$('.screen').forEach(s=>{ s.hidden = s.id!==id; });
  const el=$('#'+id); el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
  SCREEN=id; hideDock(); gesture.clear();
  if(id!=='battle'){GENERATION++;clearTimeout(autoPassTimer);FX.clear();clearTimeout(banner._t);$('#banner').hidden=true;PICK=null;HANDOFF=false;BUSY=false;$('#curtain').hidden=true;$$('.pop').forEach(p=>p.remove());}
  if(id!=='battle'){ TIMER.run=false; BG.calm(); BG.battle(false); AUDIO.setIntensity(id==='select'?.25:0); }
}

/* ---------- title ---------- */
function renderTitle(){
  const faces = CHARS.map((c,i)=>`<img src="${PORTRAITS[c.name]}" alt="${c.name}" style="--rot:${(i%2?1:-1)*rnd(2,6)}deg">`).join('');
  $('#title').innerHTML = `
    <div class="logo" aria-label="Ultimate Nakama Ninja Battle">
      <svg class="slash" viewBox="0 0 800 160" aria-hidden="true"><path d="M20 98 C 160 60, 360 70, 520 76 S 740 90, 780 64" stroke="#c4182f" stroke-width="58" stroke-linecap="round" fill="none" opacity=".85"/></svg>
      <span class="l1">ULTIMATE</span><span class="l2">NAKAMA</span><span class="l3">NINJA BATTLE</span>
    </div>
    <div class="tag">${L('tagline')}</div>
    <div class="faces" aria-hidden="true"><div class="track">${faces}${faces}</div></div>
    <div class="menu">
      ${hasSavedBattle()?`<button class="btn primary" id="b-resume">${L('resume')}</button>`:''}
      <button class="btn primary" id="b-cpu"><span class="ico">${uiIcon('cpu',22)}</span>${L('vsCpu')}</button>
      <button class="btn primary" id="b-online"><span class="ico">${uiIcon('duo',22)}</span>${L('online')}</button>
      <button class="btn primary" id="b-local"><span class="ico">${uiIcon('duo',22)}</span>${L('local')} <span style="font-weight:600;color:inherit;font-size:.85em">· ${L('localSub')}</span></button>
      <div class="row">
        <button class="btn" id="b-roster"><span class="ico">${uiIcon('book')}</span>${L('roster')}</button>
        <button class="btn" id="b-how"><span class="ico">${uiIcon('info')}</span>${L('howto')}</button>
      </div>
    </div>
    <div class="title-foot">
      <button class="iconbtn" id="b-set" aria-label="${L('settings')}">${uiIcon('gear')}</button>
      <button class="iconbtn" id="b-snd" aria-label="${L('music')}">${uiIcon(SETTINGS.music?'sound':'mute')}</button>
      <button class="btn ghost" id="b-lang" style="min-height:44px;padding:0 14px">${SETTINGS.lang==='es'?'English':'Español'}</button>
      <a class="btn ghost download-game" href="nakama-offline.html" download="Ultimate-Nakama-Ninja-Battle.html">↓ ${SETTINGS.lang==='es'?'Descargar':'Download'}</a>
    </div>`;
  if($('#b-resume'))$('#b-resume').onclick=()=>{leaveOnline();resumeBattle();};
  $('#b-cpu').onclick=()=>{leaveOnline();openSelect('cpu');};
  $('#b-online').onclick=openOnline;
  $('#b-local').onclick=()=>{leaveOnline();openSelect('local');};
  $('#b-roster').onclick=openRoster;
  $('#b-how').onclick=openHowTo;
  $('#b-set').onclick=()=>openSettings();
  $('#b-snd').onclick=()=>{ SETTINGS.music=!SETTINGS.music; saveSettings(); AUDIO.apply(); renderTitle(); };
  $('#b-lang').onclick=()=>{ SETTINGS.lang=SETTINGS.lang==='es'?'en':'es'; saveSettings(); renderTitle(); };
}
function openRoster(){
  openModal(`<h3>${L('roster')}</h3><div class="gallery">${CHARS.map(c=>`<button data-c="${c.id}"><img src="${PORTRAITS[c.name]}" alt=""><span>${c.name}</span></button>`).join('')}</div>`);
  $$('#modal [data-c]').forEach(b=>b.onclick=()=>openCharInfo(b.dataset.c));
}
function openHowTo(onClose){
  openModal(`<div class="howto"><h3>${L('howto')}</h3>
    <div class="legend">${['F','R','P','E','C'].map(k=>`<div><i style="--mc:${MANA_COL[k]}"></i>${L('manaNames')[k]}</div>`).join('')}</div>
    <ol>${L('how').map(x=>`<li>${x}</li>`).join('')}</ol></div>`, {onClose});
}
function openSettings(onClose){
  const seg=(key,vals)=>`<span class="seg" data-key="${key}">${vals.map(([v,t])=>`<button data-v="${v}" aria-pressed="${String(SETTINGS[key])===String(v)}">${t}</button>`).join('')}</span>`;
  const draw=()=>`<h3>${L('settings')}</h3><div class="opts">
    <div class="opt"><label>${L('lang')}</label>${seg('lang',[['es','ES'],['en','EN']])}</div>
    <div class="opt"><label>${L('music')}</label>${seg('music',[['true',L('on')],['false',L('off')]])}</div>
    <div class="opt"><label>${L('musicStyle')}</label>${seg('musicStyle',[['original',L('original')],['procedural',L('procedural')]])}</div>
    <div class="opt"><label>${L('autoPass')}</label>${seg('autoPass',[['true',L('on')],['false',L('off')]])}</div>
    <div class="opt"><label>${L('layout')}</label>${seg('layout',[['auto',L('auto')],['compact',L('compact')],['wide',L('wide')]])}</div>
    <div class="opt"><label>${L('sound')}</label>${seg('sfx',[['true',L('on')],['false',L('off')]])}</div>
    <div class="opt"><label>${L('shake')}</label>${seg('shake',[['true',L('on')],['false',L('off')]])}</div>
    <div class="opt"><label>${L('timer')}</label>${seg('turnTime',[['30','30s'],['60','60s'],['90','90s'],['0',L('none')]])}</div></div>`;
  const m=openModal(draw(), {onClose:()=>{ onClose&&onClose(); }});
  const wire=()=>$$('#modal .seg button').forEach(b=>b.onclick=()=>{
    const key=b.parentElement.dataset.key; let v=b.dataset.v; if(v==='true'||v==='false') v=v==='true'; else if(key==='turnTime') v=+v;
    SETTINGS[key]=v; saveSettings(); if(key==='autoPass')scheduleAutoPass(); if(key==='turnTime'&&S){TIMER.left=v;TIMER.run=humanTurn()&&!!v;saveBattle();}  AUDIO.apply(); AUDIO.play('click');
    $('#modal .paper').innerHTML=`<button class="closex" data-close aria-label="${L('close')}">${uiIcon('close',18)}</button>`+draw(); wire();
    if(key==='lang'){ if(SCREEN==='title') renderTitle(); if(SCREEN==='select') renderSelect(); if(SCREEN==='battle'){ buildBoard(); update(); } }
  });
  wire();
}
function effectCard({kind='buff',icon,title,duration,detail='',source='',note='',suppressed=false}){
  return `<li class="effect-card ${kind}${suppressed?' effect-suppressed':''}"><div class="effect-icon" aria-hidden="true">${icon}</div><div class="effect-body"><div class="effect-heading"><strong>${esc(title)}</strong><span class="effect-duration" aria-label="${L('effectRemaining')}: ${esc(duration)}">${esc(duration)}</span></div>${detail?`<p class="effect-mechanic">${esc(detail)}</p>`:''}${source}${suppressed?`<div class="effect-warning">${uiIcon('stun',18)}<strong>${L('effectSuppressed')}</strong></div>`:''}${note?`<p class="effect-note">${esc(note)}</p>`:''}</div></li>`;
}
function statusDetail(unit,s){
  const permanent=s.exp===Infinity;
  let duration=permanent?L('perm'):turnsTxt(roundsLeft(s)), detail='';
  switch(s.k){
    case 'dot': duration=permanent?L('perm'):`${s.left} ${L(s.left===1?'effectTick':'effectTicks')}`;detail=`${s.v} ${L('dmg')} ${L('dot')}`;break;
    case 'delayed': duration=s.due-S.T<=1?L('effectNextTurn'):turnsTxt(Math.ceil((s.due-S.T)/2));detail=`−${s.v} HP · ${L('effectOnce')}`;break;
    case 'dred': case 'unp': detail=`−${s.v} ${L('dmg')}`;break;
    case 'dratio': detail=`−${Math.round((1-s.v)*100)}% ${L('dmg')}`;break;
    case 'atk': detail=`+${s.v} ${L('atkN')}`;break;
    case 'res': detail=`+${s.v} ${L('resN')}`;break;
    case 'enable': detail=skillName(unit.cid,s.skill);break;
    case 'boost': detail=`${skillName(unit.cid,s.skill)} · ×${s.mult}${s.add?' +'+s.add:''}`;break;
    case 'nostun': detail=L('effectImmune');break;
  }
  const caster=U(s.srcT,s.srcI),ability=skillOf(s.src,s.from);
  const source=`<div class="effect-source">${ability?.image?`<img src="${ability.image}" alt="">`:''}<div><span>${L('effectSource')}: ${esc(CHAR[s.src].name)} · ${esc(teamName(caster.t))}</span><strong>${esc(ability?.name||s.from)}</strong></div></div>`;
  const suppressed=isPeriodicSuppressed(s,unit),protection=['inv','dred','dratio','unp','nostun'].includes(s.k);
  const note=suppressed?L('effectSuppressedHelp'):s.k==='delayed'?L('effectDelayed'):protection?L('effectProtectionHelp'):'';
  const kind=s.k==='dot'||s.k==='delayed'?'harm':s.k==='mark'?'control':'buff';
  return effectCard({kind,icon:glyphSVG(protection?'shield':s.icon,26),title:L('s_'+s.k),duration,detail,source,note,suppressed});
}
function openCharInfo(cid){
  const c=CHAR[cid];
  const unit = openCharInfo.unit && openCharInfo.unit.cid===cid ? openCharInfo.unit : null; openCharInfo.unit=null;
  let st='';
  if(unit){
    const lines=[];
    if(!unit.alive) lines.push(effectCard({kind:'harm',icon:uiIcon('skull',26),title:L('dead'),duration:'0 HP'}));
    if(unit.stun>0||unit.skip) lines.push(effectCard({kind:'control',icon:uiIcon('stun',26),title:L('s_stun'),duration:turnsTxt(unit.stun+(unit.skip?1:0)),note:L('effectStunHelp')}));
    unit.st.forEach(s=>lines.push(statusDetail(unit,s)));
    if(unit.atkPerm) lines.push(effectCard({icon:uiIcon('sword',26),title:L('s_atkPerm'),duration:L('perm'),detail:`+${unit.atkPerm} ${L('atkN')}`}));
    st=`<section class="character-effects" aria-labelledby="effects-title"><h4 id="effects-title">${L('statuses')} <span>${lines.length}</span></h4>${lines.length?`<ul class="effect-list">${lines.join('')}</ul>`:`<p class="effects-empty">${uiIcon('shield',22)} ${L('noStatus')}</p>`}</section>`;
  }
  const skills = unit ? unit.skills.map(id=>skillOf(cid,id)) : c.skills;
  const alts = c.alts ? (unit ? [...c.skills,...c.alts].filter(s=>!unit.skills.includes(s.id)) : c.alts) : [];
  const abilityList=skills.map(s=>skillBlock(cid,s)).join('')+(alts.length?`<div class="meta" style="margin-top:10px">${L('alts')}</div>${alts.map(s=>skillBlock(cid,s,'alt')).join('')}`:'');
  openModal(`<div class="cinfo"><div class="head"><img src="${PORTRAITS[c.name]}" alt=""><div><h3>${c.name}</h3>${unit?`<div class="meta">${unit.hp} / 100 HP · ${teamName(unit.t)}</div>`:''}</div></div>
    ${st}${unit?`<details class="character-abilities"><summary>${L('effectSkills')} (${skills.length})</summary>${abilityList}</details>`:abilityList}</div>`);
}

/* ---------- select ---------- */
function openSelect(mode){
  SEL = {mode, picks:[[],[]], picker:0, cpuBusy:false};
  showScreen('select'); renderSelect();
}
function renderSelect(){
  const m=SEL.mode;
  const slot=(t,i)=>{ const cid=SEL.picks[t][i]; return `<button class="slot ${cid?'filled':''}" data-t="${t}" data-i="${i}" aria-label="${cid?CHAR[cid].name:'—'}">${cid?`<img src="${PORTRAITS[CHAR[cid].name]}" alt="">`:''}</button>`; };
  const team=(t)=>`<div class="teamslots ${SEL.picker===t && !full()?'picking':''}" style="--tc:${TEAMCOL[t]};--tc-soft:${t?'var(--red-soft)':'var(--blue-soft)'}">
      <div class="lbl"><span>${teamName(t)}</span><span>${SEL.picks[t].length}/3</span></div><div class="slots">${slot(t,0)}${slot(t,1)}${slot(t,2)}</div></div>`;
  const hint = m==='online' ? `${L('room')} ${esc(NET.code)} · ${NET.view?.players[NET.seat]?.ready?L('waitingReady'):L('pickYou')}` : full() ? L('ready') : SEL.cpuBusy ? L('cpuPicking') : m==='cpu' ? L('pickYou') : (SEL.picker===0?L('pickBlue'):L('pickRed'));
  const cur = SEL.picks[SEL.picker];
  $('#select').innerHTML = `
    <div class="topbar"><button class="iconbtn" id="s-back" aria-label="${L('menu')}">${uiIcon('back')}</button><h2>${L('chooseTeam')}</h2>
      <button class="iconbtn" id="s-how" aria-label="${L('howto')}">${uiIcon('info')}</button></div>
    <div class="teams">${team(0)}<div class="vs">VS</div>${team(1)}</div>
    <div class="picker-hint" style="--tc:${TEAMCOL[SEL.picker]}">${hint}</div>
    <div class="roster">${CHARS.map(c=>{ const taken=cur.includes(c.id) && !full();
      const minis=c.skills.slice(0,3).map(s=>`<i style="background:${MANA_COL[mainMana(s.cost)]}"></i>`).join('');
      return `<div class="rcard ${taken?'taken':''}" data-c="${c.id}" data-taken="${taken?teamName(SEL.picker):''}" style="--tc:${TEAMCOL[SEL.picker]}" role="button" tabindex="0" aria-label="${c.name}">
        <img src="${PORTRAITS[c.name]}" alt="" loading="lazy"><div class="nm">${c.name}<div class="mini">${minis}</div></div>
        <button class="info" data-info="${c.id}" aria-label="${L('roster')}: ${c.name}">${uiIcon('info',16)}</button></div>`; }).join('')}

    </div>
    <div class="selbar"><button class="btn" id="s-rand">${uiIcon('dice')} ${L('random')}</button><button class="btn" id="s-clear">${L('clear')}</button>
      <button class="btn primary" id="s-fight" ${full()?'':'disabled'}>${uiIcon('swords',22)} ${m==='online'?L(NET.view?.players[NET.seat]?.ready?'changeTeam':'onlineReady'):L('fight')}</button></div>`;
  $('#s-back').onclick=()=>{ leaveOnline();showScreen('title'); renderTitle(); };
  $('#s-how').onclick=()=>openHowTo();
  $$('#select .rcard[data-c]').forEach(el=>{
    el.onclick=e=>{ if(e.target.closest('[data-info]')){ openCharInfo(el.dataset.c); return; } choose(el.dataset.c); };
    el.onkeydown=e=>{ if(e.target===el&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); choose(el.dataset.c); } };
  });
  $$('#select .slot').forEach(el=>el.onclick=()=>{ const t=+el.dataset.t, i=+el.dataset.i; if(SEL.cpuBusy) return; if(SEL.mode==='cpu'&&t===1) return; if(SEL.mode==='online'&&(t!==NET.seat||NET.view?.players[NET.seat]?.ready||NET.pending))return;
    if(SEL.picks[t][i]){ SEL.picks[t].splice(i,1); if(SEL.mode==='cpu') SEL.picks[1]=[]; SEL.picker=t; AUDIO.play('click'); renderSelect(); } });
  $('#s-rand').onclick=()=>{ if(SEL.cpuBusy||SEL.mode==='online'&&(NET.pending||NET.view?.players[NET.seat]?.ready)) return; const t=SEL.picker; const pool=CHARS.map(c=>c.id).filter(id=>!SEL.picks[t].includes(id)).sort(()=>Math.random()-.5);
    while(SEL.picks[t].length<3) SEL.picks[t].push(pool.pop()); AUDIO.play('pickChar'); afterPick(); };
  $('#s-clear').onclick=()=>{ if(SEL.mode==='online'){if(!NET.pending&&!NET.view?.players[NET.seat]?.ready){SEL.picks[NET.seat]=[];renderSelect();}return;} if(SEL.cpuBusy) return; SEL.picks=[[],[]]; SEL.picker=0; AUDIO.play('click'); renderSelect(); };
  $('#s-fight').onclick=()=>{if(SEL.mode==='online'){onlineSend(NET.view?.players[NET.seat]?.ready?'unready':'ready',{team:SEL.picks[NET.seat]});return;} if(!full()) return; AUDIO.play('taiko'); startBattle(SEL.mode, SEL.picks[0], SEL.picks[1]); };
}
const full = ()=>SEL.mode==='online'?SEL.picks[NET.seat].length===3:SEL.picks[0].length===3 && SEL.picks[1].length===3;
function choose(cid){
  if(SEL.cpuBusy || full() || SEL.mode==='online'&&(NET.pending||NET.view?.players[NET.seat]?.ready)) { AUDIO.play('deny'); return; }
  const t=SEL.picker; if(SEL.picks[t].includes(cid)){ AUDIO.play('deny'); toast(`${CHAR[cid].name} ✓`); return; }
  SEL.picks[t].push(cid); AUDIO.play('pickChar'); afterPick();
}
async function afterPick(){
  const selection=SEL;
  const t=SEL.picker;
  if(SEL.picks[t].length===3){
    if(SEL.mode==='local' && t===0){ SEL.picker=1; }
    else if(SEL.mode==='cpu' && t===0){
      SEL.picker=1; SEL.cpuBusy=true; renderSelect();
      const pool=CHARS.map(c=>c.id).sort(()=>Math.random()-.5);
      for(let i=0;i<3;i++){ await sleep(450); if(SEL!==selection||SCREEN!=='select')return; SEL.picks[1].push(pool[i]); AUDIO.play('pickChar'); renderSelect(); }
      SEL.cpuBusy=false; SEL.picker=0;
    }
  }
  renderSelect();
}

/* ---------- battle board ---------- */
function unitEl(u){ return $(`#battle .unit[data-t="${u.t}"][data-i="${u.i}"]`); }
function centerOf(u){ const el=unitEl(u); if(!el) return {x:innerWidth/2,y:innerHeight/2}; const r=$('.pf',el).getBoundingClientRect(); return {x:r.left+r.width/2, y:r.top+r.height/2, w:r.width}; }
const XMARK = `<svg class="xmark" viewBox="0 0 100 100" aria-hidden="true"><path d="M14 16 L86 84" stroke="#e0233f" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M86 14 L16 86" stroke="#e0233f" stroke-width="13" stroke-linecap="round" fill="none"/></svg>`;
const STARS = `<div class="stars">${[0,1,2].map(()=>`<i>${uiIcon('stun',14)}</i>`).join('')}</div>`;
function pfHTML(u){ const c=CHAR[u.cid]; return `<div class="pf" style="--side:${TEAMCOL[u.t]}"><img src="${PORTRAITS[c.name]}" alt=""><div class="tint"></div><div class="nm">${c.name}</div><div class="chips"></div>${STARS}${XMARK}</div>`; }
function hpHTML(){ return `<div class="hp" role="meter" aria-label="HP" aria-valuemin="0" aria-valuemax="100"><div class="ghost"></div><div class="fill"></div><div class="val"></div></div>`; }
function buildBoard(){
  VIEW = S.mode==='online'?NET.seat:S.mode==='cpu' ? 0 : S.active;
  const top=1-VIEW;
  $('#battle').innerHTML = `
    ${S.mode==='online'?`<div class="online-bar"><b>${L('room')} ${esc(NET.code)}</b><span id="net-status" role="status"></span><button class="btn ghost" id="net-copy">${L('roomLink')}</button></div>`:''}
    <div class="bhead">
      <button class="iconbtn" id="b-pause" aria-label="${L('pause')}">${uiIcon('pause')}</button>
      <div class="turnpill"><span class="who" id="b-who"></span><span class="num" id="b-num"></span></div>
      <div class="battle-tools"><button class="iconbtn" id="b-wide" aria-label="${L('layout')}">↔</button><button class="iconbtn" id="b-full" aria-label="${L('fullscreen')}">⛶</button><button class="iconbtn" id="b-mute" aria-label="${L('music')}">${uiIcon(SETTINGS.music||SETTINGS.sfx?'sound':'mute')}</button></div>
    </div>
    <div class="timer" id="b-timer"><i></i><span id="b-seconds"></span></div>
    <div class="enemies">${S.teams[top].units.map(u=>`<button class="ecard unit" data-t="${u.t}" data-i="${u.i}" aria-label="${CHAR[u.cid].name}">${pfHTML(u)}${hpHTML()}</button>`).join('')}</div>
    <div class="battle-center">
      <div class="log" id="b-log" aria-live="polite"></div><button class="history-link" id="b-history">${L('history')}</button>
      <div class="manabar"><div class="gems" id="b-gems">${MANA.map(k=>`<div class="gem" data-m="${k}" style="--mc:${MANA_COL[k]}" title="${L('manaNames')[k]}"><i></i><span>0</span></div>`).join('')}</div>
        <button class="btn endturn" id="b-end">${L('endTurn')}</button></div>
    </div>
    <div class="allies">${S.teams[VIEW].units.map(u=>`<div class="arow unit" data-t="${u.t}" data-i="${u.i}">
        <button class="pfbtn" style="padding:0;border:0;background:none;width:var(--pfs)" aria-label="${CHAR[u.cid].name}">${pfHTML(u)}</button>
        <div class="ainfo"><div class="aname"><span class="n">${CHAR[u.cid].name}</span>${hpHTML()}<span class="state"></span></div><div class="skills"></div></div></div>`).join('')}</div>
    <div class="target-slot"><div id="dock" class="target-dock" hidden></div></div>`;
  if($('#net-copy'))$('#net-copy').onclick=copyRoomLink;
  $('#b-pause').onclick=openPause;
  $('#b-history').onclick=openHistory;
  $('#b-wide').onclick=()=>{SETTINGS.layout=SETTINGS.layout==='wide'?'compact':'wide';saveSettings();};
  $('#b-full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}};
  $('#b-mute').onclick=()=>{ const on=!(SETTINGS.music||SETTINGS.sfx); SETTINGS.music=on; SETTINGS.sfx=on; saveSettings(); AUDIO.apply(); $('#b-mute').innerHTML=uiIcon(on?'sound':'mute'); };
  $('#b-end').onclick=()=>{ if(BUSY||!humanTurn()) return; AUDIO.play('click'); endTurn(); };
  $$('#battle .unit').forEach(el=>{
    const handler=()=>onUnitTap(U(+el.dataset.t,+el.dataset.i));
    el.onclick=e=>{if(e.target.closest('.sk'))return;handler();};
    el.onkeydown=e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();handler();}};
  });
  buildSkills();
}
function buildSkills(){
  S.teams[VIEW].units.forEach(u=>{
    const box=$('.skills', unitEl(u));
    box.innerHTML = u.skills.map(sid=>{ const sk=skillOf(u.cid,sid); const m=mainMana(sk.cost);
      return `<button class="sk ${m==='E'?'light':''}" data-sid="${sid}" style="--sc:${MANA_COL[m]}" aria-label="${esc(sk.name)}"><img class="skill-art" src="${sk.image}" alt=""><span class="skill-name">${esc(sk.name)}</span><span class="pips">${pipsHTML(sk.cost)}</span></button>`; }).join('');
    $$('.sk',box).forEach(b=>{b.onclick=e=>{e.stopPropagation();gesture.click(`${u.t}:${u.i}:${b.dataset.sid}`,{u,sid:b.dataset.sid},e.detail);};b.ondblclick=e=>{e.preventDefault();e.stopPropagation();if(!$('#modal'))inspectSkill(u,b.dataset.sid);};});
  });
}
const humanTurn = ()=> S && !S.over && (S.mode==='online'?!!NET?.connected&&!NET.pending&&S.active===NET.seat:S.mode==='local' || S.active===0);
function chipHTML(icon,color,n,label){ return `<span class="chip" style="--cc:${color}" title="${esc(label)}">${icon}${n!=null?`<b>${n}</b>`:''}</span>`; }
function chipsFor(u){
  const out=[];
  if(u.alive && (u.stun>0||u.skip)) out.push(chipHTML(uiIcon('stun',15),'#ffd23f',u.stun+(u.skip?1:0),L('s_stun')));
  const col={inv:'#7fe8ff',dred:'#f5c451',dratio:'#f5c451',unp:'#f5c451',atk:'#ffb35c',nostun:'#5ee39a',res:'#5ee39a',enable:'#f5c451',boost:'#ffb35c',mark:'#c9a7ff',satan:'#ff4d61',dot:'#ff6b7c'};
  u.st.forEach(s=>{ const n = s.k==='dot' ? (s.left>99?'∞':s.left) : (s.k==='satan'?null:roundsLeft(s)); out.push(chipHTML(glyphSVG(s.k==='inv'?'shield':s.icon,15), col[s.k]||'#ccc', n===Infinity?null:n, L('s_'+s.k))); });
  if(u.atkPerm) out.push(chipHTML(uiIcon('sword',15),'#ffb35c','+'+u.atkPerm,L('s_atkPerm')));
  return out.slice(0,6).join('');
}
function update(){
  if(!S || SCREEN!=='battle') return;
  onlineStatus();
  const act=S.active, tc=TEAMCOL[act];
  document.documentElement.style.setProperty('--team', tc);
  document.documentElement.style.setProperty('--team-soft', act?'var(--red-soft)':'var(--blue-soft)');
  const who=$('#b-who'); if(who) who.innerHTML = S.mode==='cpu' ? (act===0?L('yourTurn'):`${L('cpuTurn')} <span class="thinking"><i></i><i></i><i></i></span>`) : `${L('turnOf')} ${teamName(act)}`;
  const num=$('#b-num'); if(num) num.textContent=`${L('turnN')} ${Math.floor(S.T/2)+1}`;
  // gems show the acting team's pool
  const m=S.teams[S.mode==='online'?NET.seat:act].mana; $$('#b-gems .gem').forEach(g=>{ $('span',g).textContent=m[g.dataset.m]; });
  $('#b-gems').style.borderColor=tc;
  S.teams.forEach(tm=>tm.units.forEach(u=>{
    const el=unitEl(u); if(!el) return;
    el.classList.toggle('dead',!u.alive); el.classList.toggle('inv',u.alive&&isInv(u)); el.classList.toggle('stunned',u.alive&&(u.skip||u.stun>0&&u.t!==act));
    const hp=$('.hp',el); hp.setAttribute('aria-valuenow',String(u.hp));hp.setAttribute('aria-label',CHAR[u.cid].name+' HP'); const w=u.hp+'%'; hp.style.setProperty('--w',w); hp.classList.toggle('mid',u.hp<=60&&u.hp>30); hp.classList.toggle('low',u.hp<=30); $('.val',hp).textContent=`${u.hp} / 100`;
    $('.chips',el).innerHTML=chipsFor(u);
    if(el.classList.contains('arow')){
      const mine = u.t===act && humanTurn();
      el.classList.toggle('ready', mine && u.alive && !u.acted && !u.skip);
      el.classList.toggle('spent', u.t===act && (u.acted||u.skip) && u.alive);
      $('.state',el).textContent = !u.alive?L('dead') : (u.t===act && u.skip)?L('stunned') : (u.t===act&&u.acted)?L('done') : '';
      $$('.sk',el).forEach(b=>{
        const sid=b.dataset.sid, r=canUse(u,sid); const cd=u.cds[sid];
        b.classList.toggle('off', !r.ok); b.classList.toggle('sel', !!PICK && PICK.u===u && PICK.sid===sid);
        let ov=''; if(!isEnabled(u,sid)) ov=`<span class="lk">${uiIcon('lock',20)}</span>`; else if(cd>0 && u.alive) ov=`<span class="cd">${cd}</span>`;
        const cur=$('.cd,.lk',b); if(cur) cur.remove(); if(ov) b.insertAdjacentHTML('beforeend',ov);
      });
    }
  }));
  const end=$('#b-end'); if(end){ end.disabled = !humanTurn()||BUSY; end.classList.toggle('ready', humanTurn() && !anyAction(act)); end.style.visibility = humanTurn()?'visible':'hidden'; }
  // target highlighting
  $$('#battle .unit').forEach(el=>{el.classList.remove('target','notarget');if(el.classList.contains('arow'))el.tabIndex=-1;});
  if(PICK && PICK.ok){ const sk=skillOf(PICK.u.cid,PICK.sid); const vt=validTargets(PICK.u,sk);
    $$('#battle .unit').forEach(el=>{ const u=U(+el.dataset.t,+el.dataset.i); el.classList.add(vt.includes(u)?'target':'notarget'); if(el.classList.contains('arow')){el.tabIndex=vt.includes(u)?0:-1;el.setAttribute('aria-label',CHAR[u.cid].name+' · '+L('pickTarget'));} }); }
}
function setLog(html){ const l=$('#b-log'); if(l) l.innerHTML=`<span>${html}</span>`; }
function logLine(entry){
  const sk=skillOf(entry.cid,entry.sid);
  const tgt = entry.target==='allEnemies'?L('allE'):entry.target==='allAllies'?L('allA'):entry.target==='self'?'':CHAR[entry.target]?.name;
  return `<b style="color:${TEAMHEX[entry.t]}">${CHAR[entry.cid].name}</b> ${L('used')} <b>${esc(sk.name)}</b>${tgt?` → <b>${esc(tgt)}</b>`:''}`;
}

/* ---------- direct targeting and optional flexible chakra allocation ---------- */
const gesture=new AbilityGesture({select:({u,sid})=>onSkillTap(u,sid),inspect:({u,sid})=>inspectSkill(u,sid)});
function showDock(u,sid,r){
  const sk=skillOf(u.cid,sid),d=$('#dock');
  const prompt=r.r==='r_cd'?`${L('cdNow')}: ${u.cds[sk.id]} ${L('ownTurns')}`:r.ok?L('pickTarget'):L(r.r);
  d.innerHTML=`<div class="target-scroll"><img class="target-art" src="${sk.image}" alt=""><div class="target-copy" role="status"><strong>${esc(prompt)}</strong><span>${esc(sk.name)} · ${costHTML(sk.cost)}</span><small>${L('inspectHint')}</small></div><button class="iconbtn" id="d-x" aria-label="${L('cancel')}">${uiIcon('close',18)}</button>${r.ok&&sk.cost.C?`<details class="payment"><summary>${L('spending')} · ${sk.cost.C}</summary><div id="pay-controls"></div></details>`:''}</div>`;
  d.hidden=false;$('#d-x').onclick=clearPick;
  if(r.ok&&sk.cost.C)renderPayment();
}
function renderPayment(){
  if(!PICK)return;const {u,sid,extra}=PICK,sk=skillOf(u.cid,sid),pool=S.teams[u.t].mana,need=sk.cost.C;
  $('#pay-controls').innerHTML=`<div class="payment-row">${MANA.map((k,i)=>`<div class="payment-color" style="--mc:${MANA_COL[k]}"><span class="payment-gem" title="${L('manaNames')[k]}"></span><button data-pay="${i}" data-delta="-1" aria-label="− ${L('manaNames')[k]}" ${extra[i]?'':'disabled'}>−</button><b>${extra[i]}</b><button data-pay="${i}" data-delta="1" aria-label="+ ${L('manaNames')[k]}" ${extra.reduce((a,b)=>a+b,0)>=need||extra[i]>=pool[k]-sk.cost[k]?'disabled':''}>+</button></div>`).join('')}</div><div class="payment-footer"><span>${need-extra.reduce((a,b)=>a+b,0)} ${L('remaining')}</span><button id="pay-auto">${L('automatic')}</button></div>`;
  $$('#pay-controls [data-pay]').forEach(b=>b.onclick=()=>adjustPayment(+b.dataset.pay,+b.dataset.delta));
  $('#pay-auto').onclick=()=>{PICK.extra=allocateFlexible(pool,sk.cost);renderPayment();};
}
function adjustPayment(i,delta){
  if(!PICK)return;const sk=skillOf(PICK.u.cid,PICK.sid),next=PICK.extra.slice();next[i]+=delta;
  const total=next.reduce((a,b)=>a+b,0),pool=S.teams[PICK.u.t].mana;
  if(next[i]<0||next[i]>pool[MANA[i]]-sk.cost[MANA[i]]||total>sk.cost.C)return;
  PICK.extra=next;renderPayment();
}
function hideDock(){const d=$('#dock');if(d){d.hidden=true;d.innerHTML='';}}
function clearPick(){PICK=null;hideDock();gesture.clear();update();}
function inspectSkill(u,sid){
  if(BUSY||HANDOFF)return;clearPick();
  const sk=skillOf(u.cid,sid);
  openModal(`<div class="ability-detail">${skillBlock(u.cid,sk)}</div>`);
}
function onSkillTap(u,sid){
  if(BUSY||PAUSED||HANDOFF||$('#modal'))return;
  const r=humanTurn()?canUse(u,sid):{ok:false,r:'r_wait'};
  PICK={u,sid,ok:r.ok,extra:r.ok?allocateFlexible(S.teams[u.t].mana,skillOf(u.cid,sid).cost):null};
  AUDIO.play(r.ok?'select':'deny');showDock(u,sid,r);update();
}
function onUnitTap(u){
  if(BUSY||PAUSED||HANDOFF||$('#modal'))return;
  if(PICK?.ok){const sk=skillOf(PICK.u.cid,PICK.sid);if(validTargets(PICK.u,sk).includes(u)){commit(PICK.u,PICK.sid,u,PICK.extra);return;}AUDIO.play('deny');return;}
  openCharInfo.unit=u;openCharInfo(u.cid);
}
async function commit(u,sid,target,extra=null){
  if(BUSY||PAUSED||HANDOFF||!humanTurn())return false;
  if(!payment(u.t,skillOf(u.cid,sid).cost,extra)){toast(L('r_payment'));return false;}
  if(S.mode==='online'){PICK=null;hideDock();gesture.clear();return onlineSend('attack',{actor:u.i,sid,targetTeam:target.t,target:target.i,extra});}
  const match=S;PICK=null;hideDock();gesture.clear();
  const ok=await perform(u,sid,target,extra);
  if(ok&&S===match&&SCREEN==='battle')afterAction();return ok;
}
function scheduleAutoPass(){
  clearTimeout(autoPassTimer);
  if(!SETTINGS.autoPass||!S||S.over||!humanTurn()||anyAction(S.active))return;
  const match=S,turn=S.T;
  autoPassTimer=setTimeout(()=>{
    if(S!==match||S.T!==turn||SCREEN!=='battle'||S.over)return;
    if(BUSY||PAUSED||HANDOFF||document.hidden||$('#modal')||PICK){scheduleAutoPass();return;}
    if(SETTINGS.autoPass&&!anyAction(S.active))endTurn();
  },1200);
}
function afterAction(){saveBattle();if(S.over){finish();return;}scheduleAutoPass();}

/* ---------- animation of a skill ---------- */
const FXCOL = {slash:['#ffffff','#ffe9a8'], crush:['#ffcf6b','#ff9a3c'], fire:['#ffb347','#ff5a1f','#ffd56b'], aoe:['#ff7a59','#ffd56b'], stun:['#ffd23f','#fff3a8'],
  heal:['#5ee39a','#b8ffd4'], shield:['#7fe8ff','#c8f6ff'], buff:['#f5c451','#fff1b0'], dark:['#c06bff','#ff4d8d','#7b3cff'], madness:['#e58bff','#7fe8ff','#ffd23f']};
async function perform(u,sid,target,extra=null,remote=null){
  const match=S, generation=GENERATION;
  BUSY=true;update();
  const res=remote||useSkill(u,sid,target,extra);
  if(!res.ok){BUSY=false;update();toast(L(res.r));return false;}
  if(!remote)recordHistory(res.events,true);saveBattle();
  const sk=skillOf(u.cid,sid);
  const casterEl=unitEl(u); if(casterEl){ casterEl.style.setProperty('--ly', u.t===VIEW?'-10px':'10px'); casterEl.classList.remove('acting'); void casterEl.offsetWidth; casterEl.classList.add('acting'); }

  // mana spend feedback
  Object.entries(res.paid).forEach(([k,v])=>{ if(v){ const g=$(`#b-gems .gem[data-m="${k}"]`); if(g){ g.classList.remove('spend'); void g.offsetWidth; g.classList.add('spend'); } } });
  $$('#b-gems .gem').forEach(g=>{ $('span',g).textContent=S.teams[u.t].mana[g.dataset.m]; });
  setLog(logLine(S.log[S.log.length-1]));
  const col=FXCOL[sk.fx]||FXCOL.slash; const from=centerOf(u);
  const affected=[...new Set(res.events.filter(e=>e.u).map(e=>e.u))];
  const victims = affected.filter(x=>x!==u || sk.target==='self' || sk.target==='allAllies' || sk.target==='ally');
  const playSfx={slash:'slash',crush:'hit',fire:'fire',aoe:'slash',stun:'stun',heal:'heal',shield:'shield',buff:'buff',dark:'dark',madness:'madness'}[sk.fx];
  AUDIO.play(sk.fx==='crush'?'slash':playSfx);
  const travel = ['slash','crush','fire','aoe','dark','stun'].includes(sk.fx);
  if(travel){
    const goals = victims.filter(x=>x.t!==u.t); const list=goals.length?goals:victims;
    await Promise.all(list.map((v,i)=>{ const to=centerOf(v); return sleep(i*70).then(()=>{if(S!==match||GENERATION!==generation)return;return FX.beam(from.x,from.y,to.x,to.y,col[0], sk.fx==='crush'?.5:.32, sk.fx==='fire'?16:10, sk.fx==='crush'?140:50);}); }));
  } else await sleep(260);
  if(!await presentationReady(match,generation))return false;
  // impact visuals
  victims.forEach(v=>{ const c=centerOf(v); const r=(c.w||80)*.75;
    if(sk.fx==='slash'||sk.fx==='aoe'){ FX.slash(c.x,c.y,col[0],r*.9); FX.slash(c.x,c.y,col[1],r*.8,rnd(-.3,.1)); FX.burst(c.x,c.y,col,18,240); }
    else if(sk.fx==='crush'){ FX.ring(c.x,c.y,col[0],r*1.6,.6,12); FX.burst(c.x,c.y,col,34,360); }
    else if(sk.fx==='fire'){ FX.burst(c.x,c.y,col,40,300,{up:120,g:-60,r:7}); FX.ring(c.x,c.y,col[1],r*1.3); }
    else if(sk.fx==='stun'){ FX.burst(c.x,c.y,col,22,220,{star:true,g:200}); FX.ring(c.x,c.y,col[0],r*1.2,.5,5); }
    else if(sk.fx==='heal'){ FX.rise(c.x,c.y,col,26,r*.6); }
    else if(sk.fx==='shield'){ FX.ring(c.x,c.y,col[0],r*1.1,.7,10); FX.ring(c.x,c.y,col[1],r*.8,.9,5); FX.rise(c.x,c.y,col,12,r*.5); }
    else if(sk.fx==='buff'){ FX.rise(c.x,c.y,col,24,r*.6); FX.ring(c.x,c.y,col[0],r*1.2,.6,6); }
    else if(sk.fx==='dark'){ FX.burst(c.x,c.y,col,30,200,{g:-80}); FX.ring(c.x,c.y,col[2],r*1.4,.8,10); }
    else if(sk.fx==='madness'){ FX.burst(c.x,c.y,col,40,320,{star:true}); FX.ring(c.x,c.y,col[0],r*1.6,.9,8); }
  });
  if(S!==match||GENERATION!==generation)return false;
  await playEvents(res.events,match,generation);
  await sleep(REDUCED?0:240);
  if(S!==match||GENERATION!==generation)return false;
  BUSY=false; update();saveBattle();return true;
}
async function playEvents(events,match=S,generation=GENERATION){
  let bigHit=false;
  for(const e of events){
    if(!await presentationReady(match,generation))return;
    const el=e.u?unitEl(e.u):null; const c=e.u?centerOf(e.u):null;
    switch(e.k){
      case 'dmg':
        if(e.half){ popAt(c.x,c.y,'½ HP','#ff9a9a'); break; }
        popAt(c.x,c.y - 6, e.v>0?'-'+e.v:'0', e.pierce?'#ffb3f0':'#fff1e0', e.big?'big':'');
        if(el){ el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
        AUDIO.play('hit', e.big); if(e.big) bigHit=true; break;
      case 'block': popAt(c.x,c.y,L('blocked'),'#7fe8ff','sm'); AUDIO.play('shield'); FX.ring(c.x,c.y,'#7fe8ff',(c.w||80)*.8,.5,8); break;
      case 'heal': popAt(c.x,c.y,'+'+e.v,'#5ee39a'); break;
      case 'stun': popAt(c.x,c.y+28,L('stunTxt'),'#ffd23f','sm'); break;
      case 'text': popAt(c.x,c.y+(e.sm?30:-20),e.txt,e.c,e.sm?'sm':''); break;
      case 'death': AUDIO.play('death'); FX.burst(c.x,c.y,['#e0233f','#ff6b7c','#2a0a12'],46,380); BG.flash(.8); bigHit=true; break;
      case 'satan': popAt(innerWidth/2,innerHeight/2,L('satan'),'#ff4d61','big'); AUDIO.play('dark'); BG.flash(1.4); bigHit=true; await sleep(450); break;
      case 'unlock': { const b=unitEl(e.u)?.querySelector(`.sk[data-sid="${e.skill}"]`); if(b){ b.classList.remove('fresh'); void b.offsetWidth; b.classList.add('fresh'); } break; }
      case 'swap': if(e.u.t===VIEW) buildSkills(); break;

    }
    if(S!==match||GENERATION!==generation)return;
    update();
    await sleep(REDUCED?0:e.k==='status'?40:140);
  }
  if(bigHit&&S===match&&GENERATION===generation) shake(true);
}
function shake(big){ if(!SETTINGS.shake||REDUCED) return; const b=$('#battle'); b.classList.remove('shake','shake-big'); void b.offsetWidth; b.classList.add(big?'shake-big':'shake'); BG.flash(.35); }

/* ---------- persistence, turn flow and history ---------- */
const SAVE_KEY='unnb-battle-v2';
function hasSavedBattle(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(saved?.version!==2||!['local','cpu'].includes(saved.battle?.mode))return false;
    if(saved.battle.over===true){localStorage.removeItem(SAVE_KEY);return false;}
    return saved.battle.over===false;
  }catch{return false;}
}
function saveBattle(){
  if(!S||S.mode==='online')return;
  try{if(S.over)localStorage.removeItem(SAVE_KEY);else localStorage.setItem(SAVE_KEY,serializeBattle({remaining:TIMER.left}));}catch{if(!saveBattle.warned){saveBattle.warned=true;toast(L('saveError'));}}
}
function recordHistory(events,action=false){
  if(!S)return;const last=S.log.at(-1);
  if(action&&last)S.history.push({turn:Math.floor(S.T/2)+1,text:logLine(last).replace(/<[^>]*>/g,'')});
  for(const e of events){if(!e.u)continue;let text='';const n=CHAR[e.u.cid].name;
    if(e.k==='dmg')text=`${n}: ${e.half?'½ HP':'−'+e.v+' HP'}`;
    if(e.k==='heal')text=`${n}: +${e.v} HP`;
    if(e.k==='block')text=`${n}: ${L('blocked')}`;
    if(e.k==='stun')text=`${n}: ${L('stunned')} · ${turnsTxt(e.n)}`;
    if(e.k==='death')text=`${n}: ${L('ko')}`;
    if(e.k==='satan')text=`${n}: ${L('satan')}`;
    if(text)S.history.push({turn:Math.floor(S.T/2)+1,text});
  }
  S.history=S.history.slice(-100);
}
function openHistory(){openModal(`<h3>${L('history')}</h3><div class="battle-history">${S.history.length?S.history.map(e=>`<p><b>${e.turn}</b> ${esc(e.text)}</p>`).join(''):`<p>${L('noHistory')}</p>`}</div>`);}
async function presentationReady(match,generation=GENERATION){
  while(S===match&&GENERATION===generation&&SCREEN==='battle'&&(PAUSED||document.hidden||$('#modal')))await sleep(120);
  return S===match&&GENERATION===generation&&SCREEN==='battle';
}
function startBattle(mode,a,b){
  GENERATION++;clearTimeout(autoPassTimer);FX.clear();finishing=false;
  newBattle(mode,a,b);PAUSED=false;BUSY=false;PICK=null;HANDOFF=false;TIMER.left=SETTINGS.turnTime;
  showScreen('battle');BG.battle(true);AUDIO.setIntensity(.8);buildBoard();update();saveBattle();startTurn();
}
async function startTurn(){
  const match=S,generation=GENERATION;
  BG.team(S.active);TIMER.run=false;BUSY=true;
  if(S.mode==='local'){if(!await curtain(S.active,match))return;}
  if(S!==match||GENERATION!==generation)return;
  const r=beginTurn();TIMER.left=SETTINGS.turnTime||0;TIMER.warned=false;buildBoard();update();
  const name=S.mode==='cpu'?(S.active===0?L('yourTurn'):L('cpuTurn')):teamName(S.active);
  AUDIO.play('taiko');banner(name,`${L('turnN')} ${Math.floor(S.T/2)+1}`,TEAMHEX[S.active]);
  setLog(S.log.length?logLine(S.log.at(-1)):'');
  Object.entries(r.gained).forEach(([k,v])=>{if(v){const g=$(`#b-gems .gem[data-m="${k}"]`);g?.classList.add('bump');}});AUDIO.play('mana');
  if(r.events.length){recordHistory(r.events);saveBattle();await playEvents(r.events,match,generation);}
  if(S!==match||GENERATION!==generation)return;
  BUSY=false;update();TIMER.run=humanTurn()&&!!SETTINGS.turnTime;TIMER.last=performance.now();drawTimer();saveBattle();
  if(S.over){finish();return;}if(!humanTurn()){cpuTurn();return;}scheduleAutoPass();
}
function curtain(t,match){
  HANDOFF=true;
  return new Promise(resolve=>{
    const c=$('#curtain');c.style.setProperty('--cc',TEAMHEX[t]);c.style.setProperty('--cc-soft',t?'rgba(255,77,97,.35)':'rgba(75,141,255,.35)');
    c.innerHTML=`<div class="faces3">${S.teams[t].units.map(u=>`<img class="${u.alive?'':'dead'}" src="${PORTRAITS[CHAR[u.cid].name]}" alt="">`).join('')}</div><h2>${teamName(t)}</h2><p><b>${L('pass')}.</b> ${L('passSub')}</p><button class="btn primary" id="c-go">${L('imReady')}</button>`;
    c.hidden=false;$('#c-go').focus();$('#c-go').onclick=()=>{AUDIO.play('click');c.hidden=true;c.innerHTML='';HANDOFF=false;resolve(S===match&&SCREEN==='battle');};
  });
}
async function endTurn(){
  if(S?.mode==='online'){if(!BUSY&&!PAUSED&&!$('#modal')&&humanTurn()){clearPick();return onlineSend('end');}return;}
  if(!S||S.over||BUSY||PAUSED||HANDOFF||$('#modal'))return;
  TIMER.run=false;PICK=null;hideDock();gesture.clear();clearTimeout(autoPassTimer);
  endTurnState();saveBattle();await startTurn();
}
async function cpuTurn(){
  const match=S,myT=S.T,generation=GENERATION;
  await sleep(900);
  for(let guard=0;guard<3;guard++){
    if(!await presentationReady(match,generation)||S.T!==myT||S.over)return;
    const a=cpuPick(S.active);if(!a)break;
    await perform(a.u,a.sid,a.target);
    if(S!==match||GENERATION!==generation)return;
    if(S.over){finish();return;}await sleep(REDUCED?0:500);
  }
  if(await presentationReady(match,generation)&&S.T===myT&&!S.over)endTurn();
}
function drawTimer(){
  if(S?.mode==='online'){const el=$('#b-timer');if(!el)return;const remaining=NET.deadline?Math.max(0,(NET.deadline-Date.now()-(NET.clockOffset||0))/1000):0; $('i',el).style.transform=`scaleX(${NET.turnTime?remaining/NET.turnTime:1})`;$('#b-seconds').textContent=NET.turnTime?Math.ceil(remaining)+'s':'∞';el.classList.toggle('low',!!NET.turnTime&&remaining<10);return;}
  const el=$('#b-timer');if(!el)return;
  const active=humanTurn()&&!!SETTINGS.turnTime;
  $('i',el).style.transform=`scaleX(${active?Math.max(0,TIMER.left/SETTINGS.turnTime):1})`;
  el.classList.toggle('low',active&&TIMER.left<10);el.style.opacity=active?1:.5;
  $('#b-seconds').textContent=SETTINGS.turnTime?Math.max(0,Math.ceil(TIMER.left))+'s':'∞';
}
function timerLoop(now){
  if(S?.mode==='online')drawTimer();
  if(S?.mode!=='online'&&TIMER.run&&!PAUSED&&!BUSY&&!HANDOFF&&!PICK&&!document.hidden&&SCREEN==='battle'&&!$('#modal')){
    TIMER.left-=Math.min(1,(now-TIMER.last)/1000);
    if(TIMER.left<10&&!TIMER.warned){TIMER.warned=true;AUDIO.play('tick');}
    if(TIMER.left<=0){TIMER.run=false;toast(L('timeUp'));endTurn();}drawTimer();
  }
  TIMER.last=now;requestAnimationFrame(timerLoop);
}
requestAnimationFrame(timerLoop);
function resumeBattle(){
  if(!hasSavedBattle()){renderTitle();return;}
  try{
    const ui=restoreBattle(localStorage.getItem(SAVE_KEY));GENERATION++;finishing=false;PAUSED=false;BUSY=false;HANDOFF=false;PICK=null;
    showScreen('battle');BG.battle(true);BG.team(S.active);AUDIO.setIntensity(.8);buildBoard();update();
    TIMER.left=SETTINGS.turnTime?Math.max(0,Math.min(SETTINGS.turnTime,Number.isFinite(ui.remaining)?ui.remaining:SETTINGS.turnTime)):0;TIMER.last=performance.now();TIMER.run=false;
    if(S.over){finish();return;}if(!S.turnStarted){startTurn();return;}
    TIMER.run=humanTurn()&&!!SETTINGS.turnTime;drawTimer();if(!humanTurn())cpuTurn();else scheduleAutoPass();
  }catch{toast(L('loadError'));}
}
function openPause(){
  if(HANDOFF)return;PAUSED=true;clearPick();saveBattle();
  openModal(`<h3>${L('pause')}</h3><div class="opts" style="margin-top:14px"><button class="btn primary" id="p-res">${L('resume')}</button><button class="btn" id="p-how">${L('howto')}</button><button class="btn" id="p-set">${L('settings')}</button><button class="btn" id="p-sur">${L('surrender')}</button><button class="btn" id="p-quit">${L('quit')}</button></div>`,{onClose:()=>{PAUSED=false;update();}});
  $('#p-res').onclick=closeModal;
  $('#p-how').onclick=()=>openHowTo(()=>{PAUSED=false;update();});
  $('#p-set').onclick=()=>openSettings(()=>{PAUSED=false;update();});
  const sur=$('#p-sur');sur.onclick=()=>{if(!sur.dataset.c){sur.dataset.c=1;sur.textContent=L('surrender')+' ?';sur.classList.add('danger');return;}
    if(S.mode==='online'){closeModal();PAUSED=false;onlineSend('surrender');return;}
    closeModal();GENERATION++;FX.clear();BUSY=false;S.over=true;S.winner=S.mode==='cpu'?1:1-S.active;saveBattle();finish();};
  $('#p-quit').onclick=()=>{closeModal();leaveOnline();saveBattle();clearBattle();PAUSED=false;showScreen('title');renderTitle();};
}
function finish(){
  if(finishing)return;finishing=true;TIMER.run=false;hideDock();PICK=null;saveBattle();
  const match=S,generation=GENERATION;
  setTimeout(()=>{
    if(S!==match||GENERATION!==generation||SCREEN!=='battle')return;
    const w=S.winner,draw=w==='draw',humanWon=!draw&&(S.mode==='online'?w===NET.seat:S.mode==='local'||w===0),color=draw?'#f5c451':TEAMHEX[w];
    AUDIO.play(draw?'taiko':humanWon?'win':'lose');if(!draw)BG.team(w);
    FX.burst(innerWidth/2,innerHeight*.35,['#f5c451','#fff1b0',color],90,520,{star:true,g:260});
    const units=draw?S.teams.flatMap(t=>t.units):S.teams[w].units;
    const mvp=units.slice().sort((a,b)=>(b.dealt+b.healed+b.support)-(a.dealt+a.healed+a.support))[0];
    const title=draw?L('draw'):S.mode==='cpu'?(w===0?L('victory'):L('defeat')):`${teamName(w)} ${L('wins')}`;
    openModal(`<div class="result" style="--tcol:${color}"><div class="meta">${draw?L('drawSub'):teamName(w)}</div><div class="big">${esc(title)}</div><div class="faces3">${units.map(u=>`<img class="${u.alive?'':'dead'}" src="${PORTRAITS[CHAR[u.cid].name]}" alt="${CHAR[u.cid].name}">`).join('')}</div><div class="stats"><div><b>${Math.floor(S.T/2)+1}</b><span>${L('turnsPlayed')}</span></div><div><b>${units.reduce((a,u)=>a+u.dealt,0)}</b><span>${L('dmgDone')}</span></div><div><b style="font-size:1.15rem">${CHAR[mvp.cid].name}</b><span>${L('mvp')}</span></div></div><div class="result-detail">${L('dmg')}: ${mvp.dealt} · ${L('heal')}: ${mvp.healed} · ${L('s_support')}: ${mvp.support}</div><div class="actions"><button class="btn primary" id="r-again">${L('rematch')}</button></div><div class="actions"><button class="btn" id="r-new">${L('newTeams')}</button><button class="btn" id="r-menu">${L('menu')}</button></div></div>`,{noClose:true});
    const picks=S.picks,mode=S.mode;
    $('#r-again').onclick=()=>{if(mode==='online'){closeModal();onlineSend('rematch');return;}closeModal();startBattle(mode,picks[0],picks[1]);};
    $('#r-new').onclick=()=>{if(mode==='online'){closeModal();onlineSend('rematch');return;}closeModal();clearBattle();openSelect(mode);};
    $('#r-menu').onclick=()=>{closeModal();leaveOnline();clearBattle();showScreen('title');renderTitle();};
  },REDUCED?0:650);
}

/* ---------- online room lobby and server snapshots ---------- */
function randomRoom(){return Array.from(crypto.getRandomValues(new Uint8Array(6)),v=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[v%32]).join('');}
function openOnline(){
  if(typeof location==='undefined'||!/^https?:$/.test(location.protocol)){toast(L('onlineOnly'));return;}
  let previous='';try{previous=localStorage.getItem('unnb-online-room')||'';}catch{}
  const code=new URLSearchParams(location.hash.slice(1)).get('room')||previous||randomRoom();
  openModal(`<h3>${L('online')}</h3><p>${L('roomHelp')}</p><form id="online-form"><label for="room-code">${L('roomCode')}</label><input id="room-code" maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(code)}" required><div class="actions"><button class="btn" type="button" id="room-random">${L('newRoom')}</button><button class="btn primary" type="submit">${L('joinRoom')}</button></div><p id="room-error" role="alert"></p></form><p class="online-note">${L('onlineTimer')}: ${SETTINGS.turnTime?SETTINGS.turnTime+'s':L('noTimer')} · ${L('onlineHelp')}</p>`);
  $('#room-random').onclick=()=>{$('#room-code').value=randomRoom();};
  $('#online-form').onsubmit=e=>{e.preventDefault();const value=$('#room-code').value.trim().toUpperCase().replace(/[\s-]/g,'');if(!/^[A-Z0-9]{4,24}$/.test(value)){$('#room-error').textContent=L('roomCodeError');return;}closeModal();joinOnline(value);};
}
function leaveOnline(){if(NET){NET.client.stop();NET=null;GENERATION++;FX.clear();}TIMER.run=false;}
function joinOnline(code){
  leaveOnline();clearBattle();SEL=null;PAUSED=false;closeModal();showScreen('select');
  $('#select').innerHTML=`<div class="online-lobby"><h2>${L('room')} ${esc(code)}</h2><p id="online-connection" role="status">${L('connecting')}</p><button class="btn" id="online-cancel">${L('menu')}</button></div>`;
  $('#online-cancel').onclick=()=>{leaveOnline();showScreen('title');renderTitle();};
  let token;try{token=localStorage.getItem('unnb-online-token-'+code);}catch{}
  if(!token){token=Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');try{localStorage.setItem('unnb-online-token-'+code,token);}catch{}}
  try{localStorage.setItem('unnb-online-room',code);}catch{}
  const net=NET={code,seat:null,pending:false,connected:false,view:null,turnTime:SETTINGS.turnTime,deadline:null};
  net.client=new OnlineClient({code,token,turnTime:SETTINGS.turnTime,url:`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/room/${code}`,
    onConnection:connected=>{if(NET!==net)return;net.connected=connected;if(!connected){net.pending=false;BUSY=false;PICK=null;hideDock();if(S?.mode==='online'){GENERATION++;FX.clear();}}onlineStatus();if(S?.mode==='online')update();},
    onError:code=>{if(NET!==net)return;net.pending=false;BUSY=false;const text=code==='roomFull'?L('roomFull'):code==='Room expired'?L('roomExpired'):code==='Connected elsewhere'?L('connectedElsewhere'):code==='stale'?L('stale'):L('onlineError');toast(text);if(!net.view){$('#online-connection').textContent=text;}if(S?.mode==='online')update();},
    onState:msg=>applyOnlineState(net,msg)});
  net.client.connect();
}
function onlineStatus(){
  if(!NET)return;const text=!NET.connected?L('reconnecting'):!NET.view?.players[1-NET.seat]?L('opponentWaiting'):!NET.view.online[1-NET.seat]?L('opponentOffline'):S?.mode==='online'&&S.active!==NET.seat?L('onlineWait'):L('yourTurn');
  const el=$('#net-status')||$('#online-connection');if(el)el.textContent=text;
}
function copyRoomLink(){const link=location.origin+location.pathname+'#room='+NET.code;if(!navigator.clipboard){toast(link);return;}navigator.clipboard.writeText(link).then(()=>toast(L('copied'))).catch(()=>toast(link));}
function onlineSend(type,data={}){
  if(!NET||NET.pending||!NET.connected)return false;
  NET.pending=true;NET.sentRevision=NET.client.revision;const ok=NET.client.send(type,data);if(!ok)NET.pending=false;
  if(S?.mode==='online'){BUSY=ok;update();}return ok;
}
async function applyOnlineState(net,msg){
  if(NET!==net)return;
  const previous=net.view;net.view=msg;net.seat=msg.seat;net.deadline=msg.deadline;net.turnTime=msg.turnTime;net.clockOffset=msg.serverNow?msg.serverNow-Date.now():0;
  if(net.pending&&msg.revision>net.sentRevision)net.pending=false;
  if(!msg.battle){
    if(S?.mode==='online'){GENERATION++;FX.clear();clearBattle();finishing=false;closeModal();PAUSED=false;}
    if(!SEL||SEL.mode!=='online'||SCREEN!=='select'){SEL={mode:'online',picks:[[],[]],picker:net.seat,cpuBusy:false};showScreen('select');}
    SEL.picker=net.seat;for(let t=0;t<2;t++)if(t!==net.seat||msg.players[t]?.ready)SEL.picks[t]=msg.players[t]?.team.slice()||[];
    renderSelect();$('#s-fight').disabled=!net.connected||net.pending||(!msg.players[net.seat]?.ready&&!full());
    $('#select').insertAdjacentHTML('afterbegin',`<div class="online-bar"><b>${L('room')} ${esc(net.code)} · ${L('onlineSeat')}: ${teamName(net.seat)}</b><span id="online-connection" role="status"></span><button class="btn ghost" id="net-copy">${L('roomLink')}</button></div>`);$('#net-copy').onclick=copyRoomLink;onlineStatus();return;
  }
  if(previous?.battle===msg.battle&&S?.mode==='online'){onlineStatus();update();return;}
  const fresh=!S||S.mode!=='online'||SCREEN!=='battle',wasTurn=S?.T;
  GENERATION++;clearTimeout(autoPassTimer);PICK=null;hideDock();gesture.clear();FX.clear();restoreBattle(msg.battle);TIMER.run=false;
  if(fresh){finishing=false;PAUSED=false;closeModal();showScreen('battle');BG.battle(true);AUDIO.setIntensity(.8);}
  BG.team(S.active);if(fresh)buildBoard();else buildSkills();BUSY=false;update();drawTimer();
  const tr=msg.transition;
  if(!fresh&&tr?.kind==='attack'){
    const events=tr.events.map(e=>({...e,u:e.u?U(e.u.t,e.u.i):undefined}));
    await perform(U(tr.team,tr.actor),tr.sid,U(tr.targetTeam,tr.target),null,{ok:true,events,paid:tr.paid});
  }else if(tr?.events?.length){BUSY=true;await playEvents(tr.events.map(e=>({...e,u:e.u?U(e.u.t,e.u.i):undefined})));BUSY=false;}
  if(NET!==net)return;
  if(fresh||wasTurn!==S.T){AUDIO.play('taiko');banner(S.active===net.seat?L('yourTurn'):L('onlineWait'),`${L('turnN')} ${Math.floor(S.T/2)+1}`,TEAMHEX[S.active]);}
  BUSY=false;update();if(S.over){finish();return;}scheduleAutoPass();
}

/* ---------- boot ---------- */
addEventListener('pointerdown',()=>AUDIO.init(),{passive:true});
addEventListener('keydown',e=>{
  AUDIO.init();
  if(e.key==='Escape'&&!$('#modal')){if(PICK)clearPick();else if(SCREEN==='battle'&&S&&!S.over)openPause();}
});
addEventListener('resize',()=>{if(PICK)update();});
document.addEventListener('visibilitychange',()=>{TIMER.last=performance.now();AUDIO.visibility();if(document.hidden)saveBattle();else scheduleAutoPass();});
addEventListener('pagehide',saveBattle);
setInterval(()=>{if(S&&SCREEN==='battle'&&!document.hidden)saveBattle();},5000);
showScreen('title');renderTitle();

if(typeof location!=='undefined'&&new URLSearchParams(location.hash.slice(1)).has('room'))openOnline();
