# Safe runtime diagnostic — host/database/flags/alembic sync only; no secrets.
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
from app.db.schema_drift import check_schema_drift

u = urlparse(settings.DATABASE_URL.replace("+psycopg2", ""))
h = u.hostname or ""
db = (u.path or "").lstrip("/").split("?")[0]
drift = None
drift_error = None
try:
    drift = check_schema_drift()
except Exception as exc:  # noqa: BLE001
    drift_error = f"{type(exc).__name__}: {exc}"

payload = {
    "host": h,
    "database": db,
    "is_localhost": h in ("localhost", "127.0.0.1"),
    "looks_render": "onrender.com" in h,
    "stripe_mock": bool(getattr(settings, "STRIPE_MOCK", False)),
    "alembic_current": drift.alembic_current if drift else None,
    "alembic_heads": list(drift.alembic_heads) if drift else [],
    "in_sync": bool(drift.in_sync) if drift else False,
    "alembic_error": drift_error,
}
print(json.dumps(payload))
'@

        $raw = python -c $py 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Diagnostico Python falhou: $raw"
        }

        $obj = $raw | ConvertFrom-Json

        Write-Host ''
        Write-Host '=== Diagnostico runtime (sem secrets) ===' -ForegroundColor Cyan
        Write-Host "  host            : $($obj.host)"
        Write-Host "  database        : $($obj.database)"
        Write-Host "  is_localhost    : $($obj.is_localhost)"
        Write-Host "  looks_render    : $($obj.looks_render)"
        Write-Host "  stripe_mock     : $($obj.stripe_mock)"
        $heads = if ($obj.alembic_heads) { ($obj.alembic_heads -join ',') } else { '(none)' }
        Write-Host "  alembic_current : $($obj.alembic_current)"
        Write-Host "  alembic_heads   : $heads"
        Write-Host "  in_sync         : $($obj.in_sync)"
        if ($obj.alembic_error) {
            Write-Host "  alembic_error   : $($obj.alembic_error)" -ForegroundColor Yellow
        }
        Write-Host '========================================' -ForegroundColor Cyan
        Write-Host ''

        if (-not $obj.in_sync) {
            Write-Host '[WARN] SCHEMA DRIFT: alembic current != heads — ORM may 500; o startup dev aplica upgrade head na ride_db local.' -ForegroundColor Yellow
            Write-Host ''
        }

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
