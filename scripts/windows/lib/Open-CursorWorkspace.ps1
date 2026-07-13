# Open Cursor on repo workspace (no elevation).
function Open-TvdeCursorWorkspace {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'),
        (Join-Path ${env:ProgramFiles} 'Cursor\Cursor.exe')
    )
    $exe = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $exe) {
        Write-Warning 'Cursor.exe nao encontrado — abre o workspace manualmente.'
        return
    }

    Start-Process -FilePath $exe -ArgumentList @($RepoRoot) | Out-Null
    Write-Host "Cursor: $RepoRoot" -ForegroundColor DarkGray
}
