function Wait-TvdeStripeWebhookSecret {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [int]$TimeoutSeconds = 180
    )

    . (Join-Path $PSScriptRoot 'Get-TvdeDevLocalPaths.ps1')

    $secretPath = Get-TvdeStripeWebhookSecretPath -RepoRoot $RepoRoot
    $statePath = Get-TvdeStripeWebhookStatePath -RepoRoot $RepoRoot
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    while ((Get-Date) -lt $deadline) {
        $stateOk = $false
        if (Test-Path -LiteralPath $statePath) {
            try {
                $st = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
                if ($st.state -eq 'ready') { $stateOk = $true }
            } catch {
                $stateOk = $false
            }
        }
        if ($stateOk -and (Test-Path -LiteralPath $secretPath)) {
            $raw = (Get-Content -LiteralPath $secretPath -Raw -ErrorAction SilentlyContinue)
            if ($raw -and ($raw.Trim() -match '^whsec_[A-Za-z0-9]+$')) {
                return $raw.Trim()
            }
        }
        Start-Sleep -Milliseconds 400
    }
    return $null
}
