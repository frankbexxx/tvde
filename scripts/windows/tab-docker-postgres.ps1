# Postgres tab: venv + Docker Desktop + 10s + docker start only
$ErrorActionPreference = "Continue"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location (Join-Path $root "backend")
if (Test-Path ".\venv\Scripts\Activate.ps1") {
    . ".\venv\Scripts\Activate.ps1"
}

$dockerExe = Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe"
if (Test-Path -LiteralPath $dockerExe) {
    Start-Process -FilePath $dockerExe
}
Start-Sleep -Seconds 10
docker start ride_postgres
