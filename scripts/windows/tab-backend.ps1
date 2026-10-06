# Backend_Dev — venv + uvicorn. Config vem só de backend/.env (sem override de DB).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Enter-TvdeBackend -RepoRoot $root

Write-Host ''
Write-Host '=== Backend_Dev ===' -ForegroundColor Cyan
Write-Host 'Config: backend/.env (Postgres local ride_db). Sem override de sessao.'
Write-Host ''
Write-Host 'uvicorn app.main:app --reload --host 127.0.0.1 --port 8000'
Write-Host ''

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
