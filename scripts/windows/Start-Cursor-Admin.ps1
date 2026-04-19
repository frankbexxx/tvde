# Inicia o Cursor com elevacao (UAC). Ajusta o caminho se a tua instalacao for outra.
$ErrorActionPreference = "Stop"
$candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\cursor\Cursor.exe"),
    (Join-Path ${env:ProgramFiles} "Cursor\Cursor.exe")
)
$exe = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $exe) {
    Write-Error "Cursor.exe nao encontrado. Procura em `$env:LOCALAPPDATA\Programs\cursor\"
    exit 1
}
Start-Process -FilePath $exe -Verb RunAs
