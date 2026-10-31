"""Approved stopped-service deployment. No account/reward test writes; fail closed."""
import hashlib, json, os, pathlib, pwd, re, shutil, sqlite3, subprocess, sys, tarfile, time, urllib.request, urllib.error

revision, archive_hash, manifest_hash, snapshot = sys.argv[1:5]
assert re.fullmatch('[a-f0-9]{40}', revision)
assert all(re.fullmatch('[a-f0-9]{64}', h) for h in [archive_hash, manifest_hash])
assert re.fullmatch(r'\d{8}T\d{6}Z-\d+', snapshot)
service='buzhi-production.service'
current=pathlib.Path('/opt/buzhi-production/current')
release=pathlib.Path('/opt/buzhi-production/releases')/('unified-'+revision)
upload=pathlib.Path('/home/ubuntu')/('buzhi-unified-'+revision)
backup=pathlib.Path('/var/backups/buzhi-production')/snapshot
database=pathlib.Path('/var/lib/buzhi-production/island.sqlite')
assets=pathlib.Path('/var/lib/buzhi-production/assets')
config=pathlib.Path('/etc/buzhi-production.env')
def run(*args): return subprocess.check_output(args,text=True).strip()
def digest(path):
    h=hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()
def readonly(path): return sqlite3.connect(path.resolve().as_uri()+'?mode=ro',uri=True)
def quote(name): return '"'+name.replace('"','""')+'"'
assert run('systemctl','show',service,'--property=ActiveState','--value') in ['inactive','failed'], 'Keep production stopped until preflight passes'
assert run('systemctl','show',service,'--property=User','--value')=='buzhi-production'
assert run('systemctl','show',service,'--property=WorkingDirectory','--value')==str(current)
config_bytes=config.read_bytes()
values={}
for line in config_bytes.decode().splitlines():
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        key,value=line.split('=',1); values[key.strip()]=value.strip().strip('"\'')
assert values.get('DB_PATH')==str(database) and values.get('ASSET_DIR')==str(assets)
assert values.get('HOST')=='127.0.0.1' and values.get('PORT')=='14179'
assert len(values.get('ADMIN_TOKEN',''))>=32
assert digest(upload/'manifest.json')==manifest_hash
manifest=json.loads((upload/'manifest.json').read_text())
assert manifest['revision']==revision and manifest['dirty'] is False
archive=upload/manifest['archive']
assert manifest['archive']=='buzhi-inbox.tar.gz' and digest(archive)==archive_hash==manifest['archiveSha256']
for line in (backup/'SHA256SUMS').read_text().splitlines():
    expected,name=line.split(); assert pathlib.PurePosixPath(name).name==name
    assert digest(backup/name)==expected, 'Backup checksum failed'
original=readonly(backup/'island.sqlite'); live=readonly(database)
tables=[r[0] for r in original.execute("SELECT name FROM sqlite_master WHERE type='table'")]
queries=[]
for table in tables:
    columns=[r[1] for r in original.execute('PRAGMA table_info('+quote(table)+')')]
    sql='SELECT '+','.join(map(quote,columns))+' FROM '+quote(table)+' ORDER BY rowid'
    if original.execute(sql).fetchall()!=live.execute(sql).fetchall(): raise RuntimeError('Backup is stale: '+table)
    queries.append((table,sql))
assert live.execute('PRAGMA integrity_check').fetchall()==[('ok',)]
assert not live.execute('PRAGMA foreign_key_check').fetchall()
baseline={'users':live.execute('SELECT count(*) FROM users').fetchone()[0],'ledgerRows':live.execute('SELECT count(*) FROM ledger').fetchone()[0],'coinsTotal':live.execute('SELECT sum(amount) FROM ledger').fetchone()[0],'draws':live.execute('SELECT count(*) FROM draws').fetchone()[0],'checkins':live.execute('SELECT count(*) FROM checkins').fetchone()[0]}
live.close()
# Verify the stopped-service material snapshot against every current persistent file.
with tarfile.open(backup/'assets.tar.gz','r:gz') as old_assets:
    files={str(pathlib.PurePosixPath(m.name)):m for m in old_assets if m.isfile()}
    actual={str(p.relative_to(assets)):p for p in assets.rglob('*') if p.is_file()}
    assert set(files)==set(actual), 'Asset snapshot is stale'
    for name,entry in files.items(): assert hashlib.sha256(old_assets.extractfile(entry).read()).hexdigest()==digest(actual[name])
