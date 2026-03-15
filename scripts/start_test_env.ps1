# Arranque do ambiente de teste — TVDE
# Executa: .\scripts\start_test_env.ps1
# Inicia BD, backend e frontend. Verifica endpoints.
# Protocolo: docs/testing/HUMAN_TESTING_PROTOCOL.md

$ErrorActionPreference = "Stop"
$root = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $root

Write-Host "=== TVDE — Arranque do Ambiente de Teste ===" -ForegroundColor Cyan
Write-Host "PROJECT_ROOT: $root" -ForegroundColor Gray
Write-Host ""

# 1. PostgreSQL
Write-Host "1. A iniciar PostgreSQL..." -ForegroundColor Yellow
& "$root\scripts\1_start_db.ps1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: PostgreSQL nao iniciou." -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. Backend (nova janela)
Write-Host "2. A iniciar backend (nova janela)..." -ForegroundColor Yellow
$backendCmd = "cd `"$root\backend`"; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Start-Sleep -Seconds 8
Write-Host ""

# 3. Verificar backend
Write-Host "3. A verificar backend..." -ForegroundColor Yellow
$maxAttempts = 6
$attempt = 0
$backendOk = $false
while ($attempt -lt $maxAttempts) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) {
            $backendOk = $true
            break
        }
    } catch {
        $attempt++
        Write-Host "   Tentativa $attempt/$maxAttempts — a aguardar..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}
if (-not $backendOk) {
    Write-Host "ERRO: Backend nao responde em http://localhost:8000/health" -ForegroundColor Red
    Write-Host "Verifica a janela do backend por erros." -ForegroundColor Yellow
    exit 1
}
Write-Host "   Backend OK." -ForegroundColor Green
Write-Host ""

# 4. Frontend (nova janela)
Write-Host "4. A iniciar frontend (nova janela)..." -ForegroundColor Yellow
$frontendCmd = "cd `"$root\web-app`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Start-Sleep -Seconds 5
Write-Host ""

# 5. Resumo
Write-Host "=== Sistema pronto para testes ===" -ForegroundColor Green
Write-Host ""
Write-Host "URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Simulador: python scripts/driver_simulator.py --drivers 10" -ForegroundColor Gray
Write-Host "Testes: docs/testing/TEST_BOOK_*.md" -ForegroundColor Gray
Write-Host ""
