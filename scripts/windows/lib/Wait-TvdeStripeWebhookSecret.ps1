function Wait-TvdeStripeWebhookSecret {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SecretPath,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $SecretPath) {
            $raw = (Get-Content -LiteralPath $SecretPath -Raw -ErrorAction SilentlyContinue)
            if ($raw -and ($raw.Trim() -match '^whsec_[A-Za-z0-9]+$')) {
                return $raw.Trim()
            }
        }
        Start-Sleep -Milliseconds 400
    }
    return $null
}
