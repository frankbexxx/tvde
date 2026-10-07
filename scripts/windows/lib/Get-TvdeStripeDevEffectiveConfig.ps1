# Validate effective Stripe TEST Dev config (files + session env). Throws on conflict/live keys.
function Get-TvdeStripeDevEffectiveConfig {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    . (Join-Path $PSScriptRoot 'Get-TvdeStripeDevProfile.ps1')

    $backendDir = Join-Path $RepoRoot 'backend'
    $profile = Get-TvdeStripeDevProfile -BackendDir $backendDir

    if ($env:STRIPE_SECRET_KEY -match '^sk_live_') {
        throw 'ABORT: variavel de sessao STRIPE_SECRET_KEY=sk_live_*'
    }
    if ($env:STRIPE_WEBHOOK_SECRET -and $env:STRIPE_WEBHOOK_SECRET -notmatch '^whsec_') {
        throw 'ABORT: STRIPE_WEBHOOK_SECRET de sessao invalido'
    }
    if ($env:STRIPE_MOCK -eq 'true' -and -not $profile.StripeMock) {
        Write-Host '[TVDE] AVISO: sessao STRIPE_MOCK=true mas backend/.env tem STRIPE_MOCK=false' -ForegroundColor Yellow
    }

    [pscustomobject]@{
        RealStripeTest          = $profile.RealStripeTest
        StripeMock              = $profile.StripeMock
        StripeSecretKeyPrefix   = $profile.StripeSecretKeyPrefix
        StripePublishablePrefix = $profile.StripePublishablePrefix
    }
}
