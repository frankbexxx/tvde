# Postgres_Local — Docker Desktop + ride_postgres.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Ensure-PostgresContainer.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot

Write-Host ''
Write-Host '=== Postgres_Local ===' -ForegroundColor Cyan
Write-Host "Repo: $root"
Write-Host ''

Ensure-PostgresContainer -ContainerName 'ride_postgres'

Write-Host ''
Write-Host 'DATABASE_URL local tipica:'
Write-Host '  postgresql+psycopg2://postgres:postgres@127.0.0.1:5432/ride_db'
Write-Host ''
