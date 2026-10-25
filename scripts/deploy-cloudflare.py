#!/usr/bin/env python3
"""Upload dist to the account's own Cloudflare Worker. Credentials enter via hidden stdin only."""
import base64,getpass,hashlib,json,mimetypes,sys,urllib.request,urllib.error,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
NAME='ultimate-nakama-battle'
credentials=json.loads(getpass.getpass('Cloudflare credentials JSON (hidden): '))
account=credentials['account'];token=credentials['token'];base='https://api.cloudflare.com/client/v4/accounts/'+account

def call(path,method='GET',payload=None,auth=None,content_type='application/json'):
 data=json.dumps(payload).encode() if isinstance(payload,dict) else payload
 req=urllib.request.Request(base+path,data=data,method=method,headers={'Authorization':'Bearer '+(auth or token),'Content-Type':content_type})
 try:
  with urllib.request.urlopen(req,timeout=60) as response:result=json.load(response)
 except urllib.error.HTTPError as exc:
  # Cloudflare errors contain error codes/messages, never request Authorization.
  err=exc.read().decode();raise RuntimeError(f'Cloudflare HTTP {exc.code}: {err[:1200]}') from None
 if not result.get('success',True):raise RuntimeError(json.dumps(result.get('errors',[])))
 return result.get('result',result)

def multipart(parts):
 boundary='Nakama'+uuid.uuid4().hex;chunks=[]
 for name,filename,mime,data in parts:
  chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\nContent-Type: {mime}\r\n\r\n'.encode()+data+b'\r\n')
 chunks.append(f'--{boundary}--\r\n'.encode());return b''.join(chunks),'multipart/form-data; boundary='+boundary

settings=call('/workers/scripts/'+NAME+'/settings')
if '--check' in sys.argv:
 print(json.dumps({'access':True,'migration_tag':settings.get('migration_tag'),'bindings':[{'name':x.get('name'),'type':x.get('type')} for x in settings.get('bindings',[])]}));sys.exit(0)
files={};manifest={} 
for p in sorted((ROOT/'dist').rglob('*')):
 if not p.is_file():continue
 content=p.read_bytes();encoded=base64.b64encode(content);h=hashlib.sha256(encoded+p.suffix[1:].encode()).hexdigest()[:32]
 manifest['/'+p.relative_to(ROOT/'dist').as_posix()]={'hash':h,'size':len(content)};files[h]=(p,encoded)
print('Preparing',len(manifest),'assets;',round(sum(x['size'] for x in manifest.values())/1024/1024,2),'MiB',flush=True)
session=call('/workers/scripts/'+NAME+'/assets-upload-session','POST',{'manifest':manifest})
upload_token=session['jwt'];complete=upload_token if not session['buckets'] else None
for i,bucket in enumerate(session['buckets']):
 parts=[]
 for h in bucket:
  p,data=files[h];mime='text/javascript' if p.suffix=='.js' else mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
  parts.append((h,p.name,mime,data))
 body,ctype=multipart(parts);result=call('/workers/assets/upload?base64=true','POST',body,upload_token,ctype)
 if result and result.get('jwt'):complete=result['jwt']
 print('Uploaded asset batch',i+1,'of',len(session['buckets']),flush=True)
if not complete:raise RuntimeError('No completion token returned')
metadata={'main_module':'server/worker.js','compatibility_date':'2026-10-01','bindings':[{'type':'assets','name':'ASSETS'},{'type':'durable_object_namespace','name':'ROOMS','class_name':'NakamaRoom'}],'assets':{'jwt':complete,'config':{'html_handling':'auto-trailing-slash','not_found_handling':'none','run_worker_first':['/api/*']}}}
if not any(x.get('name')=='ROOMS' for x in settings.get('bindings',[])):
 metadata['migrations']={'new_tag':'nakama-online-v1','new_sqlite_classes':['NakamaRoom']}
 if settings.get('migration_tag'):metadata['migrations']['old_tag']=settings['migration_tag']
parts=[('metadata','metadata.json','application/json',json.dumps(metadata).encode())]
# The same tested engine runs on clients and on the authoritative room server.
for name in ['server/worker.js','server/room-core.js','dist/engine.js','dist/catalog.js','dist/controls.js','dist/game-data.js','dist/visual-data.js']:
 parts.append((name,name,'application/javascript+module',(ROOT/name).read_bytes()))
body,ctype=multipart(parts)
result=call('/workers/scripts/'+NAME,'PUT',body,content_type=ctype)
print('Worker deployed:',result.get('id',NAME),flush=True)
sub=call('/workers/subdomain')['subdomain']
call('/workers/scripts/'+NAME+'/subdomain','POST',{'enabled':True,'previews_enabled':False})
public={'worker':NAME,'url':'https://'+NAME+'.'+sub+'.workers.dev','account_id':account,'asset_count':len(manifest),'deployment_id':result.get('deployment_id'),'etag':result.get('etag')}
(ROOT/'cloudflare-deployment.json').write_text(json.dumps(public,indent=2)+'\n')
print(json.dumps(public),flush=True)
