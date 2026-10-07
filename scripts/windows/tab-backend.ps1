# Backend_Dev — venv + uvicorn. Config vem só de backend/.env (sem override de DB).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Activate-BackendVenv.ps1')
. (Join-Path $lib 'Get-TvdeStripeDevEffectiveConfig.ps1')
. (Join-Path $lib 'Wait-TvdeStripeE2EReady.ps1')
. (Join-Path $lib 'Show-TvdeDevEnvironmentStatus.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
$backendDir = Join-Path $root 'backend'
Enter-TvdeBackend -RepoRoot $root

Write-Host ''
Write-Host '=== Backend_Dev ===' -ForegroundColor Cyan
Write-Host 'Config: backend/.env (Postgres local ride_db). Sem override de sessao.'
Write-Host ''

$stripeE2EExpected = $false
try {
    $config = Get-TvdeStripeDevEffectiveConfig -RepoRoot $root
    $stripeE2EExpected = $config.RealStripeTest
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    throw
}

Write-Host ''
Write-Host 'uvicorn app.main:app --reload --host 127.0.0.1 --port 8000'
Write-Host ''

Show-TvdeDevEnvironmentStatus -RepoRoot $root

$venvPython = Join-Path $backendDir 'venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $venvPython)) {
    $venvPython = 'python'
}

$uvicornJob = Start-Job -ScriptBlock {
    Set-Location $using:backendDir
    & $using:venvPython -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 2>&1
}

$healthDeadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $healthDeadline) {
    try {
        $h = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3
        if ($h.status -eq 'ok') { break }
    } catch { }
    Start-Sleep -Seconds 1
}

if ($stripeE2EExpected) {
    Write-Host 'A aguardar Stripe TEST E2E READY (listener + probe)...' -ForegroundColor Cyan
    $wait = Wait-TvdeStripeE2EReady -TimeoutSeconds 300
    if ($wait.ready) {
        Write-Host 'Stripe TEST E2E: READY (operacional nesta sessao).' -ForegroundColor Green
    } else {
        Write-Host "[TVDE] Stripe TEST E2E: NOT READY ($($wait.reason))." -ForegroundColor Red
        Write-Host '       Pagamentos reais nao fecham ate listener+probe OK.' -ForegroundColor Yellow
    }
    Show-TvdeDevEnvironmentStatus -RepoRoot $root
}

try {
    Receive-Job $uvicornJob -Wait
} finally {
    Stop-Job $uvicornJob -ErrorAction SilentlyContinue
    Remove-Job $uvicornJob -ErrorAction SilentlyContinue
}
