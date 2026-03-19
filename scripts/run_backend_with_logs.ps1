# A008: Arranca backend com logs visíveis no terminal
# 1 comando -> backend + logs visíveis
# Executar a partir da raiz do projeto: .\scripts\run_backend_with_logs.ps1

$ErrorActionPreference = "Stop"
$backendDir = Join-Path $PSScriptRoot ".." "backend"

if (-not (Test-Path $backendDir)) {
    Write-Host "ERRO: pasta backend nao encontrada em $backendDir" -ForegroundColor Red
    exit 1
}

$venvPython = Join-Path $backendDir "venv" "Scripts" "python.exe"
$venvActivate = Join-Path $backendDir "venv" "Scripts" "Activate.ps1"

if (Test-Path $venvActivate) {
    Write-Host "A ativar venv..." -ForegroundColor Cyan
    & $venvActivate
}

Set-Location $backendDir

# Garantir que logs sao visiveis (uvicorn mostra stdout por defeito)
Write-Host "A arrancar uvicorn (logs no terminal)..." -ForegroundColor Green
python -m uvicorn app.main:app --reload --port 8000
