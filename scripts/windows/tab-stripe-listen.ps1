# Stripe_Listen — stripe CLI forward (copiar whsec_ para Backend_Stripe_Local).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Set-Location $root

if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
    throw 'stripe CLI nao encontrado. Instala: https://stripe.com/docs/stripe-cli'
}

Write-Host ''
Write-Host '=== Stripe_Listen ===' -ForegroundColor Magenta
Write-Host ''
Write-Host 'IMPORTANTE:' -ForegroundColor Yellow
Write-Host '  Copia o whsec_ que aparecer AQUI para a aba Backend_Stripe_Local'
Write-Host '  (Read-Host STRIPE_WEBHOOK_SECRET). Nao commitar nem colar em chat.'
Write-Host ''
Write-Host 'Forward: http://127.0.0.1:8000/webhooks/stripe'
Write-Host ''

stripe listen --forward-to http://127.0.0.1:8000/webhooks/stripe
