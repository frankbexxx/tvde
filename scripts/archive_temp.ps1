# Arquivar exports temporários (unified_payments, logs) para archive/
# Executar periodicamente (ex.: mensal). Uso: .\scripts\archive_temp.ps1

$ErrorActionPreference = "Stop"
$root = (Get-Item $PSScriptRoot).Parent.FullName
$archiveDir = Join-Path $root "archive"
$logsDir = Join-Path $root "logs"
$date = Get-Date -Format "yyyy-MM-dd"

$moved = 0

# unified_payments.csv
$csv = Join-Path $root "unified_payments.csv"
if (Test-Path $csv) {
    $dest = Join-Path $archiveDir "unified_payments_$date.csv"
    Move-Item $csv $dest -Force
    Write-Host "Arquivado: unified_payments.csv -> archive/unified_payments_$date.csv"
    $moved++
}

# logs/*.txt, logs/*.csv
if (Test-Path $logsDir) {
    $logArchive = Join-Path $archiveDir "logs_$date"
    if (-not (Test-Path $logArchive)) {
        New-Item -ItemType Directory -Path $logArchive -Force | Out-Null
    }
    Get-ChildItem $logsDir -File | ForEach-Object {
        Move-Item $_.FullName (Join-Path $logArchive $_.Name) -Force
        Write-Host "Arquivado: logs/$($_.Name) -> archive/logs_$date/"
        $moved++
    }
}

# tmp/, temp/ — apagar (não arquivar)
foreach ($d in @("tmp", "temp")) {
    $path = Join-Path $root $d
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Limpo: $d/"
        $moved++
    }
}

if ($moved -eq 0) {
    Write-Host "Nada para arquivar."
} else {
    Write-Host "Feito. $moved operacoes."
}
