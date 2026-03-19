# Ir para a pasta backend (relativa ao script)
$backendDir = Join-Path $PSScriptRoot "..\backend"
Set-Location $backendDir

Write-Host ""
Write-Host "=== TEST MODE READY ===" -ForegroundColor Green
Write-Host "1. Criar trip (frontend)"
Write-Host "2. Aceitar como driver"
Write-Host "3. Seguir logs no terminal"
Write-Host "4. No final ver SUMMARY"
Write-Host ""

# Ativar venv (se existir)
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    . .\venv\Scripts\Activate.ps1
}

# Arrancar backend
uvicorn app.main:app --reload
