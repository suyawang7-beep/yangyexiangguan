#!/usr/bin/env bash
# Read-only inspection. Never print tokens, user rows, or private config contents.
set -euo pipefail
hostname
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
node --version
command -v node python3 tar sha256sum
systemctl show buzhi-production.service -p ActiveState -p SubState -p MainPID -p User -p Group -p WorkingDirectory -p ExecStart -p EnvironmentFiles
for service in buzhi-stage.service buzhi-staging.service; do
  systemctl show "$service" -p Id -p ActiveState -p WorkingDirectory
done
readlink -f /opt/buzhi-production/current
sudo -n ls -ld /opt/buzhi-production/current /var/lib/buzhi-production /var/lib/buzhi-production/assets
sudo -n stat -c '%n size=%s owner=%U:%G mode=%a' /var/lib/buzhi-production/island.sqlite /etc/buzhi-production.env
df -h /var/lib/buzhi-production /opt/buzhi-production /var/backups
if test -d /opt/buzhi-production/current/.git; then
  git -c safe.directory=/opt/buzhi-production/current -C /opt/buzhi-production/current rev-parse HEAD
fi
sha256sum /opt/buzhi-production/current/server/index.mjs /opt/buzhi-production/current/ui-preview/resident.html /opt/buzhi-production/current/admin/index.html /opt/buzhi-production/current/index.html
find /opt/buzhi-production/current -maxdepth 1 -type f -printf '%f\n'
curl --fail --silent --show-error --include http://127.0.0.1:14179/health
mainpid=$(systemctl show buzhi-production.service --property=MainPID --value)
sudo -n python3 - "$mainpid" <<'PY'
import json, os, pathlib, sqlite3, sys
allowed = ['NODE_ENV', 'HOST', 'PORT', 'DB_PATH', 'ASSET_DIR', 'RAILWAY_GIT_COMMIT_SHA']
config = pathlib.Path('/etc/buzhi-production.env')
values = {}
for line in config.read_text().splitlines():
    if line.strip() and not line.lstrip().startswith('#') and '=' in line:
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"\'')
print('Config paths:', json.dumps({k:values.get(k) for k in allowed}))
print('Config admin token >=32 chars:', len(values.get('ADMIN_TOKEN', '')) >= 32)
if int(sys.argv[1]):
    entries = pathlib.Path('/proc/' + sys.argv[1] + '/environ').read_bytes().split(b'\0')
    running = dict(e.decode().split('=', 1) for e in entries if b'=' in e)
    print('Running paths:', json.dumps({k:running.get(k) for k in allowed}))
    print('Running admin token >=32 chars:', len(running.get('ADMIN_TOKEN', '')) >= 32)
db = sqlite3.connect('file:/var/lib/buzhi-production/island.sqlite?mode=ro', uri=True)
try:
    print('SQLite database location:', db.execute('PRAGMA database_list').fetchall())
    print('SQLite quick_check:', db.execute('PRAGMA quick_check').fetchall())
    print('SQLite foreign key errors:', len(db.execute('PRAGMA foreign_key_check').fetchall()))
    print('SQLite journal mode:', db.execute('PRAGMA journal_mode').fetchone()[0])
    tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    for table in ['users', 'ledger', 'island_mail', 'island_items']:
        print('Record count:', table, db.execute('SELECT count(*) FROM ' + table).fetchone()[0] if table in tables else 'table absent')
finally:
    db.close()
for folder in ['/var/backups/buzhi-production', '/var/lib/buzhi-production/backups']:
    p = pathlib.Path(folder)
    print('Backup directory:', folder, 'exists=' + str(p.exists()))
    if p.exists():
        for f in sorted(p.iterdir(), key=lambda f:f.stat().st_mtime, reverse=True)[:8]:
            print('Backup entry:', f.name, 'bytes=' + str(f.stat().st_size))
import tarfile, hashlib, datetime
for f in sorted(pathlib.Path('/var/backups/buzhi-production').glob('*.tgz')):
    digest = hashlib.sha256()
    with f.open('rb') as stream:
        for chunk in iter(lambda:stream.read(1024*1024), b''):
            digest.update(chunk)
    with tarfile.open(f, 'r:gz') as archive:
        members = archive.getmembers()
        databases = [m for m in members if m.isfile() and m.name.endswith('.sqlite')]
        print('Backup archive:', f.name, 'sha256=' + digest.hexdigest(), 'members=' + str(len(members)), 'dbFiles=' + str(len(databases)), 'assetFiles=' + str(sum(m.isfile() and '/assets/' in '/' + m.name for m in members)), 'mtimeUTC=' + datetime.datetime.fromtimestamp(f.stat().st_mtime, datetime.timezone.utc).isoformat())
        for member in databases:
            snapshot = sqlite3.connect(':memory:')
            try:
                snapshot.deserialize(archive.extractfile(member).read())
                # A WAL-mode snapshot opened in memory must use a disk-free image.
                print('Backup SQLite integrity:', member.name, snapshot.execute('PRAGMA integrity_check').fetchall())
            finally:
                snapshot.close()
for f in list(pathlib.Path('/etc/nginx/sites-enabled').glob('*')) + list(pathlib.Path('/etc/nginx/conf.d').glob('*.conf')):
    if f.is_file():
        import re
        for key, value in re.findall(r'\b(listen|server_name|proxy_pass)\s+([^;{}]+);', f.read_text()):
            print('Proxy route:', f.name, key, value)
import subprocess
for service in ['buzhi-stage.service', 'buzhi-staging.service']:
    pid = subprocess.check_output(['systemctl', 'show', service, '--property=MainPID', '--value'], text=True).strip()
    if pid.isdigit() and int(pid):
        entries = pathlib.Path('/proc/' + pid + '/environ').read_bytes().split(b'\0')
        environment = dict(e.decode().split('=', 1) for e in entries if b'=' in e)
        print('Other service data paths:', service, json.dumps({k:environment.get(k) for k in ['HOST', 'PORT', 'DB_PATH', 'ASSET_DIR']}))
PY
