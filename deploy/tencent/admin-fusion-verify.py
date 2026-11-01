import pathlib,subprocess,sys,json,urllib.request,urllib.error
rev=sys.argv[1];assert len(rev)==40 and all(c in '0123456789abcdef' for c in rev)
assert pathlib.Path('/opt/buzhi-production/current').resolve().name=='unified-'+rev
pid=subprocess.check_output(['systemctl','show','buzhi-production.service','-p','MainPID','--value'],text=True).strip();env=dict(p.split('=',1) for p in pathlib.Path('/proc/'+pid+'/environ').read_text().split('\0') if '=' in p);assert env.get('ENABLE_TOPIC_ASSETS','0')!='1';token=env['ADMIN_TOKEN']
def get(path,auth=False):
 req=urllib.request.Request('http://127.0.0.1:14179'+path,headers={'Authorization':'Bearer '+token} if auth else {})
 with urllib.request.urlopen(req,timeout=8) as r:return r.status,r.headers,r.read()
for path in ['/api/admin/v2/config','/api/admin/v2/read-model','/api/admin/v2/fusion']:
 try:get(path);raise AssertionError('Unauthenticated success')
 except urllib.error.HTTPError as e:assert e.code==403
 assert get(path,True)[0]==200
old=json.loads(get('/api/admin/cards',True)[2]);new=json.loads(get('/api/admin/v2/config',True)[2]);assert old==new['cards']
for path in ['/','/admin','/admin/v2/','/draw.html','/collection.html','/api/site-maintenance']:
 with urllib.request.urlopen('https://buzhi.click'+path,timeout=15) as r:assert r.status==200
assert json.loads(get('/api/site-maintenance')[2])['enabled']==False
assert '菜菜生日特别企划'.encode() not in get('/app.js')[2]
print(json.dumps({'productionReadOnlyVerification':'PASS','revision':rev,'publicStatus':200,'maintenance':False,'oldAndNewCardsEqual':True,'unauthorized':403,'productionBusinessWrites':0}))
