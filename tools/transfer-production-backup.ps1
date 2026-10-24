param([ValidatePattern('^\d{8}T\d{6}Z-\d+$')][string]$Snapshot='20261023T114216Z-338055')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$snapshot = $Snapshot
$target = Join-Path $env:USERPROFILE "Backups\buzhi-production\$snapshot"
New-Item -ItemType Directory -Force -Path $target | Out-Null
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $target /inheritance:r /grant:r "*${sid}:(OI)(CI)F" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Cannot protect backup directory' }
$incoming = Join-Path $target 'incoming'
New-Item -ItemType Directory -Force -Path $incoming | Out-Null
$files = @('island.sqlite','assets.tar.gz','code.tar.gz','service.txt','previous-release.txt','SHA256SUMS')
$batch = Join-Path $target 'sftp-batch.txt'
$commands = @("lcd `"$($incoming.Replace('\','/'))`"", "cd /var/backups/buzhi-production/$snapshot")
foreach ($file in $files) { $commands += "get -a $file" }
$commands += 'bye'
[IO.File]::WriteAllLines($batch,$commands,[Text.UTF8Encoding]::new($false))
& "$env:WINDIR\System32\OpenSSH\sftp.exe" -b $batch -i "$env:USERPROFILE\.ssh\buzhi_codex" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519 -o KexAlgorithms=curve25519-sha256 -o ConnectTimeout=15 -s 'sudo -n /usr/lib/openssh/sftp-server -R' ubuntu@43.132.221.214
if ($LASTEXITCODE -ne 0) { throw 'Read-only SFTP transfer failed; protected partial files retained for resume' }
foreach ($line in Get-Content (Join-Path $incoming 'SHA256SUMS')) {
  if ($line -notmatch '^([a-f0-9]{64})\s+([A-Za-z0-9.-]+)$') { throw 'Invalid checksum manifest' }
  $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $incoming $Matches[2])).Hash.ToLowerInvariant()
  if ($hash -ne $Matches[1]) { throw "Checksum mismatch: $($Matches[2])" }
}
$python = 'C:/Users/A/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$archive = Join-Path $target 'snapshot.tar.gz'
& $python -c 'import pathlib,sys,tarfile; p=pathlib.Path(sys.argv[1]); t=tarfile.open(sys.argv[2],"w:gz"); [t.add(f,arcname=f.name,recursive=False) for f in sorted(p.iterdir())]; t.close()' $incoming $archive
if ($LASTEXITCODE -ne 0) { throw 'Cannot package transferred backup' }
$encrypted = Join-Path $target 'snapshot.tar.gz.dpapi'
$plain = [IO.File]::ReadAllBytes($archive)
$cipher = [Security.Cryptography.ProtectedData]::Protect($plain,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes($encrypted,$cipher)
$decrypted = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($encrypted),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$verified = Join-Path $target 'decrypt-verified.tar.gz'
[IO.File]::WriteAllBytes($verified,$decrypted)
if ((Get-FileHash $archive).Hash -ne (Get-FileHash $verified).Hash) { throw 'Encrypted backup roundtrip mismatch' }
$restore = Join-Path $target ('restore-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))
$report = & $python "$PSScriptRoot/../deploy/tencent/restore-backup.py" $verified $restore
if ($LASTEXITCODE -ne 0) { throw 'Actual backup restoration failed; protected evidence retained' }
$report | Set-Content (Join-Path $target 'restore-report.json') -Encoding utf8
(Get-FileHash $encrypted).Hash.ToLowerInvariant() | Set-Content (Join-Path $target 'encrypted.sha256')
# All plaintext targets are known children of the protected backup directory.
foreach ($path in @($incoming,$restore,$archive,$verified,$batch)) {
  if (-not ([IO.Path]::GetFullPath($path).StartsWith([IO.Path]::GetFullPath($target) + '\'))) { throw 'Cleanup path escapes target' }
  Remove-Item -LiteralPath $path -Recurse -Force
}
Write-Output "Encrypted off-host backup verified: $encrypted"
Write-Output $report
