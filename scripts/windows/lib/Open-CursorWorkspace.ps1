# Open Cursor on repo workspace (detached GUI — no console inheritance).
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

    $resolvedRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

    # UseShellExecute detaches from the launching console (avoids node logs in cmd.exe).
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $exe
    $startInfo.Arguments = "`"$resolvedRoot`""
    $startInfo.WorkingDirectory = $resolvedRoot
    $startInfo.UseShellExecute = $true
    [System.Diagnostics.Process]::Start($startInfo) | Out-Null
}
