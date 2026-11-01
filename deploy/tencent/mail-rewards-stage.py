"""Dedicated synthetic fusion stage. Existing stage/production services are untouched."""
import pathlib,subprocess,sys,json,hashlib,tarfile,shutil,pwd,os,secrets,time,urllib.request,urllib.error
revision=sys.argv[1];assert len(revision)==40 and all(c in '0123456789abcdef' for c in revision)
base=pathlib.Path('/opt/buzhi-production/current').resolve();assert base.name=='unified-11c9eee2178072d0960a376f0f809635cdb71a17'
upload=pathlib.Path('/home/ubuntu/buzhi-mail-'+revision);m=json.loads((upload/'manifest.json').read_text());assert m['revision']==revision and not m['dirty']
hash=lambda b:hashlib.sha256(b).hexdigest();assert hash((upload/m['archive']).read_bytes())==m['archiveSha256']
baseline=json.loads((upload/'baseline.json').read_text());assert baseline['base']=='11c9eee2178072d0960a376f0f809635cdb71a17'
for f in baseline['files']:
 p=base/f['path'];b=p.read_bytes()
 if f['text']:b=b.replace(b'\r\n',b'\n')
 assert hash(b)==f['sha256'],'Live baseline drift: '+f['path']
release=pathlib.Path('/opt/buzhi-admin-fusion-test/releases')/revision;assert not release.exists();release.mkdir(parents=True)
with tarfile.open(upload/m['archive']) as tar:
 entries=tar.getmembers();expected={f['path']:f for f in m['files']};assert len(entries)==len(expected)
 for entry in entries:
  assert entry.isfile() and entry.name in expected and '..' not in pathlib.PurePosixPath(entry.name).parts
  f=expected[entry.name];b=tar.extractfile(entry).read();assert len(b)==f['size'] and hash(b)==f['sha256'];p=release/entry.name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);p.chmod(0o644)
subprocess.run(['node','--check',str(release/'server/index.mjs')],check=True)
user='buzhi-admin-fusion-test'
try:owner=pwd.getpwnam(user)
except KeyError:
 subprocess.run(['useradd','--system','--home-dir','/nonexistent','--shell','/usr/sbin/nologin',user],check=True);owner=pwd.getpwnam(user)
