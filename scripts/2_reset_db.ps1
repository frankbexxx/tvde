# Reseta viagens e pagamentos (TRUNCATE) via API do backend
# O backend deve estar a correr. Executar: .\scripts\2_reset_db.ps1

$ErrorActionPreference = "Stop"
$url = "http://localhost:8000/dev/reset"

Write-Host "A enviar POST para $url ..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $url -Method Post -TimeoutSec 5
    Write-Host "Reset OK: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "ERRO: 404 - Endpoint /dev/reset nao existe. Verifica ENV=dev no backend/.env" -ForegroundColor Red
    } elseif ($_.Exception.Message -match "connection refused|Unable to connect") {
        Write-Host "ERRO: Backend nao esta a correr. Inicia com: cd backend; uvicorn app.main:app --reload --port 8000" -ForegroundColor Red
    } else {
        Write-Host "ERRO: $_" -ForegroundColor Red
    }
    exit 1
}
