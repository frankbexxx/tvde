# Stripe_Webhook — supervisor stripe listen + heartbeat + probe.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Get-TvdeStripeDevEffectiveConfig.ps1')
. (Join-Path $lib 'Invoke-TvdeStripeListenSupervisor.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Set-Location $root

Write-Host ''
Write-Host '=== Stripe TEST webhook (supervisor) ===' -ForegroundColor Magenta
Write-Host ''

$config = Get-TvdeStripeDevEffectiveConfig -RepoRoot $root

if (-not $config.RealStripeTest) {
    Write-Host 'Stripe TEST E2E: N/A (STRIPE_MOCK ou sem sk_test_* no backend/.env).' -ForegroundColor DarkGray
    Write-Host ''
    while ($true) { Start-Sleep -Seconds 3600 }
}

Write-Host 'Modo: Stripe TEST real supervisionado.' -ForegroundColor Cyan
Write-Host 'Runbook: docs\ops\O_STRIPE_1_RUNBOOK.md'
Write-Host ''

Invoke-TvdeStripeListenSupervisor -RepoRoot $root
