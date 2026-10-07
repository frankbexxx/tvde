# Backend_Dev — venv + uvicorn. Config vem só de backend/.env (sem override de DB).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')
. (Join-Path $lib 'Get-TvdeStripeDevProfile.ps1')
. (Join-Path $lib 'Get-TvdeDevLocalPaths.ps1')
. (Join-Path $lib 'Wait-TvdeStripeWebhookSecret.ps1')
. (Join-Path $lib 'Show-TvdeDevEnvironmentStatus.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
$backendDir = Join-Path $root 'backend'
Enter-TvdeBackend -RepoRoot $root

Write-Host ''
Write-Host '=== Backend_Dev ===' -ForegroundColor Cyan
Write-Host 'Config: backend/.env (Postgres local ride_db). Sem override de sessao.'
Write-Host ''

$stripeWebhookOk = $true
try {
    $profile = Get-TvdeStripeDevProfile -BackendDir $backendDir
    if ($profile.RealStripeTest) {
        Write-Host 'Stripe TEST real: a aguardar whsec da aba Stripe_Webhook...' -ForegroundColor Cyan
        $secretPath = Get-TvdeStripeWebhookSecretPath -RepoRoot $root
        $whsec = Wait-TvdeStripeWebhookSecret -SecretPath $secretPath -TimeoutSeconds 120
        if ($whsec) {
            $env:STRIPE_WEBHOOK_SECRET = $whsec
            Write-Host 'Stripe TEST webhook: whsec de sessao alinhado ao listener (nao logado).' -ForegroundColor Green
        } else {
            $stripeWebhookOk = $false
            Write-Host '[TVDE] INCOMPLETO: Stripe webhook secret nao recebido em 120s.' -ForegroundColor Red
            Write-Host '       Backend arranca; E2E Stripe nao fecha ate o listener estar OK.' -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    throw
}

Write-Host ''
Write-Host 'uvicorn app.main:app --reload --host 127.0.0.1 --port 8000'
Write-Host ''

Show-TvdeDevEnvironmentStatus -RepoRoot $root

if (-not $stripeWebhookOk) {
    Write-Host 'Stripe TEST webhook: FALHOU (ambiente incompleto para pagamentos reais).' -ForegroundColor Red
    Write-Host ''
}

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
