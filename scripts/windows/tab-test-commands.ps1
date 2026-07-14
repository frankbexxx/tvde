# Test_Commands — cheatsheet O-STRIPE-1 (nao executa POSTs automaticamente).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Set-Location $root

$base = 'http://127.0.0.1:8000'

Write-Host ''
Write-Host '=== Test_Commands (O-STRIPE-1) ===' -ForegroundColor Cyan
Write-Host "Runbook: docs\ops\O_STRIPE_1_RUNBOOK.md"
Write-Host ''
Write-Host "`$base = '$base'"
Write-Host ''
Write-Host '--- Health ---'
Write-Host "Invoke-RestMethod `$base/health"
Write-Host ''
Write-Host '--- T0: sem stripe-signature (esperado 422) ---'
Write-Host "Invoke-WebRequest -Method POST -Uri `"`$base/webhooks/stripe`" -SkipHttpErrorCheck"
Write-Host ''
Write-Host '--- T1: assinatura invalida (esperado 401) ---'
Write-Host "Invoke-WebRequest -Method POST -Uri `"`$base/webhooks/stripe`" -Headers @{ 'stripe-signature' = 'v1=invalid' } -SkipHttpErrorCheck"
Write-Host ''
Write-Host '--- T2: trigger Stripe CLI (aba Stripe_Listen ou outro terminal) ---'
Write-Host 'stripe trigger payment_intent.succeeded'
Write-Host ''
Write-Host '--- T3b: fluxo completo (copiar/colar manualmente) ---'
Write-Host @"
`$base = '$base'
Invoke-RestMethod -Method POST -Uri "`$base/dev/seed"
`$tok = Invoke-RestMethod -Method POST -Uri "`$base/dev/tokens"
`$hdrP = @{ Authorization = "Bearer `$(`$tok.passenger)" }
# ... ver O_STRIPE_1_RUNBOOK.md secao 5
"@
Write-Host ''
Write-Host 'Nenhum POST foi executado automaticamente nesta aba.'
Write-Host ''
