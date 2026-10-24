$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$target = Join-Path $env:USERPROFILE 'Backups\buzhi-production\20261023T114216Z-338055'
if (-not (Test-Path (Join-Path $target 'snapshot.tar.gz.dpapi'))) { throw 'Complete the protected snapshot transfer first' }
$plainPath = Join-Path $target 'production.env.private-temp'
$batch = Join-Path $target 'config-sftp.txt'
[IO.File]::WriteAllLines($batch,@("get /etc/buzhi-production.env `"$($plainPath.Replace('\','/'))`"",'bye'),[Text.UTF8Encoding]::new($false))
try {
  & "$env:WINDIR\System32\OpenSSH\sftp.exe" -b $batch -i "$env:USERPROFILE\.ssh\buzhi_codex" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519 -o KexAlgorithms=curve25519-sha256 -o ConnectTimeout=15 -s 'sudo -n /usr/lib/openssh/sftp-server -R' ubuntu@43.132.221.214
  if ($LASTEXITCODE -ne 0) { throw 'Read-only configuration transfer failed' }
  $bytes = [IO.File]::ReadAllBytes($plainPath)
  $encrypted = Join-Path $target 'production.env.dpapi'
  [IO.File]::WriteAllBytes($encrypted,[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))
  $roundtrip = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($encrypted),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  $hash = [Security.Cryptography.SHA256]::Create()
  if ([Convert]::ToBase64String($hash.ComputeHash($bytes)) -ne [Convert]::ToBase64String($hash.ComputeHash($roundtrip))) { throw 'Configuration encryption roundtrip failed' }
  Write-Output 'Production configuration encrypted and roundtrip verified; contents never printed.'
} finally {
  foreach ($path in @($plainPath,$batch)) { if (Test-Path -LiteralPath $path) { Remove-Item -LiteralPath $path -Force } }
}