expected={f['path']:f for f in manifest['files']}
assert len(expected)==len(manifest['files'])
assert not release.exists(), 'Never overwrite a release directory'
release.mkdir(mode=0o755,parents=True)
try:
    with tarfile.open(archive,'r:gz') as tar:
        entries=tar.getmembers(); assert len(entries)==len(expected) and {m.name for m in entries}==set(expected)
        for entry in entries:
            path=pathlib.PurePosixPath(entry.name)
            assert entry.isfile() and not path.is_absolute() and '..' not in path.parts
            assert path.parts[0] in ['index.html','admin','ui-preview','assets','server','client']
            assert not any(p in ['.git','node_modules','data'] or p.startswith('.env') for p in path.parts)
            out=release.joinpath(*path.parts);out.parent.mkdir(mode=0o755,parents=True,exist_ok=True)
            with tar.extractfile(entry) as incoming,out.open('xb') as outgoing: shutil.copyfileobj(incoming,outgoing)
            out.chmod(0o644)
            assert out.stat().st_size==expected[entry.name]['size'] and digest(out)==expected[entry.name]['sha256']
    run('/usr/bin/node','--check',str(release/'server/index.mjs'))
except Exception:
    print('Release preparation failed; stopped production and previous current are unchanged.',file=sys.stderr)
    raise
