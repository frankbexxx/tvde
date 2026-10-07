# Backend_Stripe_Local — env local fixo, keys interactivas, diagnostico, uvicorn.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')
. (Join-Path $lib 'Invoke-TvdeRuntimeDiagnostic.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
$backend = Join-Path $root 'backend'
Enter-TvdeBackend -RepoRoot $root

Write-Host ''
Write-Host '=== Backend_Stripe_Local ===' -ForegroundColor Cyan
Write-Host 'O-STRIPE-1 Fase A — STRIPE_MOCK=false, BD local ride_db apenas.'
Write-Host 'Runbook: docs\ops\O_STRIPE_1_RUNBOOK.md'
Write-Host ''

# Fix session env (overrides backend/.env for this tab only).
$env:DATABASE_URL = 'postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/ride_db'
$env:ENV = 'dev'
$env:ENABLE_DEV_TOOLS = 'true'
$env:STRIPE_MOCK = 'false'

if (-not $env:JWT_SECRET_KEY) {
    $env:JWT_SECRET_KEY = 'dev-jwt-secret-key-at-least-32-characters-long'
}
if (-not $env:OTP_SECRET) {
    $env:OTP_SECRET = 'dev-otp-secret-key-at-least-32-characters-long'
}

Write-Host 'Chaves Stripe (sessao — nao vao para disco):' -ForegroundColor Yellow

do {
    $sk = Read-Host 'STRIPE_SECRET_KEY (sk_test_...)'
    if ($sk -match '^sk_live_') {
        Write-Host 'REJEITADO: sk_live_* nao e permitido neste launcher.' -ForegroundColor Red
        $sk = $null
    } elseif ($sk -notmatch '^sk_test_') {
        Write-Host 'Esperado prefixo sk_test_' -ForegroundColor Red
        $sk = $null
    }
} while (-not $sk)
$env:STRIPE_SECRET_KEY = $sk

. (Join-Path $lib 'Get-TvdeDevLocalPaths.ps1')
. (Join-Path $lib 'Wait-TvdeStripeWebhookSecret.ps1')

$secretPath = Get-TvdeStripeWebhookSecretPath -RepoRoot $root
Write-Host 'A aguardar whsec automatico (aba Stripe_Listen / stripe listen)...' -ForegroundColor Cyan
$wh = Wait-TvdeStripeWebhookSecret -SecretPath $secretPath -TimeoutSeconds 180
if (-not $wh) {
    throw 'INCOMPLETO: whsec nao recebido — confirma stripe listen e stripe login.'
}
$env:STRIPE_WEBHOOK_SECRET = $wh
Write-Host 'STRIPE_WEBHOOK_SECRET: alinhado ao listener (sessao, nao logado).' -ForegroundColor Green

Write-Host ''
Write-Host 'A correr diagnostico runtime seguro...' -ForegroundColor Cyan
Invoke-TvdeRuntimeDiagnostic -BackendDir $backend -RequireStripeMockFalse | Out-Null

Write-Host 'Diagnostico OK — a arrancar uvicorn...' -ForegroundColor Green
Write-Host 'Health: Invoke-RestMethod http://127.0.0.1:8000/health'
Write-Host ''

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
