# Backend_Dev — venv + hints (no Stripe, no key prompts).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Enter-TvdeBackend -RepoRoot $root

Write-Host ''
Write-Host '=== Backend_Dev ===' -ForegroundColor Cyan
Write-Host 'Modo dev normal — usa backend/.env da sessao (sem override Stripe).'
Write-Host 'Confirma DATABASE_URL local antes de uvicorn se .env tiver URL Render.'
Write-Host ''
Write-Host 'Exemplo arranque manual:'
Write-Host '  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000'
Write-Host ''
Write-Host 'Stripe real local: scripts\windows\Open-TVDE-Stripe-WT.bat'
Write-Host ''
