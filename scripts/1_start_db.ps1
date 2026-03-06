# Inicia o contentor PostgreSQL para o projeto TVDE
# Executar a partir da raiz do projeto: .\scripts\1_start_db.ps1

$ErrorActionPreference = "Stop"
$containerName = "ride_postgres"

Write-Host "Verificando Docker..." -ForegroundColor Cyan
docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Docker nao esta a correr. Abre o Docker Desktop e espera 1-2 min." -ForegroundColor Red
    exit 1
}

Write-Host "Verificando contentor $containerName..." -ForegroundColor Cyan
$existing = docker ps -a --filter "name=$containerName" --format "{{.Names}}" 2>$null
if ($existing -eq $containerName) {
    $running = docker ps --filter "name=$containerName" --format "{{.Names}}" 2>$null
    if ($running -eq $containerName) {
        Write-Host "Contentor ja esta a correr." -ForegroundColor Green
        exit 0
    }
    Write-Host "A iniciar contentor existente..." -ForegroundColor Yellow
    docker start $containerName
} else {
    Write-Host "A criar contentor novo..." -ForegroundColor Yellow
    docker run --name $containerName -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ride_db -p 5432:5432 -d postgres
}

Write-Host "A esperar 8 segundos para o PostgreSQL iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

$check = docker exec $containerName pg_isready -U postgres -d ride_db 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "PostgreSQL pronto." -ForegroundColor Green
} else {
    Write-Host "AVISO: PostgreSQL pode ainda nao estar pronto. Espera mais 5 s e verifica com: docker exec $containerName pg_isready -U postgres -d ride_db" -ForegroundColor Yellow
}
