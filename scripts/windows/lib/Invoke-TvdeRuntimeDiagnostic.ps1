# Safe runtime diagnostic — host/database/flags only; no secrets.
function Invoke-TvdeRuntimeDiagnostic {
    param(
        [Parameter(Mandatory = $true)]
        [string]$BackendDir,

        [switch]$RequireStripeMockFalse
    )

    Push-Location $BackendDir
    try {
        $py = @'
import json
from urllib.parse import urlparse
from app.core.config import settings

u = urlparse(settings.DATABASE_URL.replace("+psycopg2", ""))
h = u.hostname or ""
db = (u.path or "").lstrip("/").split("?")[0]
print(json.dumps({
    "host": h,
    "database": db,
    "is_localhost": h in ("localhost", "127.0.0.1"),
    "looks_render": "onrender.com" in h,
    "stripe_mock": bool(getattr(settings, "STRIPE_MOCK", False)),
}))
'@

        $raw = python -c $py 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Diagnostico Python falhou: $raw"
        }

        $obj = $raw | ConvertFrom-Json

        Write-Host ''
        Write-Host '=== Diagnostico runtime (sem secrets) ===' -ForegroundColor Cyan
        Write-Host "  host         : $($obj.host)"
        Write-Host "  database     : $($obj.database)"
        Write-Host "  is_localhost : $($obj.is_localhost)"
        Write-Host "  looks_render : $($obj.looks_render)"
        Write-Host "  stripe_mock  : $($obj.stripe_mock)"
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host ''

        if ($obj.looks_render) {
            throw 'ABORT: looks_render=true — DATABASE_URL aponta para Render. Nao arrancar backend.'
        }
        if (-not $obj.is_localhost) {
            throw "ABORT: host=$($obj.host) — esperado 127.0.0.1 ou localhost."
        }
        if ($obj.database -ne 'ride_db') {
            throw "ABORT: database=$($obj.database) — esperado ride_db."
        }
        if ($RequireStripeMockFalse -and ($obj.stripe_mock -ne $false)) {
            throw 'ABORT: stripe_mock != false.'
        }

        return $obj
    } finally {
        Pop-Location
    }
}
