# Adiciona chaves em falta ao backend/.env (nunca sobrescreve valores existentes)
# Valores padrao: reais para dev local, nao placeholders.
# Uso: .\scripts\merge_env_keys.ps1

$ErrorActionPreference = "Stop"
$root = (Get-Item $PSScriptRoot).Parent.FullName
$backendDir = Join-Path $root "backend"
$envPath = Join-Path $backendDir ".env"

# Valores padrao (reais para dev local)
$defaults = @{
    "DATABASE_URL" = "postgresql+psycopg2://postgres:postgres@localhost:5432/ride_db"
    "JWT_SECRET_KEY" = [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
    "JWT_ALGORITHM" = "HS256"
    "JWT_ACCESS_TOKEN_MINUTES" = "60"
    "OTP_SECRET" = [Convert]::ToBase64String((1..24 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
    "OTP_EXPIRATION_MINUTES" = "5"
    "STRIPE_SECRET_KEY" = "sk_test_MOCK_replace_from_stripe_dashboard_for_real_payments"
    "STRIPE_WEBHOOK_SECRET" = "whsec_MOCK_not_used_when_STRIPE_MOCK_true"
    "STRIPE_MOCK" = "true"
    "ENV" = "dev"
    "ENABLE_DEV_TOOLS" = "true"
    "BETA_MODE" = "false"
}

# Parse existing .env (NAO sobrescrever)
$existing = @{}
if (Test-Path $envPath) {
    Get-Content $envPath -Encoding UTF8 | ForEach-Object {
        if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$' -and -not $_.StartsWith('#')) {
            $existing[$matches[1]] = $matches[2].Trim()
        }
    }
}

# Construir: existente OU default (gerar novo JWT/OTP so para chaves novas)
$output = @()
$added = 0
$sections = @{
    "Database" = @("DATABASE_URL")
    "JWT" = @("JWT_SECRET_KEY", "JWT_ALGORITHM", "JWT_ACCESS_TOKEN_MINUTES")
    "OTP" = @("OTP_SECRET", "OTP_EXPIRATION_MINUTES")
    "Stripe" = @("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_MOCK")
    "Ambiente" = @("ENV", "ENABLE_DEV_TOOLS", "BETA_MODE")
}

foreach ($section in $sections.Keys) {
    $output += ""
    $output += "# $section"
    foreach ($key in $sections[$section]) {
        $val = if ($existing.ContainsKey($key)) { $existing[$key] } else {
            $added++
            if ($defaults.ContainsKey($key)) { $defaults[$key] } else { "" }
        }
        $output += "$key=$val"
    }
}

$output | Set-Content -Path $envPath -Encoding UTF8
Write-Host "backend/.env atualizado. Chaves novas adicionadas: $added" -ForegroundColor Green
