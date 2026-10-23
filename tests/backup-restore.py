"""Exercise recovery on synthetic data; no production paths or network."""
import hashlib, io, json, pathlib, sqlite3, subprocess, sys, tarfile, tempfile

script = pathlib.Path(__file__).resolve().parents[1] / 'deploy/tencent/restore-backup.py'
with tempfile.TemporaryDirectory(prefix='buzhi-recovery-test-') as scratch:
    root = pathlib.Path(scratch)
    db = sqlite3.connect(root / 'fixture.sqlite')
    db.executescript("CREATE TABLE users(id TEXT PRIMARY KEY); CREATE TABLE ledger(user_id TEXT REFERENCES users(id),amount INTEGER); INSERT INTO users VALUES('synthetic'); INSERT INTO ledger VALUES('synthetic',75);")
    db.commit(); db.close()
    for bad in [False, True]:
        archive = root / ('unsafe.tgz' if bad else 'safe.tgz')
        with tarfile.open(archive, 'w:gz') as tar:
            tar.add(root / 'fixture.sqlite', arcname='island.sqlite')
            data = b'synthetic-asset-bytes'
            entry = tarfile.TarInfo('../escape' if bad else 'assets/cards/test.webp')
            entry.size = len(data); tar.addfile(entry, io.BytesIO(data))
        result = subprocess.run([sys.executable, str(script), str(archive), str(root / ('bad' if bad else 'restored'))], capture_output=True, text=True)
        if bad:
            assert result.returncode != 0 and not (root / 'escape').exists(), result.stdout + result.stderr
        else:
            assert result.returncode == 0, result.stdout + result.stderr
            report = json.loads(result.stdout)
            assert report['users'] == 1 and report['ledgerRows'] == 1 and report['coinsTotal'] == 75
            assert report['assetFiles'] == 1 and report['allTablesEqual'] is True
            assert (root / 'restored/assets/cards/test.webp').read_bytes() == data
    # The next fresh snapshot is a split SQLite/assets/code/config payload.
    payload = root / 'payload'; payload.mkdir()
    (payload / 'island.sqlite').write_bytes((root / 'fixture.sqlite').read_bytes())
    for name, member, data in [('assets.tar.gz','cards/test.webp',b'new-asset'),('code.tar.gz','server/index.mjs',b'// fixture')]:
        with tarfile.open(payload / name, 'w:gz') as tar:
            entry = tarfile.TarInfo(member); entry.size=len(data); tar.addfile(entry,io.BytesIO(data))
    (payload / 'production.env').write_text('ADMIN_TOKEN=synthetic-only-not-production')
    (payload / 'SHA256SUMS').write_text(''.join(hashlib.sha256(f.read_bytes()).hexdigest()+'  '+f.name+'\n' for f in payload.iterdir()))
    with tarfile.open(root / 'payload.tgz','w:gz') as tar:
        for f in payload.iterdir(): tar.add(f,arcname=f.name)
    result = subprocess.run([sys.executable,str(script),str(root / 'payload.tgz'),str(root / 'split-restored')],capture_output=True,text=True)
    assert result.returncode == 0,result.stdout+result.stderr
    assert json.loads(result.stdout)['assetFiles']==1
    assert (root / 'split-restored/code/server/index.mjs').read_bytes()==b'// fixture'
    print('PASS synthetic SQLite/asset restore, table equality, ledger totals and archive path traversal rejection')
