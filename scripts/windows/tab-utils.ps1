# Utils_Dev — repo root, git/alembic hints + painel ambiente.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Show-TvdeDevEnvironmentStatus.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Set-Location $root

Write-Host ''
Write-Host '=== Utils_Dev ===' -ForegroundColor Cyan
Write-Host "PWD: $root"
Write-Host ''
Write-Host 'Comandos uteis:'
Write-Host '  git status'
Write-Host '  cd backend; alembic upgrade head'
Write-Host '  cd web-app; npm run build'
Write-Host ''
Write-Host 'Painel ambiente (actualiza a cada 15s; Ctrl+C para parar o loop):'
Write-Host ''

while ($true) {
    Show-TvdeDevEnvironmentStatus -RepoRoot $root
    Start-Sleep -Seconds 15
}
