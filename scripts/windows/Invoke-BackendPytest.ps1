# Safe local backend pytest — forces a local DATABASE_URL (never Render from .env).
# Usage (from repo root or anywhere):
#   .\scripts\windows\Invoke-BackendPytest.ps1
#   .\scripts\windows\Invoke-BackendPytest.ps1 -- tests/test_test_db_guard.py -q

$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Enter-TvdeBackend -RepoRoot $root

# Strip accidental remote override from the parent shell for this process.
Remove-Item Env:ALLOW_REMOTE_TEST_DB -ErrorAction SilentlyContinue

$env:DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/test_db'
$env:ENV = 'test'
if (-not $env:JWT_SECRET_KEY) {
    $env:JWT_SECRET_KEY = 'local-pytest-jwt-secret-key-at-least-32-chars'
}
if (-not $env:OTP_SECRET) {
    $env:OTP_SECRET = 'local-pytest-otp-secret-key-at-least-32-chars'
}
if (-not $env:STRIPE_MOCK) {
    $env:STRIPE_MOCK = 'true'
}
if (-not $env:TEST_ACCOUNT_PASSWORD) {
    $env:TEST_ACCOUNT_PASSWORD = 'demo1234'
}

Write-Host ''
Write-Host '=== Invoke-BackendPytest (safe local DB) ===' -ForegroundColor Cyan
Write-Host '  DATABASE_URL host : 127.0.0.1'
Write-Host '  DATABASE_URL db   : test_db'
Write-Host '  (overrides backend/.env for this process only)'
Write-Host '============================================' -ForegroundColor Cyan
Write-Host ''

$pytestArgs = $args
if ($pytestArgs.Count -eq 0) {
    $pytestArgs = @('tests/', '-v', '--tb=short')
}

python -m pytest @pytestArgs
exit $LASTEXITCODE
