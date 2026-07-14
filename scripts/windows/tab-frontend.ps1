# Frontend_Dev — web-app (nao backend).
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
$webApp = Join-Path $root 'web-app'
Set-Location $webApp

Write-Host ''
Write-Host '=== Frontend_Dev ===' -ForegroundColor Cyan
Write-Host "PWD: $webApp"
Write-Host ''
Write-Host 'Exemplo arranque manual:'
Write-Host '  npm install   # se necessario'
Write-Host '  npm run dev'
Write-Host ''
