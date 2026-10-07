function Show-TvdeDevEnvironmentStatus {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [string]$BackendBase = 'http://127.0.0.1:8000'
    )

    . (Join-Path $PSScriptRoot 'Get-TvdeDevLocalPaths.ps1')
    . (Join-Path $PSScriptRoot 'Get-TvdeStripeDevProfile.ps1')

    $backendDir = Join-Path $RepoRoot 'backend'
    $profile = $null
    $profileError = $null
    try {
        $profile = Get-TvdeStripeDevProfile -BackendDir $backendDir
    } catch {
        $profileError = $_.Exception.Message
    }

    $pg = '???'
    try {
        $docker = Get-Command docker -ErrorAction Stop
        $null = docker inspect ride_postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            $running = docker inspect -f '{{.State.Running}}' ride_postgres 2>$null
            $pg = if ($running -eq 'true') { 'OK' } else { 'PARADO' }
        } else {
            $pg = 'SEM CONTAINER'
        }
    } catch {
        $pg = 'DOCKER?'
    }

    $backend = '???'
    $frontend = '???'
    $stripeWh = 'N/A'
    $stripeDetail = ''

    try {
        $health = Invoke-RestMethod -Uri "$BackendBase/health?diagnostic=1" -TimeoutSec 3
        if ($health.status -eq 'ok') { $backend = 'OK' }
    } catch {
        $backend = 'OFF'
    }

    try {
        $null = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 3 -UseBasicParsing
        $frontend = 'OK'
    } catch {
        $frontend = 'OFF'
    }

    if ($profileError) {
        $stripeWh = 'ERRO'
        $stripeDetail = $profileError
    } elseif ($profile -and $profile.RealStripeTest) {
        $statePath = Get-TvdeStripeWebhookStatePath -RepoRoot $RepoRoot
        if (Test-Path -LiteralPath $statePath) {
            try {
                $st = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
                switch ($st.state) {
                    'ready' { $stripeWh = 'OK' }
                    'starting' { $stripeWh = 'A ARRANCAR' }
                    'failed' {
                        $stripeWh = 'FALHOU'
                        $stripeDetail = [string]$st.detail
                    }
                    default { $stripeWh = [string]$st.state }
                }
            } catch {
                $stripeWh = '???'
            }
        } else {
            $stripeWh = 'A ARRANCAR'
        }
        if ($backend -eq 'OK') {
            try {
                $h = Invoke-RestMethod -Uri "$BackendBase/health?diagnostic=1" -TimeoutSec 3
                if ($h.stripe_e2e_ready -eq $false) {
                    $stripeWh = 'INCOMPLETO'
                    $stripeDetail = 'webhook secret nao alinhado no backend'
                }
            } catch { }
        }
    } elseif ($profile -and $profile.StripeMock) {
        $stripeWh = 'N/A (mock)'
    }

    Write-Host ''
    Write-Host '=== Ambiente Dev TVDE ===' -ForegroundColor Cyan
    Write-Host "  Postgres          : $pg"
    Write-Host "  Backend           : $backend"
    Write-Host "  Frontend          : $frontend"
    Write-Host "  Stripe TEST webhook : $stripeWh"
    if ($stripeDetail) {
        Write-Host "                      ($stripeDetail)" -ForegroundColor Yellow
    }
    Write-Host '=========================' -ForegroundColor Cyan
    Write-Host ''
}
