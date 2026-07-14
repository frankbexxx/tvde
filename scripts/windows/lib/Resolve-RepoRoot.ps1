# Resolve TVDE repo root from scripts/windows or scripts/windows/lib.
function Get-TvdeRepoRoot {
    param(
        [string]$FromPath = $PSScriptRoot
    )
    $dir = $FromPath
    while ($dir) {
        $hasBackend = Test-Path (Join-Path $dir 'backend')
        $hasWebApp = Test-Path (Join-Path $dir 'web-app')
        if ($hasBackend -and $hasWebApp) {
            return (Resolve-Path $dir).Path
        }
        $parent = Split-Path -Parent $dir
        if (-not $parent -or $parent -eq $dir) {
            break
        }
        $dir = $parent
    }
    throw "Nao foi possivel resolver a raiz do repo a partir de: $FromPath"
}
