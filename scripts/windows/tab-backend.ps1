# Backend_Dev — venv + hints (no Stripe, no key prompts).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Enter-TvdeBackend -RepoRoot $root

Write-Host ''
Write-Host '=== Backend_Dev ===' -ForegroundColor Cyan
Write-Host 'Modo dev normal — usa backend/.env da sessao (sem override Stripe).'
Write-Host 'Confirma DATABASE_URL local antes de uvicorn se .env tiver URL Render.'
Write-Host 'Antes de smoke manual: alembic current deve igualar alembic heads (ver GUIA_TESTES §5.6b).'
Write-Host ''

# Soft Alembic sync report — never blocks, never upgrades.
$pyDrift = @'
import json
from app.db.schema_drift import check_schema_drift, drift_warning_message
try:
    s = check_schema_drift()
    print(json.dumps({
        "alembic_current": s.alembic_current,
        "alembic_heads": list(s.alembic_heads),
        "in_sync": s.in_sync,
        "warning": None if s.in_sync else drift_warning_message(s),
    }))
except Exception as exc:
    print(json.dumps({
        "alembic_current": None,
        "alembic_heads": [],
        "in_sync": False,
        "warning": f"[WARN] SCHEMA DRIFT check failed ({type(exc).__name__}): {exc} — dev startup will NOT auto-migrate.",
    }))
'@
try {
    $raw = python -c $pyDrift 2>&1
    if ($LASTEXITCODE -eq 0) {
        $drift = $raw | ConvertFrom-Json
        $heads = if ($drift.alembic_heads) { ($drift.alembic_heads -join ',') } else { '(none)' }
        Write-Host "alembic_current : $($drift.alembic_current)"
        Write-Host "alembic_heads   : $heads"
        Write-Host "in_sync         : $($drift.in_sync)"
        if ($drift.warning) {
            Write-Host $drift.warning -ForegroundColor Yellow
        }
        Write-Host ''
    } else {
        Write-Host "[WARN] SCHEMA DRIFT check unavailable: $raw" -ForegroundColor Yellow
        Write-Host ''
    }
} catch {
    Write-Host "[WARN] SCHEMA DRIFT check skipped: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ''
}

Write-Host 'Exemplo arranque manual:'
Write-Host '  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000'
Write-Host ''
Write-Host 'Stripe real local: scripts\windows\Open-TVDE-Stripe-WT.bat'
Write-Host ''
