"""Restore an off-host archive in isolation; never opens production paths."""
import hashlib, json, pathlib, shutil, sqlite3, sys, tarfile

archive_path, destination = map(pathlib.Path, sys.argv[1:3])
destination.mkdir(mode=0o700, parents=False, exist_ok=False)

def unpack(source, target):
    target.mkdir(mode=0o700, parents=True, exist_ok=True)
    with tarfile.open(source, 'r:gz') as archive:
        for entry in archive.getmembers():
            path = pathlib.PurePosixPath(entry.name)
            if path.is_absolute() or '..' in path.parts or not (entry.isfile() or entry.isdir()):
                raise ValueError('Unsafe backup archive entry')
            output = target.joinpath(*path.parts)
            if not output.resolve().is_relative_to(target.resolve()):
                raise ValueError('Archive path escapes recovery directory')
            if entry.isdir():
                output.mkdir(mode=0o700, parents=True, exist_ok=True)
            else:
                output.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
                original = hashlib.sha256()
                with archive.extractfile(entry) as incoming, output.open('xb') as outgoing:
                    for chunk in iter(lambda:incoming.read(1024*1024),b''):
                        original.update(chunk); outgoing.write(chunk)
                # Check that the restored bytes match the archive, not merely its file list.
                if hashlib.sha256(output.read_bytes()).digest() != original.digest():
                    raise ValueError('Restored file checksum mismatch')

unpack(archive_path, destination)
checksums = destination / 'SHA256SUMS'
if checksums.exists():
    for line in checksums.read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        name = name.lstrip('*')
        if pathlib.PurePosixPath(name).is_absolute() or '..' in pathlib.PurePosixPath(name).parts:
            raise ValueError('Unsafe checksum path')
        if hashlib.sha256((destination / name).read_bytes()).hexdigest() != digest:
            raise ValueError('Snapshot checksum mismatch')
for name, folder in [('assets.tar.gz', 'assets'), ('code.tar.gz', 'code')]:
    if (destination / name).exists():
        unpack(destination / name, destination / folder)
source = sqlite3.connect((destination / 'island.sqlite').resolve().as_uri() + '?mode=ro', uri=True)
recovered = sqlite3.connect(destination / 'recovered.sqlite')
try:
    source.backup(recovered)
    assert recovered.execute('PRAGMA integrity_check').fetchall() == [('ok',)]
    assert recovered.execute('PRAGMA foreign_key_check').fetchall() == []
    tables = [r[0] for r in source.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
    assert source.execute("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall() == recovered.execute("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
    for table in tables:
        quoted = '"' + table.replace('"', '""') + '"'
        assert source.execute('SELECT * FROM ' + quoted).fetchall() == recovered.execute('SELECT * FROM ' + quoted).fetchall()
    report = {'integrity':'ok', 'foreignKeyErrors':0, 'allTablesEqual':True, 'tableCount':len(tables),
              'users':recovered.execute('SELECT count(*) FROM users').fetchone()[0],
              'ledgerRows':recovered.execute('SELECT count(*) FROM ledger').fetchone()[0],
              'coinsTotal':recovered.execute('SELECT coalesce(sum(amount),0) FROM ledger').fetchone()[0],
              'assetFiles':sum(f.is_file() for f in (destination / 'assets').rglob('*'))}
    print(json.dumps(report))
finally:
    recovered.close(); source.close()
