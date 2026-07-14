# Docker Desktop + ride_postgres container.
. (Join-Path $PSScriptRoot 'Ensure-DockerDesktop.ps1')

function Ensure-PostgresContainer {
    param(
        [string]$ContainerName = 'ride_postgres'
    )

    Ensure-DockerDesktop

    Write-Host "A arrancar container $ContainerName ..." -ForegroundColor Cyan
    docker start $ContainerName 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "docker start $ContainerName falhou (exit $LASTEXITCODE). Verifica se o container existe."
    }

    Write-Host "`nContainers Postgres:" -ForegroundColor Cyan
    docker ps --filter "name=$ContainerName"
}
