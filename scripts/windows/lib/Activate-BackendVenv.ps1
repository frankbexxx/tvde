# Activate backend venv and set location to backend/.
function Enter-TvdeBackend {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot
    )
    $backend = Join-Path $RepoRoot 'backend'
    Set-Location $backend
    $venvActivate = Join-Path $backend 'venv\Scripts\Activate.ps1'
    if (Test-Path -LiteralPath $venvActivate) {
        . $venvActivate
    } else {
        Write-Warning "venv nao encontrado em $venvActivate — cria o venv antes de continuar."
    }
}
