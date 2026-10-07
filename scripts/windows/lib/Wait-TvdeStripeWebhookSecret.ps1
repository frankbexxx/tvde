function Wait-TvdeStripeWebhookSecret {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [int]$TimeoutSeconds = 180
    )

    . (Join-Path $PSScriptRoot 'Get-TvdeDevLocalPaths.ps1')

    $secretPath = Get-TvdeStripeWebhookSecretPath -RepoRoot $RepoRoot
    $listenPath = Get-TvdeStripeListenJsonPath -RepoRoot $RepoRoot
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        if ((Test-Path -LiteralPath $listenPath) -and (Test-Path -LiteralPath $secretPath)) {
            try {
                $st = Get-Content -LiteralPath $listenPath -Raw | ConvertFrom-Json
                $session = [string]$st.session_id
                $whsecSession = [string]$st.whsec_session_id
                if ($st.state -eq 'ready' -and $session -and $whsecSession -eq $session) {
                    $raw = (Get-Content -LiteralPath $secretPath -Raw -ErrorAction SilentlyContinue)
                    if ($raw -and ($raw.Trim() -match '^whsec_[A-Za-z0-9]+$')) {
                        return $raw.Trim()
                    }
                }
            } catch {
                # retry
            }
        }
        Start-Sleep -Milliseconds 400
    }
    return $null
}
