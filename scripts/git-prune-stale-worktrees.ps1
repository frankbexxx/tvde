# Opcao B: limpar referencias Git a worktrees cujas pastas ja nao existem.
# Executar: .\scripts\git-prune-stale-worktrees.ps1 (na raiz do repo)

$ErrorActionPreference = "Stop"
$MainRepo = "C:\dev\APP"

if (-not (Test-Path (Join-Path $MainRepo ".git"))) {
    Write-Host "ERRO: Nao encontrei $MainRepo\.git — edita `$MainRepo neste script."
    exit 1
}

Push-Location $MainRepo
try {
    Write-Host "=== Antes (git worktree list) ==="
    git worktree list

    Write-Host ""
    Write-Host "=== git worktree prune --dry-run -v ==="
    git worktree prune --dry-run -v 2>&1

    Write-Host ""
    Write-Host "=== git worktree prune -v ==="
    git worktree prune -v 2>&1

    Write-Host ""
    Write-Host "=== Depois (git worktree list) ==="
    git worktree list
} finally {
    Pop-Location
}
