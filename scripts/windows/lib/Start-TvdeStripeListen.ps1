# Start stripe listen, write whsec to .dev-local (gitignored), forward webhooks to backend.
function Start-TvdeStripeListen {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [string]$ForwardTo = 'http://127.0.0.1:8000/webhooks/stripe'
    )

    . (Join-Path $PSScriptRoot 'Get-TvdeDevLocalPaths.ps1')

    if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
        Set-TvdeStripeWebhookState -RepoRoot $RepoRoot -State 'failed' -Detail 'stripe_cli_missing'
        throw 'stripe CLI nao encontrado. Instala: https://stripe.com/docs/stripe-cli'
    }

    $secretPath = Get-TvdeStripeWebhookSecretPath -RepoRoot $RepoRoot
    $devDir = Split-Path -Parent $secretPath
    New-Item -ItemType Directory -Force -Path $devDir | Out-Null

    if (Test-Path -LiteralPath $secretPath) {
        Remove-Item -LiteralPath $secretPath -Force
    }
    Set-TvdeStripeWebhookState -RepoRoot $RepoRoot -State 'starting' -Detail 'stripe_listen'

    $written = $false
    $warned = $false
    $started = Get-Date

    Write-Host "Forward: $ForwardTo" -ForegroundColor Cyan
    Write-Host ''

    try {
        stripe listen --forward-to $ForwardTo 2>&1 | ForEach-Object {
            $line = $_.ToString()
            Write-Host $line
            if (-not $written -and $line -match '(whsec_[A-Za-z0-9]+)') {
                $sec = $Matches[1]
                Set-Content -LiteralPath $secretPath -Value $sec -Encoding utf8 -NoNewline
                Set-TvdeStripeWebhookState -RepoRoot $RepoRoot -State 'ready' -Detail 'forwarding'
                Write-Host '[TVDE] Stripe TEST webhook: secret alinhado (prefixo whsec_***).' -ForegroundColor Green
                $written = $true
            }
            if (-not $written -and -not $warned -and ((Get-Date) - $started).TotalSeconds -gt 45) {
                $warned = $true
                Write-Host '[TVDE] AVISO: whsec ainda nao recebido — confirma `stripe login`.' -ForegroundColor Yellow
            }
        }
    } catch {
        Set-TvdeStripeWebhookState -RepoRoot $RepoRoot -State 'failed' -Detail 'listen_error'
        throw
    }

    if (-not $written) {
        Set-TvdeStripeWebhookState -RepoRoot $RepoRoot -State 'failed' -Detail 'no_whsec'
        throw 'Stripe listen terminou sem publicar whsec.'
    }
}
