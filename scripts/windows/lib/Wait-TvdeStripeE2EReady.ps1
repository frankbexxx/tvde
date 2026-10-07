function Wait-TvdeStripeE2EReady {
    param(
        [string]$BackendBase = 'http://127.0.0.1:8000',
        [int]$TimeoutSeconds = 300
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $lastReason = ''
    while ((Get-Date) -lt $deadline) {
        try {
            $h = Invoke-RestMethod -Uri "$BackendBase/health?diagnostic=1" -TimeoutSec 5
            if ($h.stripe_mock -eq $true) {
                return @{ ready = $false; reason = 'na_mock'; diagnostic = $h }
            }
            if ($h.stripe_e2e_ready -eq $true) {
                return @{ ready = $true; reason = $null; diagnostic = $h }
            }
            $lastReason = [string]$h.stripe_e2e_reason
        } catch {
            $lastReason = 'backend_down'
        }
        Start-Sleep -Seconds 2
    }
    return @{ ready = $false; reason = $lastReason; diagnostic = $null }
}
