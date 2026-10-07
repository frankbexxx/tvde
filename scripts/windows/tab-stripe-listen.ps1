# Stripe_Webhook — stripe CLI forward + whsec automatico para backend Dev.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Get-TvdeStripeDevProfile.ps1')
. (Join-Path $lib 'Get-TvdeDevLocalPaths.ps1')
. (Join-Path $lib 'Start-TvdeStripeListen.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
$backendDir = Join-Path $root 'backend'
Set-Location $root

Write-Host ''
Write-Host '=== Stripe TEST webhook (Dev) ===' -ForegroundColor Magenta
Write-Host ''

try {
    $profile = Get-TvdeStripeDevProfile -BackendDir $backendDir
} catch {
    Set-TvdeStripeWebhookState -RepoRoot $root -State 'failed' -Detail 'profile_error'
    Write-Host $_.Exception.Message -ForegroundColor Red
    throw
}

if (-not $profile.RealStripeTest) {
    Set-TvdeStripeWebhookState -RepoRoot $root -State 'na' -Detail 'stripe_mock_or_no_test_key'
    Write-Host 'Stripe TEST webhook: N/A (STRIPE_MOCK ou sem sk_test_ no backend/.env).' -ForegroundColor DarkGray
    Write-Host 'Ambiente Dev continua; pagamentos E2E Stripe real nao se aplicam.' -ForegroundColor DarkGray
    Write-Host ''
    while ($true) { Start-Sleep -Seconds 3600 }
}

Write-Host 'Modo: Stripe TEST real (STRIPE_MOCK=false, sk_test_*).' -ForegroundColor Cyan
Write-Host 'Runbook: docs\ops\O_STRIPE_1_RUNBOOK.md'
Write-Host ''

Start-TvdeStripeListen -RepoRoot $root
