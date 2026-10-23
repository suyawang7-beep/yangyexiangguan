#!/usr/bin/env bash
# Run ONLY after approval and after the operator has stopped the service.
# This script never stops/restarts services or changes the live database.
set -euo pipefail
umask 077
service=buzhi-production.service
db=/var/lib/buzhi-production/island.sqlite
assets=/var/lib/buzhi-production/assets
current=/opt/buzhi-production/current
if [[ ${1:-} != --approved-production ]]; then
  echo 'Requires explicit user approval; pass --approved-production only after approval.' >&2
  exit 2
fi
state=$(systemctl show "$service" --property=ActiveState --value)
if [[ "$state" != inactive && "$state" != failed ]]; then
  echo "Refusing backup: service must already be stopped (state=$state)." >&2
  exit 3
fi
test -f "$db" && test -d "$assets" && test -d "$current"
backup=/var/backups/buzhi-production/$(date -u +%Y%m%dT%H%M%SZ)-$$
mkdir -p "$backup"
python3 - "$db" "$backup/island.sqlite" <<'PY'
import pathlib, sqlite3, sys
source = sqlite3.connect(pathlib.Path(sys.argv[1]).as_uri() + '?mode=ro', uri=True)
target = sqlite3.connect(sys.argv[2])
try:
    source.backup(target)
    if target.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
        raise SystemExit('Backup integrity check failed')
    if target.execute('PRAGMA foreign_key_check').fetchall():
        raise SystemExit('Backup foreign key check failed')
finally:
    target.close()
    source.close()
PY
tar -czf "$backup/assets.tar.gz" -C "$assets" .
tar -czf "$backup/code.tar.gz" -C "$current" .
systemctl cat "$service" > "$backup/service.txt"
readlink -f "$current" > "$backup/previous-release.txt"
tar -tzf "$backup/assets.tar.gz" > /dev/null
tar -tzf "$backup/code.tar.gz" > /dev/null
(cd "$backup" && sha256sum island.sqlite assets.tar.gz code.tar.gz service.txt previous-release.txt > SHA256SUMS && sha256sum -c SHA256SUMS)
echo "Backup verified: $backup"
echo 'Copy this private backup off-host and verify SHA256SUMS before deployment.'
