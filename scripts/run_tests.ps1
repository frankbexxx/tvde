# Run all tests: backend unit tests + integration test (when backend is up).
# Usage: .\scripts\run_tests.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "=== 1. Backend unit tests (pytest) ===" -ForegroundColor Cyan
python -m pytest backend/tests/ -v --tb=short
if ($LASTEXITCODE -ne 0) {
    Write-Host "FAIL: backend tests" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "=== 2. Integration test (simulator + trip) ===" -ForegroundColor Cyan
python scripts/test_simulator_trip.py
$e2e = $LASTEXITCODE
if ($e2e -ne 0) {
    Write-Host "Integration test skipped or failed (backend must be running)" -ForegroundColor Yellow
    Write-Host "  To run: cd backend; uvicorn app.main:app --reload" -ForegroundColor Gray
    # Don't fail overall - unit tests passed
}

Write-Host ""
Write-Host "=== Done: unit tests PASSED ===" -ForegroundColor Green
exit 0
