function Get-TvdeDevLocalDir {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )
    Join-Path $RepoRoot '.dev-local'
}

function Get-TvdeStripeWebhookSecretPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )
    Join-Path (Get-TvdeDevLocalDir -RepoRoot $RepoRoot) 'stripe-webhook-secret'
}

function Get-TvdeStripeWebhookStatePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )
    Join-Path (Get-TvdeDevLocalDir -RepoRoot $RepoRoot) 'stripe-webhook.state'
}

function Set-TvdeStripeWebhookState {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [ValidateSet('na', 'starting', 'ready', 'failed')]
        [string]$State,
        [string]$Detail = ''
    )
    $dir = Get-TvdeDevLocalDir -RepoRoot $RepoRoot
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $payload = @{
        state     = $State
        detail    = $Detail
        updatedAt = (Get-Date).ToUniversalTime().ToString('o')
    } | ConvertTo-Json -Compress
    Set-Content -LiteralPath (Get-TvdeStripeWebhookStatePath -RepoRoot $RepoRoot) -Value $payload -Encoding utf8 -NoNewline
}
