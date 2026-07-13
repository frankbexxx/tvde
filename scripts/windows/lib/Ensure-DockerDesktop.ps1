# Wait for Docker daemon; start Docker Desktop if needed.
function Ensure-DockerDesktop {
    param(
        [int]$TimeoutSeconds = 120,
        [int]$PollSeconds = 3
    )

    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'docker CLI nao encontrado no PATH.'
    }

    function Test-DockerReady {
        docker info 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    }

    if (Test-DockerReady) {
        Write-Host 'Docker daemon: OK' -ForegroundColor Green
        return
    }

    $dockerExe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (Test-Path -LiteralPath $dockerExe) {
        Write-Host 'A arrancar Docker Desktop...' -ForegroundColor Yellow
        Start-Process -FilePath $dockerExe | Out-Null
    } else {
        Write-Warning "Docker Desktop nao encontrado em: $dockerExe"
    }

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-DockerReady) {
            Write-Host 'Docker daemon: pronto' -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds $PollSeconds
    }

    throw "Docker daemon nao respondeu em ${TimeoutSeconds}s. Inicia Docker Desktop manualmente."
}
