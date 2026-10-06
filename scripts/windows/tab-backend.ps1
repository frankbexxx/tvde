# Backend_Dev — venv + BD local obrigatória (nunca Render do .env nesta aba).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')
. (Join-Path $lib 'Invoke-TvdeRuntimeDiagnostic.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
$backend = Join-Path $root 'backend'
Enter-TvdeBackend -RepoRoot $root

Write-Host ''
Write-Host '=== Backend_Dev ===' -ForegroundColor Cyan
Write-Host 'Smoke/dev local — DATABASE_URL forçada a 127.0.0.1/ride_db (override .env só nesta sessao).'
Write-Host 'Nao grava secrets; staging/prod intactos.'
Write-Host ''

# Session-only override (python-dotenv does not override existing env vars).
$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/ride_db'
if (-not $env:ENV) { $env:ENV = 'dev' }

Write-Host '  DATABASE_URL host : 127.0.0.1'
Write-Host '  DATABASE_URL db   : ride_db'
Write-Host '  (overrides backend/.env for this process only)'
Write-Host ''

Write-Host 'A correr diagnostico runtime seguro...' -ForegroundColor Cyan
Invoke-TvdeRuntimeDiagnostic -BackendDir $backend | Out-Null

Write-Host 'Diagnostico OK — a arrancar uvicorn...' -ForegroundColor Green
Write-Host 'Health: Invoke-RestMethod http://127.0.0.1:8000/health'
Write-Host 'Antes de smoke: alembic current == heads (ver GUIA_TESTES §5.6b).'
Write-Host ''
Write-Host 'Stripe real local: scripts\windows\Open-TVDE-Stripe-WT.bat'
Write-Host ''

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
