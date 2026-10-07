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

    $pg = 'FAIL'
    try {
        $null = Get-Command docker -ErrorAction Stop
        $null = docker inspect ride_postgres 2>$null
        if ($LASTEXITCODE -eq 0) {
            $running = docker inspect -f '{{.State.Running}}' ride_postgres 2>$null
            $pg = if ($running -eq 'true') { 'OK' } else { 'FAIL' }
        }
    } catch {
        $pg = 'FAIL'
    }

    $backend = 'FAIL'
    $frontend = 'FAIL'
    $stripeListener = 'N/A'
    $stripeE2E = 'N/A'
    $stripeDetail = ''
    $diag = $null

    try {
        $diag = Invoke-RestMethod -Uri "$BackendBase/health?diagnostic=1" -TimeoutSec 3
        if ($diag.status -eq 'ok') { $backend = 'OK' }
    } catch {
        $backend = 'FAIL'
    }

    try {
        $null = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/' -TimeoutSec 3 -UseBasicParsing
        $frontend = 'OK'
    } catch {
        $frontend = 'FAIL'
    }

    if ($profileError) {
        $stripeListener = 'FAIL'
        $stripeE2E = 'NOT READY'
        $stripeDetail = $profileError
    } elseif ($profile -and $profile.RealStripeTest) {
        if ($diag) {
            if ($diag.stripe_listener_alive -eq $true) {
                $stripeListener = 'OK'
            } else {
                $stripeListener = 'FAIL'
            }
            if ($diag.stripe_e2e_ready -eq $true) {
                $stripeE2E = 'READY'
            } else {
                $stripeE2E = 'NOT READY'
                $stripeDetail = [string]$diag.stripe_e2e_reason
            }
        } else {
            $stripeListener = 'FAIL'
            $stripeE2E = 'NOT READY'
            $stripeDetail = 'backend_down'
        }
    } elseif ($profile -and $profile.StripeMock) {
        $stripeListener = 'N/A'
        $stripeE2E = 'N/A (mock)'
    }

    Write-Host ''
    Write-Host '=== Ambiente Dev TVDE ===' -ForegroundColor Cyan
    Write-Host "  Postgres            : $pg"
    Write-Host "  Backend             : $backend"
    Write-Host "  Frontend            : $frontend"
    Write-Host "  Stripe TEST listener: $stripeListener"
    Write-Host "  Stripe E2E          : $stripeE2E"
    if ($stripeDetail) {
        Write-Host "                      ($stripeDetail)" -ForegroundColor Yellow
    }
    Write-Host '=========================' -ForegroundColor Cyan
    Write-Host ''
}
