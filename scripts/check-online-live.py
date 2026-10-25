#!/usr/bin/env python3
"""Two real WebSocket peers, isolated random QA room. No account secrets needed."""
import asyncio,json,secrets,subprocess,urllib.request
from pathlib import Path
import websockets
BASE='https://ultimate-nakama-battle.bauldejuegos.workers.dev'
ROOT=Path(__file__).resolve().parent.parent
async def receive(ws,predicate=lambda x:x.get('type')=='state'):
 for _ in range(20):
  msg=json.loads(await asyncio.wait_for(ws.recv(),20))
  if predicate(msg):return msg
 raise AssertionError('Expected server message missing')
async def peers_state(peers,revision):
 states=await asyncio.gather(*(receive(ws,lambda x:x.get('type')=='state' and x['revision']==revision) for ws in peers))
 assert states[0]['battle']==states[1]['battle'],'Peers diverged'
 return states[0]
async def send(ws,state,kind,**kw):await ws.send(json.dumps(dict(type=kind,revision=state['revision'],**kw)))
def move(snapshot):
 js="""import {restoreBattle,S,cpuPick,configureEngine} from './dist/engine.js';let s='';for await(const chunk of process.stdin)s+=chunk;restoreBattle(s);configureEngine({rng:()=>.37});const m=cpuPick(S.active);console.log(JSON.stringify(m?{actor:m.u.i,sid:m.sid,targetTeam:m.target.t,target:m.target.i}:null));"""
 return json.loads(subprocess.check_output(['node','--input-type=module','-e',js],input=snapshot.encode(),cwd=ROOT))
async def main():
 health=json.load(urllib.request.urlopen(urllib.request.Request(BASE+'/api/health',headers={'User-Agent':'Mozilla/5.0'}),timeout=30));assert health['online'];print('Live online endpoint:',health['version'],flush=True)
 code='QA'+secrets.token_hex(5).upper();uri=BASE.replace('https:','wss:')+'/api/room/'+code;tokens=[secrets.token_hex(24) for _ in range(2)];peers=[]
 try:
  for i in range(2):
   ws=await websockets.connect(uri,origin=BASE,user_agent_header='Mozilla/5.0');peers.append(ws);await ws.send(json.dumps(dict(type='hello',token=tokens[i],turnTime=0)));state=await receive(ws);assert state['seat']==i
  state=await receive(peers[0],lambda m:m.get('type')=='state' and len(m['players'])==2)
  async with websockets.connect(uri,origin=BASE,user_agent_header='Mozilla/5.0') as third:
   await third.send(json.dumps(dict(type='hello',token=secrets.token_hex(24),turnTime=0)));error=await receive(third,lambda m:m.get('type')=='error');assert error['code']=='roomFull'
  for seat in [0,1]:
   await send(peers[seat],state,'ready',team=['albert','olmo','irmina']);state=await peers_state(peers,state['revision']+1)
  assert state['battle'];print('Two live peers joined, selected mirror teams, and received identical battle snapshots; third player rejected.',flush=True)
  battle=json.loads(state['battle'])['battle'];bad=1-battle['active'];await send(peers[bad],state,'end');error=await receive(peers[bad],lambda m:m.get('type')=='error');assert error['code']=='turn'
  # Drain unchanged error recovery snapshots.
  await peers_state(peers,state['revision'])
  attacks=0
  for _ in range(12):
   battle=json.loads(state['battle'])['battle'];seat=battle['active'];action=move(state['battle']);before=state
   await send(peers[seat],state,'attack' if action else 'end',**(action or {}));state=await peers_state(peers,state['revision']+1)
   if action:
    attacks+=1;await send(peers[seat],before,'attack',**action);error=await receive(peers[seat],lambda m:m.get('type')=='error');assert error['code']=='stale';same=await peers_state(peers,state['revision']);assert same['battle']==state['battle']
   if attacks>=3:break
  assert attacks>=1
  snapshot=state['battle'];revision=state['revision'];await peers[0].close();peers[0]=await websockets.connect(uri,origin=BASE,user_agent_header='Mozilla/5.0');await peers[0].send(json.dumps(dict(type='hello',token=tokens[0],turnTime=0)));resumed=await receive(peers[0]);assert resumed['seat']==0 and resumed['battle']==snapshot and resumed['revision']==revision
  print(f'{attacks} live attacks synchronized; out-of-turn and duplicate moves rejected; reconnect preserved the exact match.',flush=True)
  state=resumed;await send(peers[0],state,'surrender');state=await peers_state(peers,state['revision']+1);assert json.loads(state['battle'])['battle']['winner']==1
  await send(peers[1],state,'rematch');state=await peers_state(peers,state['revision']+1);assert state['battle'] is None
  print('Surrender and two-player rematch lobby verified. LIVE CHECK PASSED.',flush=True)
 finally:
  await asyncio.gather(*(ws.close() for ws in peers),return_exceptions=True)
if __name__=='__main__':asyncio.run(main())
