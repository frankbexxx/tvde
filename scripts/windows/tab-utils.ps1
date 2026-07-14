# Utils_Dev — repo root, git/alembic hints.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Set-Location $root

Write-Host ''
Write-Host '=== Utils_Dev ===' -ForegroundColor Cyan
Write-Host "PWD: $root"
Write-Host ''
Write-Host 'Comandos uteis:'
Write-Host '  git status'
Write-Host '  cd backend; alembic upgrade head'
Write-Host '  cd web-app; npm run build'
Write-Host ''
