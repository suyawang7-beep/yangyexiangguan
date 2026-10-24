# Buzhi Island design skills installer
# Run from the repository root on the development computer.
# Skills are development-agent instructions, not runtime website dependencies.
$ErrorActionPreference = 'Stop'
if (-not (Test-Path '.git')) { throw 'Please run from the yangyexiangguan repository root.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required.' }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { throw 'npx is required.' }
Write-Host 'Installing frontend-design skill (Anthropic)...'
npx --yes skills@latest add anthropics/skills --skill frontend-design --yes
if ($LASTEXITCODE -ne 0) { throw 'frontend-design skill installation failed.' }
Write-Host 'Installing animate skill (Emil Kowalski)...'
npx --yes skills@latest add emilkowalski/skills --skill animate --yes
if ($LASTEXITCODE -ne 0) { throw 'animate skill installation failed.' }
Write-Host 'Installing UI UX Pro Max for standard .agents/skills...'
npx --yes ui-ux-pro-max-cli init --ai universal
if ($LASTEXITCODE -ne 0) { throw 'UI UX Pro Max installation failed.' }
Write-Host 'Design skills installation finished. Restart your coding assistant to load them.'
