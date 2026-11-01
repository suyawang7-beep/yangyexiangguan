"""Approved additive mail-rewards release; code/config rollback only, never replace live user DB."""
import pathlib,subprocess,sys,json,hashlib,sqlite3,shutil,os,time,urllib.request
rev=sys.argv[1];assert len(rev)==40 and all(c in '0123456789abcdef' for c in rev)
service='buzhi-production.service';current=pathlib.Path('/opt/buzhi-production/current');old=current.resolve();backup=pathlib.Path('/var/backups/buzhi-production')/('admin-fusion-'+rev[:7]+'-r2');receipt=json.loads((backup/'receipt.json').read_text());assert receipt['revision']==rev and str(old)==receipt['previousRelease']
assert (backup/'offhost-verified.json').exists(),'Off-host restore verification receipt required'
assert subprocess.check_output(['systemctl','show',service,'-p','ActiveState','--value'],text=True).strip()=='inactive'
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();hashes=json.loads((backup/'hashes.json').read_text())
for n,h in hashes.items():assert hash(backup/n)==h
assert hash(pathlib.Path(receipt['archive']))==receipt['sha256']
proof=json.loads((backup/'offhost-verified.json').read_text());assert proof['sha256']==receipt['sha256'] and proof['integrity']=='ok'
def fingerprint(path):
 c=sqlite3.connect('file:'+str(path)+'?mode=ro',uri=True);assert c.execute('PRAGMA integrity_check').fetchone()==('ok',);result={}
 for name,sql in c.execute("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall():
  q='"'+name.replace('"','""')+'"';rows=c.execute('SELECT * FROM '+q+' ORDER BY rowid').fetchall();result[name]=hashlib.sha256(repr((sql,rows)).encode()).hexdigest()
 c.close();return result
live=pathlib.Path('/var/lib/buzhi-production/island.sqlite');baseline=fingerprint(live);assert baseline==fingerprint(backup/'island.sqlite'),'stale DB backup'
config=pathlib.Path('/etc/buzhi-production.env');original=config.read_bytes();assert original==(backup/'production.env').read_bytes()
stage=pathlib.Path('/opt/buzhi-admin-fusion-test/releases')/rev;release=pathlib.Path('/opt/buzhi-production/releases')/('unified-'+rev);assert not release.exists();shutil.copytree(stage,release)
manifest=json.loads((pathlib.Path('/home/ubuntu/buzhi-mail-'+rev)/'manifest.json').read_text())
for f in manifest['files']:assert hash(stage/f['path'])==f['sha256']
expected={str(p.relative_to(stage)):hash(p) for p in stage.rglob('*') if p.is_file()};assert expected=={str(p.relative_to(release)):hash(p) for p in release.rglob('*') if p.is_file()}
(release/'ADMIN-FUSION-RELEASE.json').write_text(json.dumps({'revision':rev,'base':receipt['previousRelease'],'runtimeHashes':expected},indent=2))
subprocess.run(['node','--check',str(release/'server/index.mjs')],check=True)
switched=False
try:
 temp=current.with_name('current.admin-fusion-pending');assert not temp.exists() and not temp.is_symlink();temp.symlink_to(release,target_is_directory=True);os.replace(temp,current);switched=True
 text='\n'.join(line for line in original.decode().splitlines() if not line.startswith('RAILWAY_GIT_COMMIT_SHA='))+'\nRAILWAY_GIT_COMMIT_SHA='+rev+'\n'
 tmp=config.with_name('buzhi-production.env.admin-fusion-pending');assert not tmp.exists();tmp.write_text(text);tmp.chmod(0o600);os.replace(tmp,config)
 subprocess.run(['systemctl','start',service],check=True)
 for i in range(40):
  try:
   with urllib.request.urlopen('http://127.0.0.1:14179/health',timeout=3) as r:assert r.status==200 and r.headers['x-buzhi-revision']==rev
   break
  except Exception:time.sleep(.25)
 else:raise RuntimeError('production health failed')
 upgraded=fingerprint(live)
 assert all(upgraded.get(name)==value for name,value in baseline.items()),'Existing DB rows changed on startup; do not restore over live data'
 assert set(upgraded)-set(baseline)=={'fusion_quota_grants','island_mail_fusion_rewards','island_mail_reward_notes'},'Unexpected schema additions'
 c=sqlite3.connect('file:'+str(live)+'?mode=ro',uri=True)
 for name in set(upgraded)-set(baseline):assert c.execute('SELECT count(*) FROM '+name).fetchone()[0]==0
 assert not c.execute('PRAGMA foreign_key_check').fetchall()
 guards={r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='trigger'")};assert {'guard_fusion_mail_claim','guard_fusion_mail_item_backfill'}<=guards;c.close()
 for path in ['/admin','/admin/v2/','/admin/v2/adapter.js','/admin/v2/integration.css','/','/draw.html','/collection.html']:
  with urllib.request.urlopen('http://127.0.0.1:14179'+path,timeout=5) as r:assert r.status==200
 result={'deployed':True,'revision':rev,'runtimeFilesVerified':len(expected),'existingRowsUnchanged':True,'additiveTables':3,'rollbackGuards':2,'oldRelease':str(old),'newRelease':str(release),'topicModuleEnabled':False};(backup/'deployment-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
except BaseException:
 subprocess.run(['systemctl','stop',service],check=True)
 if switched:
  temp=current.with_name('current.admin-fusion-rollback');temp.symlink_to(old,target_is_directory=True);os.replace(temp,current)
 config.write_bytes(original);config.chmod(0o600);subprocess.run(['systemctl','start',service],check=True)
 print('Release failed; old code/config restarted. Live user database was never replaced.',file=sys.stderr);raise
