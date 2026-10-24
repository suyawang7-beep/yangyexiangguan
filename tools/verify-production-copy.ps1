param([ValidatePattern('^\d{8}T\d{6}Z-\d+$')][string]$Snapshot='20261023T114216Z-338055')
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Security
$target=Join-Path $env:USERPROFILE "Backups\buzhi-production\$Snapshot"
$archive=Join-Path $target 'migration-verify.tar.gz'
$folder=Join-Path $target ('migration-verify-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ'))
try {
  $plain=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $target 'snapshot.tar.gz.dpapi')),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
  [IO.File]::WriteAllBytes($archive,$plain)
  & 'C:/Users/A/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' "$PSScriptRoot/../deploy/tencent/restore-backup.py" $archive $folder
  if($LASTEXITCODE -ne 0){throw 'Cannot restore migration fixture'}
  $report=& node "$PSScriptRoot/../tests/production-copy-migration.mjs" $folder
  if($LASTEXITCODE -ne 0){throw 'Production copy migration failed'}
  $report | Set-Content (Join-Path $target 'migration-report.json') -Encoding utf8
  Write-Output $report
} finally {
  foreach($path in @($archive,$folder)) {
    if(-not ([IO.Path]::GetFullPath($path).StartsWith([IO.Path]::GetFullPath($target)+'\'))){throw 'Cleanup path escapes protected target'}
    if(Test-Path -LiteralPath $path){Remove-Item -LiteralPath $path -Recurse -Force}
  }
}
