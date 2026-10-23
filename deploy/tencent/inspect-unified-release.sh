#!/usr/bin/env bash
# Read-only preflight for the unified release. Never starts any service.
set -euo pipefail
state=$(systemctl show buzhi-production.service --property=ActiveState --value)
printf 'Production state: %s\n' "$state"
if [[ "$state" != inactive && "$state" != failed ]]; then
  echo 'Expected stopped production; refusing this preflight.' >&2
  exit 3
fi
hostname
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
sudo -n python3 - <<'PY'
import datetime, hashlib, json, pathlib, sqlite3
snapshot=pathlib.Path('/var/backups/buzhi-production/20261023T114216Z-338055')
for name in ['island.sqlite','assets.tar.gz','code.tar.gz','service.txt','previous-release.txt','SHA256SUMS']:
    p=snapshot/name
    h=hashlib.sha256()
    with p.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b''): h.update(chunk)
    print('Backup file:',json.dumps({'name':name,'bytes':p.stat().st_size,'sha256':h.hexdigest()}))
print('Backup manifest:',(snapshot/'SHA256SUMS').read_text())
for label,db_path,asset_path in [
 ('production','/var/lib/buzhi-production/island.sqlite','/var/lib/buzhi-production/assets'),
 ('stage','/var/lib/buzhi-stage/island.sqlite','/var/lib/buzhi-stage/assets'),
 ('old-staging','/home/ubuntu/buzhi-staging/data/island.sqlite','/home/ubuntu/buzhi-staging/data/assets')]:
    path=pathlib.Path(db_path)
    if not path.exists(): continue
    db=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True)
    try:
        print('Database baseline:',json.dumps({'environment':label,'integrity':db.execute('PRAGMA quick_check').fetchall(),'users':db.execute('SELECT count(*) FROM users').fetchone()[0],'ledgerRows':db.execute('SELECT count(*) FROM ledger').fetchone()[0],'coinsTotal':db.execute('SELECT coalesce(sum(amount),0) FROM ledger').fetchone()[0],'draws':db.execute('SELECT count(*) FROM draws').fetchone()[0],'checkins':db.execute('SELECT count(*) FROM checkins').fetchone()[0]}))
        db.row_factory=sqlite3.Row
        print('Card profiles:',json.dumps({'environment':label,'items':[dict(r) for r in db.execute('SELECT card_id,name,story,oc_id,oc_id_2 FROM card_profiles ORDER BY card_id')]},ensure_ascii=False))
    finally: db.close()
    folder=pathlib.Path(asset_path)/'cards'
    if folder.exists():
        print('Card files:',json.dumps({'environment':label,'items':[{'name':p.name,'bytes':p.stat().st_size,'modifiedUTC':datetime.datetime.fromtimestamp(p.stat().st_mtime,datetime.timezone.utc).isoformat(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(folder.glob('*.webp'))]},ensure_ascii=False))
PY
