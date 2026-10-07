# Read Stripe dev profile from backend/.env — no secrets in return value or logs.
function Get-TvdeStripeDevProfile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BackendDir
    )

    $envFile = Join-Path $BackendDir '.env'
    if (-not (Test-Path -LiteralPath $envFile)) {
        throw "backend/.env em falta ($envFile)."
    }

    $stripeMock = $null
    $skPrefix = $null
    $pkHint = $null

    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        $t = $line.Trim()
        if ($t -eq '' -or $t.StartsWith('#')) { continue }
        if ($t -match '^(?<k>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<v>.*)$') {
            $key = $Matches.k
            $val = $Matches.v.Trim().Trim('"').Trim("'")
            switch ($key) {
                'STRIPE_MOCK' {
                    $lv = $val.ToLowerInvariant()
                    $stripeMock = $lv -in @('1', 'true', 'yes', 'on')
                }
                'STRIPE_SECRET_KEY' {
                    if ($val.Length -ge 7) { $skPrefix = $val.Substring(0, 7) }
                    if ($val -match '^sk_live_') {
                        throw 'ABORT: STRIPE_SECRET_KEY e sk_live_* — proibido no Dev local.'
                    }
                }
            }
        }
    }

    if ($null -eq $stripeMock) {
        # Match backend Settings default (STRIPE_MOCK=False when unset in pydantic — .env usually explicit).
        $stripeMock = $false
    }

    $webAppEnv = Join-Path (Split-Path $BackendDir -Parent) 'web-app\.env.local'
    if (Test-Path -LiteralPath $webAppEnv) {
        foreach ($line in Get-Content -LiteralPath $webAppEnv -Encoding UTF8) {
            $t = $line.Trim()
            if ($t -match '^\s*VITE_STRIPE_PUBLISHABLE_KEY\s*=\s*(?<v>.*)$') {
                $pk = $Matches.v.Trim().Trim('"').Trim("'")
                if ($pk -match '^pk_live_') {
                    throw 'ABORT: VITE_STRIPE_PUBLISHABLE_KEY e pk_live_* — proibido no Dev local.'
                }
                if ($pk.Length -ge 7) { $pkHint = $pk.Substring(0, 7) }
            }
        }
    }

    $realStripeTest = (-not $stripeMock) -and ($skPrefix -eq 'sk_test')

    [pscustomobject]@{
        StripeMock              = $stripeMock
        RealStripeTest          = $realStripeTest
        StripeSecretKeyPrefix   = $skPrefix
        StripePublishablePrefix = $pkHint
    }
}
