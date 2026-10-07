# Supervised stripe listen — PID, session, heartbeat, restart, probe.
function Write-TvdeStripeListenJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [hashtable]$Payload
    )
    . (Join-Path $PSScriptRoot 'Get-TvdeDevLocalPaths.ps1')
    $path = Get-TvdeStripeListenJsonPath -RepoRoot $RepoRoot
    $dir = Split-Path -Parent $path
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $tmp = "$path.tmp"
    ($Payload | ConvertTo-Json -Compress) | Set-Content -LiteralPath $tmp -Encoding utf8 -NoNewline
    Move-Item -LiteralPath $tmp -Destination $path -Force
}

function Invoke-TvdeStripeE2EProbeHttp {
    param(
        [string]$BackendBase = 'http://127.0.0.1:8000',
        [int]$TimeoutSec = 90
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            return Invoke-RestMethod -Method POST -Uri "$BackendBase/dev/stripe-e2e/probe" -TimeoutSec 60
        } catch {
            if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 503) {
                Start-Sleep -Seconds 2
                continue
            }
            Start-Sleep -Seconds 2
        }
    }
    throw 'Probe HTTP falhou — backend nao respondeu ou probe nao passou.'
}

function Invoke-TvdeStripeListenSupervisor {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [string]$ForwardTo = 'http://127.0.0.1:8000/webhooks/stripe',
        [int]$MaxRestarts = 8
    )

    . (Join-Path $PSScriptRoot 'Get-TvdeDevLocalPaths.ps1')

    if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
        Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
            state = 'failed'; detail = 'stripe_cli_missing'; session_id = $null; pid = 0
            started_at = (Get-Date).ToUniversalTime().ToString('o')
            heartbeat_at = (Get-Date).ToUniversalTime().ToString('o')
            forward_url = $ForwardTo; whsec_session_id = $null
        }
        throw 'stripe CLI nao encontrado.'
    }

    $secretPath = Get-TvdeStripeWebhookSecretPath -RepoRoot $RepoRoot
    $probePath = Get-TvdeStripeE2EProbePath -RepoRoot $RepoRoot
    $restarts = 0

    while ($restarts -le $MaxRestarts) {
        $sessionId = [guid]::NewGuid().ToString('N')
        if (Test-Path -LiteralPath $probePath) { Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue }
        if (Test-Path -LiteralPath $secretPath) { Remove-Item -LiteralPath $secretPath -Force -ErrorAction SilentlyContinue }

        $startedAt = (Get-Date).ToUniversalTime().ToString('o')
        Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
            session_id         = $sessionId
            pid                = 0
            started_at         = $startedAt
            heartbeat_at       = $startedAt
            state              = 'starting'
            forward_url        = $ForwardTo
            whsec_session_id   = $null
            detail             = 'stripe_listen_starting'
        }

        $whsecWritten = $false
        $probeDone = $false
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = 'stripe'
        $psi.Arguments = "listen --forward-to $ForwardTo"
        $psi.UseShellExecute = $false
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.CreateNoWindow = $true

        $proc = New-Object System.Diagnostics.Process
        $proc.StartInfo = $psi
        if (-not $proc.Start()) {
            throw 'Falha ao arrancar stripe listen.'
        }

        Write-Host "[TVDE] stripe listen PID=$($proc.Id) session=$sessionId" -ForegroundColor Cyan

        $readerOut = $proc.StandardOutput
        $readerErr = $proc.StandardError
        $lastHeartbeat = Get-Date

        while (-not $proc.HasExited) {
            while ($readerOut.Peek() -ge 0) {
                $line = $readerOut.ReadLine()
                if ($line) {
                    Write-Host $line
                    if (-not $whsecWritten -and $line -match '(whsec_[A-Za-z0-9]+)') {
                        $sec = $Matches[1]
                        Set-Content -LiteralPath $secretPath -Value $sec -Encoding utf8 -NoNewline
                        $whsecWritten = $true
                        $now = (Get-Date).ToUniversalTime().ToString('o')
                        Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
                            session_id       = $sessionId
                            pid              = $proc.Id
                            started_at       = $startedAt
                            heartbeat_at     = $now
                            state            = 'ready'
                            forward_url      = $ForwardTo
                            whsec_session_id = $sessionId
                            detail           = 'forwarding'
                        }
                        Write-Host '[TVDE] whsec publicado para sessao actual (prefixo whsec_***).' -ForegroundColor Green
                    }
                }
            }
            while ($readerErr.Peek() -ge 0) {
                $line = $readerErr.ReadLine()
                if ($line) {
                    Write-Host $line
                    if (-not $whsecWritten -and $line -match '(whsec_[A-Za-z0-9]+)') {
                        $sec = $Matches[1]
                        Set-Content -LiteralPath $secretPath -Value $sec -Encoding utf8 -NoNewline
                        $whsecWritten = $true
                        $now = (Get-Date).ToUniversalTime().ToString('o')
                        Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
                            session_id       = $sessionId
                            pid              = $proc.Id
                            started_at       = $startedAt
                            heartbeat_at     = $now
                            state            = 'ready'
                            forward_url      = $ForwardTo
                            whsec_session_id = $sessionId
                            detail           = 'forwarding'
                        }
                        Write-Host '[TVDE] whsec publicado para sessao actual (prefixo whsec_***).' -ForegroundColor Green
                    }
                }
            }

            if ($whsecWritten -and ((Get-Date) - $lastHeartbeat).TotalSeconds -ge 5) {
                $now = (Get-Date).ToUniversalTime().ToString('o')
                Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
                    session_id       = $sessionId
                    pid              = $proc.Id
                    started_at       = $startedAt
                    heartbeat_at     = $now
                    state            = 'ready'
                    forward_url      = $ForwardTo
                    whsec_session_id = $sessionId
                    detail           = 'forwarding'
                }
                $lastHeartbeat = Get-Date
            }

            if ($whsecWritten -and -not $probeDone) {
                try {
                    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3
                    if ($h.status -eq 'ok') {
                        $null = Invoke-TvdeStripeE2EProbeHttp -TimeoutSec 90
                        $probeDone = $true
                        Write-Host '[TVDE] Stripe E2E probe OK nesta sessao.' -ForegroundColor Green
                    }
                } catch {
                    # backend ainda a arrancar ou probe pendente
                }
            }

            Start-Sleep -Milliseconds 300
        }

        if (-not $whsecWritten) {
            Write-Host '[TVDE] stripe listen terminou sem whsec.' -ForegroundColor Red
        } else {
            Write-Host "[TVDE] stripe listen terminou (exit=$($proc.ExitCode)) — a reiniciar..." -ForegroundColor Yellow
        }

        Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
            session_id       = $sessionId
            pid              = 0
            started_at       = $startedAt
            heartbeat_at     = (Get-Date).ToUniversalTime().ToString('o')
            state            = 'restarting'
            forward_url      = $ForwardTo
            whsec_session_id = $null
            detail           = "exit_$($proc.ExitCode)"
        }
        if (Test-Path -LiteralPath $probePath) { Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue }
        if (Test-Path -LiteralPath $secretPath) { Remove-Item -LiteralPath $secretPath -Force -ErrorAction SilentlyContinue }

        $restarts++
        $backoff = [Math]::Min(30, 2 * $restarts)
        Start-Sleep -Seconds $backoff
    }

    Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
        state = 'failed'; detail = 'max_restarts'; session_id = $null; pid = 0
        started_at = (Get-Date).ToUniversalTime().ToString('o')
        heartbeat_at = (Get-Date).ToUniversalTime().ToString('o')
        forward_url = $ForwardTo; whsec_session_id = $null
    }
    throw 'Supervisor stripe listen esgotou restarts.'
}
