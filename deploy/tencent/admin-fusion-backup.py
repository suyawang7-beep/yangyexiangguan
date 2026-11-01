"""Approved release backup. Stops only after candidate preflight; restarts old service on failure."""
import pathlib,subprocess,sys,json,hashlib,tarfile,sqlite3,shutil,os,pwd
rev=sys.argv[1];assert len(rev)==40 and all(c in '0123456789abcdef' for c in rev)
service='buzhi-production.service';current=pathlib.Path('/opt/buzhi-production/current');old=current.resolve();assert old.name=='unified-db52c57492cf5a24d64039593de8aa8aa170a574'
hash=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
stage=pathlib.Path('/opt/buzhi-admin-fusion-test/releases')/rev;upload=pathlib.Path('/home/ubuntu/buzhi-admin-'+rev);m=json.loads((upload/'manifest.json').read_text());assert m['revision']==rev
for f in m['files']:assert hash(stage/f['path'])==f['sha256']
assert subprocess.check_output(['systemctl','is-active','buzhi-admin-fusion-test.service'],text=True).strip()=='active'
env=pathlib.Path('/etc/buzhi-production.env');original=env.read_bytes();values={}
for line in original.decode().splitlines():
 if '=' in line and not line.startswith('#'):
  k,v=line.split('=',1);values[k]=v.strip().strip('"\'')
assert values['DB_PATH']=='/var/lib/buzhi-production/island.sqlite' and values['ASSET_DIR']=='/var/lib/buzhi-production/assets'
assert values.get('ENABLE_TOPIC_ASSETS','0')!='1','Unfinished topic module must remain disabled'
folder=pathlib.Path('/var/backups/buzhi-production')/('admin-fusion-'+rev[:7]);assert not folder.exists();folder.mkdir(mode=0o700)
subprocess.run(['systemctl','stop',service],check=True)
try:
 assert subprocess.check_output(['systemctl','show',service,'-p','ActiveState','--value'],text=True).strip()=='inactive'
 source=sqlite3.connect('file:/var/lib/buzhi-production/island.sqlite?mode=ro',uri=True);target=sqlite3.connect(folder/'island.sqlite');source.backup(target);assert target.execute('PRAGMA integrity_check').fetchall()==[('ok',)];assert not target.execute('PRAGMA foreign_key_check').fetchall();target.close();source.close()
 subprocess.run(['tar','-czf',str(folder/'assets.tar.gz'),'-C','/var/lib/buzhi-production/assets','.'],check=True)
 subprocess.run(['tar','-czf',str(folder/'code.tar.gz'),'-C',str(old),'.'],check=True)
 (folder/'production.env').write_bytes(original);(folder/'production.env').chmod(0o600)
 (folder/'previous-release.txt').write_text(str(old)+'\n')
 (folder/'service.txt').write_text(subprocess.check_output(['systemctl','cat',service],text=True))
 hashes={p.name:hash(p) for p in folder.iterdir() if p.name!='production.env'};(folder/'hashes.json').write_text(json.dumps(hashes,indent=2))
 for n in ['assets.tar.gz','code.tar.gz']:
  with tarfile.open(folder/n) as t:assert len(t.getmembers())>0
 archive=pathlib.Path('/home/ubuntu/buzhi-admin-backup-'+rev[:7]+'.tar.gz');assert not archive.exists()
 with tarfile.open(archive,'w:gz') as t:
  for name in [*hashes,'hashes.json']:t.add(folder/name,arcname=name)
 owner=pwd.getpwnam('ubuntu');os.chown(archive,owner.pw_uid,owner.pw_gid);archive.chmod(0o600)
 receipt={'revision':rev,'backup':str(folder),'archive':str(archive),'sha256':hash(archive),'previousRelease':str(old),'serviceStoppedForConsistentBackup':True};(folder/'receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
except BaseException:
 subprocess.run(['systemctl','start',service],check=True);raise
