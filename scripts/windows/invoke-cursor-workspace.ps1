# Thin entrypoint — both WT launchers call lib/Open-CursorWorkspace.ps1.
$ErrorActionPreference = 'Stop'
$lib = Join-Path $PSScriptRoot 'lib'
. (Join-Path $lib 'Resolve-RepoRoot.ps1')
. (Join-Path $lib 'Open-CursorWorkspace.ps1')

$root = Get-TvdeRepoRoot -FromPath $PSScriptRoot
Open-TvdeCursorWorkspace -RepoRoot $root