rollback=current.resolve()
if not current.is_symlink():
    rollback=release.parent/('pre-unified-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime()))
assert rollback.is_relative_to(pathlib.Path('/opt/buzhi-production'))
state={'revision':revision,'previousRelease':str(rollback),'snapshot':str(backup),'baseline':baseline,'archiveSha256':archive_hash,'manifestSha256':manifest_hash}
state_path=backup/('deployment-state-'+revision+'.json')
with state_path.open('x') as out: json.dump(state,out,indent=2)
state_path.chmod(0o600)
config_backup=backup/('environment-'+revision+'.env')
with config_backup.open('xb') as out: out.write(config_bytes)
config_backup.chmod(0o600)
switched=False
try:
    # Only add the exact 14 approved cards; never replace an existing asset.
    owner=pwd.getpwnam('buzhi-production')
    approved=['LOCK-'+str(n) for n in [*range(33,46),50]]
    for card in approved:
        relative='cards/'+card+'.webp';source=release/'assets'/relative;target=assets/relative
        if target.exists():
            if card=='LOCK-50':
                print('Preserving production LOCK-50 artwork (may differ from packaged card)')
            else:
                assert digest(target)==digest(source), 'Refusing to overwrite an existing card: '+card
        else:
            if not target.parent.exists():
                target.parent.mkdir(mode=0o700,parents=True)
                os.chown(target.parent,owner.pw_uid,owner.pw_gid)
            with source.open('rb') as incoming,target.open('xb') as outgoing: shutil.copyfileobj(incoming,outgoing)
            target.chmod(0o600);os.chown(target,owner.pw_uid,owner.pw_gid)
    if not current.is_symlink(): current.rename(rollback)
    temporary=current.with_name('current.unified-pending')
    assert not temporary.exists() and not temporary.is_symlink()
    temporary.symlink_to(release,target_is_directory=True);os.replace(temporary,current);switched=True
    text='\n'.join(line for line in config_bytes.decode().splitlines() if not line.startswith('RAILWAY_GIT_COMMIT_SHA='))+'\nRAILWAY_GIT_COMMIT_SHA='+revision+'\n'
    temp_config=config.with_name('buzhi-production.env.unified-pending')
    fd=os.open(temp_config,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    with os.fdopen(fd,'w') as out: out.write(text)
    os.replace(temp_config,config)
    subprocess.run(['systemctl','start',service],check=True)
    healthy=False
    for attempt in range(30):
        try:
            with urllib.request.urlopen('http://127.0.0.1:14179/health',timeout=2) as response:
                if response.status==200 and response.headers['x-buzhi-revision']==revision: healthy=True;break
        except Exception: time.sleep(.5)
    assert healthy and run('systemctl','is-active',service)=='active', 'New service did not become healthy'
    # Read-only admin catalog works even while the site-wide maintenance gate is enabled.
    request=urllib.request.Request('http://127.0.0.1:14179/api/admin/cards',headers={'Authorization':'Bearer '+values['ADMIN_TOKEN']})
    with urllib.request.urlopen(request,timeout=5) as response:
        assert response.status==200
        catalog=json.load(response)
    assert isinstance(catalog,list) and len(catalog)==60 and all(not c['unreleased'] for c in catalog)
    expected_ids={'LOCK-'+str(n) for n in range(33,61)}
    assert {c['id'] for c in catalog if c['id'].startswith('LOCK-')}==expected_ids
    assert all(c['rarity'] in ['UR','SSR','SR','R','N'] for c in catalog)
    # Keep the public maintenance gate on and ensure it does not admit visitors.
    checkdb=readonly(database)
    try:
        row=checkdb.execute('SELECT enabled FROM site_maintenance WHERE id=1').fetchone()
    finally:
        checkdb.close()
    if row and row[0]:
        try:
            urllib.request.urlopen('http://127.0.0.1:14179/api/catalog',timeout=5)
            raise AssertionError('Maintenance gate opened unexpectedly')
        except urllib.error.HTTPError as exc:
            assert exc.code==503, 'Unexpected maintenance response'
    else:
        with urllib.request.urlopen('http://127.0.0.1:14179/api/catalog',timeout=5) as response: public=json.load(response)
        assert public['visibleCards']==60 and len(public['cards'])==60
    # Live traffic may append rows. Every pre-existing ledger/draw/check-in row must survive.
    live=readonly(database)
    for table,sql in queries:
        if table in ['ledger','draws','checkins']:
            previous=original.execute(sql).fetchall();now=set(live.execute(sql).fetchall())
            assert all(row in now for row in previous), 'Existing business records changed: '+table
    for table in ['users','ledger','draws','checkins']:
        assert live.execute('SELECT count(*) FROM '+table).fetchone()[0]>=original.execute('SELECT count(*) FROM '+table).fetchone()[0]
    assert live.execute('PRAGMA integrity_check').fetchall()==[('ok',)] and not live.execute('PRAGMA foreign_key_check').fetchall()
    after={'users':live.execute('SELECT count(*) FROM users').fetchone()[0],'ledgerRows':live.execute('SELECT count(*) FROM ledger').fetchone()[0],'coinsTotal':live.execute('SELECT sum(amount) FROM ledger').fetchone()[0],'draws':live.execute('SELECT count(*) FROM draws').fetchone()[0],'checkins':live.execute('SELECT count(*) FROM checkins').fetchone()[0]}
    live.close();state.update({'status':'deployed','after':after,'cards':60})
    state_path.write_text(json.dumps(state,indent=2))
    print(json.dumps(state))
except Exception:
    subprocess.run(['systemctl','stop',service],check=False)
    # Never start the old service or restore an old DB over any new live activity.
    if switched:
        temp=current.with_name('current.rollback-pending');temp.symlink_to(rollback,target_is_directory=True);os.replace(temp,current)
    elif not current.exists() and rollback.exists(): rollback.rename(current)
    config.write_bytes(config_bytes);config.chmod(0o600)
    print('Deployment failed: production stopped, previous code/config restored, current database preserved. Manual review required.',file=sys.stderr)
    raise
finally: original.close()
