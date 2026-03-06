# Recolhe todos os dados do teste para analise
# Executar APOS parar o simulador (Ctrl+C). Guarda em logs/ e unified_payments.csv
# Executar: .\scripts\3_collect_data.ps1

$ErrorActionPreference = "Stop"
$root = (Get-Item $PSScriptRoot).Parent.FullName
$logsDir = Join-Path $root "logs"
$outDir = Join-Path $root "logs"
$csvPath = Join-Path $root "unified_payments.csv"
$containerName = "ride_postgres"

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportPath = Join-Path $outDir "test_report_$timestamp.txt"

Write-Host "A recolher dados do teste..." -ForegroundColor Cyan

$report = @()
$report += "=========================================="
$report += "RELATORIO DO TESTE - $timestamp"
$report += "=========================================="
$report += ""

# 1. Viagens por estado
$report += "--- VIAGENS POR ESTADO ---"
$q1 = "SELECT status || '|' || COUNT(*) FROM trips WHERE created_at >= CURRENT_DATE GROUP BY status ORDER BY COUNT(*) DESC;"
$tripsByStatus = docker exec $containerName psql -U postgres -d ride_db -t -A -c $q1 2>$null
$report += $tripsByStatus
$report += ""

# 2. Resumo completo
$report += "--- RESUMO COMPLETO ---"
$q2 = "SELECT 'total_trips=' || COUNT(*) || ', requested=' || COUNT(*) FILTER (WHERE status='requested') || ', assigned=' || COUNT(*) FILTER (WHERE status='assigned') || ', accepted=' || COUNT(*) FILTER (WHERE status='accepted') || ', arriving=' || COUNT(*) FILTER (WHERE status='arriving') || ', ongoing=' || COUNT(*) FILTER (WHERE status='ongoing') || ', completed=' || COUNT(*) FILTER (WHERE status='completed') || ', cancelled=' || COUNT(*) FILTER (WHERE status='cancelled') || ', failed=' || COUNT(*) FILTER (WHERE status='failed') FROM trips WHERE created_at >= CURRENT_DATE;"
$summary = docker exec $containerName psql -U postgres -d ride_db -t -A -c $q2 2>$null
$report += $summary
$report += ""

# 3. Export CSV (usar ficheiro temp para evitar problemas com argumentos longos no PowerShell)
$report += "--- EXPORT CSV ---"
$csvSql = @"
COPY (
  SELECT t.id, t.status, t.estimated_price, t.final_price, t.created_at, t.completed_at,
         p.id AS payment_id, p.status AS payment_status, p.total_amount, p.commission_amount,
         p.driver_payout, p.stripe_payment_intent_id, p.created_at AS payment_created
  FROM trips t
  LEFT JOIN payments p ON p.trip_id = t.id
  WHERE t.created_at >= CURRENT_DATE
  ORDER BY t.created_at
) TO STDOUT WITH CSV HEADER
"@
$tmpSql = Join-Path $env:TEMP "tvde_export_$timestamp.sql"
$csvSql | Out-File -FilePath $tmpSql -Encoding utf8
docker cp $tmpSql "${containerName}:/tmp/export.sql" 2>$null | Out-Null
$csvData = docker exec $containerName psql -U postgres -d ride_db -t -A -f /tmp/export.sql 2>$null
if ($csvData) {
    $csvData | Out-File -FilePath $csvPath -Encoding utf8
} else {
    "trip_id,trip_status,estimated_price,final_price,trip_created,completed_at,payment_id,payment_status,total_amount,commission_amount,driver_payout,stripe_payment_intent_id,payment_created" | Out-File -FilePath $csvPath -Encoding utf8
}
Remove-Item $tmpSql -Force -ErrorAction SilentlyContinue

$report += "CSV guardado em: $csvPath"
$report += ""

# Gravar relatorio
$report | Out-File -FilePath $reportPath -Encoding utf8

Write-Host "Relatorio guardado em: $reportPath" -ForegroundColor Green
Write-Host "CSV guardado em: $csvPath" -ForegroundColor Green
Write-Host ""
Write-Host "Para enviar para analise, copia:" -ForegroundColor Yellow
Write-Host "  1. Conteudo de $reportPath"
Write-Host "  2. Conteudo de logs/simulator_result_*.txt (mais recente)"
Write-Host "  3. Output do Stripe CLI (janela do stripe listen)"
Write-Host "  4. Output do Backend (janela do uvicorn)"
Write-Host "  5. (Opcional) unified_payments.csv"
