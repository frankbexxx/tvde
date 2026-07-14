# Utils_Stripe — repo root + referencia O-STRIPE-1.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Set-Location $root

Write-Host ''
Write-Host '=== Utils_Stripe ===' -ForegroundColor Cyan
Write-Host "PWD: $root"
Write-Host ''
Write-Host 'Runbook: docs\ops\O_STRIPE_1_RUNBOOK.md'
Write-Host ''
Write-Host 'Limpar vars de sessao Stripe (PowerShell):'
Write-Host '  Remove-Item Env:STRIPE_SECRET_KEY -ErrorAction SilentlyContinue'
Write-Host '  Remove-Item Env:STRIPE_WEBHOOK_SECRET -ErrorAction SilentlyContinue'
Write-Host '  Remove-Item Env:STRIPE_MOCK -ErrorAction SilentlyContinue'
Write-Host ''
Write-Host 'Git / alembic:'
Write-Host '  git status'
Write-Host '  cd backend; alembic upgrade head'
Write-Host ''