data=pathlib.Path('/var/lib/buzhi-admin-fusion-test')/revision;assert not data.exists();data.mkdir(parents=True,mode=0o700);data.parent.chmod(0o711);os.chown(data,owner.pw_uid,owner.pw_gid);(data/'assets').mkdir(mode=0o700);os.chown(data/'assets',owner.pw_uid,owner.pw_gid)
assert data.resolve()!=pathlib.Path('/var/lib/buzhi-production').resolve()
token=secrets.token_urlsafe(48);env=pathlib.Path('/etc/buzhi-admin-fusion-test.env');env.write_text('NODE_ENV=test\nHOST=127.0.0.1\nPORT=14177\nDB_PATH='+str(data/'island.sqlite')+'\nASSET_DIR='+str(data/'assets')+'\nADMIN_TOKEN='+token+'\nENABLE_TOPIC_ASSETS=0\nRAILWAY_GIT_COMMIT_SHA='+revision+'\n');env.chmod(0o600)
unit='''[Unit]
Description=Buzhi admin fusion synthetic isolated acceptance
After=network.target
[Service]
User=buzhi-admin-fusion-test
Group=buzhi-admin-fusion-test
WorkingDirectory='''+str(release)+'''
EnvironmentFile=/etc/buzhi-admin-fusion-test.env
ExecStart=/usr/bin/node server/index.mjs
Restart=on-failure
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths='''+str(data)+'''
InaccessiblePaths=/var/lib/buzhi-production /etc/buzhi-production.env
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
'''
pathlib.Path('/etc/systemd/system/buzhi-admin-fusion-test.service').write_text(unit);subprocess.run(['systemctl','daemon-reload'],check=True);subprocess.run(['systemctl','restart','buzhi-admin-fusion-test.service'],check=True)
def req(path,body=None,auth=True):
 headers={'Authorization':'Bearer '+token} if auth else {}
 if body is not None:headers['Content-Type']='application/json'
 r=urllib.request.Request('http://127.0.0.1:14177'+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 with urllib.request.urlopen(r,timeout=10) as response:return json.load(response)
for i in range(30):
 try:req('/health',auth=False);break
 except Exception:time.sleep(.3)
else:raise RuntimeError('isolated stage health failed')
x=req('/api/admin/v2/config');c=x['cards'][0];body={'action':'card','expectedRevision':x['revision'],'confirmed':True,'payload':{'cardId':c['id'],'name':'Synthetic stage card','story':'Isolated only','rarity':c['rarity'],'ocId':c['ocId'],'ocId2':c['ocId2']}}
y=req('/api/admin/v2/config',body);assert y['cards'][0]['name']=='Synthetic stage card'
try:req('/api/admin/v2/config',body);raise AssertionError('Stale accepted')
except urllib.error.HTTPError as e:assert e.code==409
try:req('/api/admin/v2/config',auth=False);raise AssertionError('Unauthenticated accepted')
except urllib.error.HTTPError as e:assert e.code==403
assert req('/api/admin/overview')['users']==0
for name in ['LOCK-50','LOCK-33']:
 import base64
 b=(release/'assets/cards'/f'{name}.webp').read_bytes();req('/api/admin/assets/upload',{'name':'cards/UR-1.webp','base64':base64.b64encode(b).decode()})
 with urllib.request.urlopen('http://127.0.0.1:14177/assets/cards/UR-1.webp',timeout=5) as r:assert r.read()==b and 'no-store' in r.headers['Cache-Control']
assert req('/api/admin/audit')
for path in ['/admin','/admin/v2/','/admin/v2/adapter.js','/admin/v2/integration.css','/collection.html']:
 with urllib.request.urlopen('http://127.0.0.1:14177'+path,timeout=5) as r:assert r.status==200
import uuid
user=req('/api/register',{'nickname':'Mail test','password':'isolated-mail-release-20261101'},False)
def userreq(path,body=None):
 headers={'Authorization':'Bearer '+user['token']}
 if body is not None:headers['Content-Type']='application/json'
 r=urllib.request.Request('http://127.0.0.1:14177'+path,data=json.dumps(body).encode() if body is not None else None,headers=headers)
 with urllib.request.urlopen(r,timeout=10) as response:return json.load(response)
a=userreq('/api/membership/apply',{'douyinId':'synthetic_'+user['id'],'note':'Isolated release acceptance'})
req('/api/admin/memberships/review',{'userId':user['id'],'action':'approve','confirmed':True,'verificationCode':a['verificationCode'],'note':'Synthetic only'})
before=userreq('/api/me')
mails=[]
for kind,amount in [('coins',131.4),('fusion',2)]:
 body={'userId':user['id'],'kind':kind,'amount':amount,'title':'Synthetic release reward','message':'Isolated test only','reason':'Release acceptance','requestId':str(uuid.uuid4())}
 sent=req('/api/admin/island-mail/send',body);assert req('/api/admin/island-mail/send',body)['id']==sent['id'];mails.append(sent['id'])
waiting=userreq('/api/me');assert waiting['coins']==before['coins'] and waiting['fusionDaily']['limit']==3
for mid in mails:
 assert userreq('/api/island-mail/claim',{'id':mid})['claimed']==True
 assert userreq('/api/island-mail/claim',{'id':mid})['alreadyClaimed']==True
after=userreq('/api/me');assert round((after['coins']-before['coins'])*10)==1314 and after['fusionDaily']['limit']==5
for path,body in [('/api/admin/coins/grant',{}),('/api/admin/fusion/grants',{}),('/api/admin/codes',{'kind':'coins'})]:
 try:req(path,body);raise AssertionError('Retired route accepted')
 except urllib.error.HTTPError as e:assert e.code==410
print(json.dumps({'stage':'PASS','revision':revision,'port':14177,'syntheticOnly':True,'checks':['auth','stale-conflict','card-save','upload-public-bytes','no-store','mail-no-immediate-credit','coin-131.4-claim','fusion-claim-3-to-5','duplicate-send-and-claim','direct-grants-410']}))
