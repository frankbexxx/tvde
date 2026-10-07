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
    $script:StripeProbeJob = $null

    while ($restarts -le $MaxRestarts) {
        if ($script:StripeProbeJob) {
            Stop-Job -Job $script:StripeProbeJob -ErrorAction SilentlyContinue
            Remove-Job -Job $script:StripeProbeJob -Force -ErrorAction SilentlyContinue
            $script:StripeProbeJob = $null
        }
        $sessionId = [guid]::NewGuid().ToString('N')
        if (Test-Path -LiteralPath $probePath) { Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue }
        if (Test-Path -LiteralPath $secretPath) { Remove-Item -LiteralPath $secretPath -Force -ErrorAction SilentlyContinue }
        Get-Process -Name stripe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500

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
        $listenPid = 0
        $lastHeartbeat = Get-Date

        # Pipeline 2>&1 (como Start-TvdeStripeListen): Redirect+Peek no Windows nao recebe whsec.
        $listenJob = Start-Job -ScriptBlock {
            param($ForwardTo)
            stripe listen --forward-to $ForwardTo 2>&1
        } -ArgumentList $ForwardTo

        Start-Sleep -Milliseconds 800
        $stripeProc = Get-Process -Name stripe -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1
        if ($stripeProc) {
            $listenPid = $stripeProc.Id
            Write-Host "[TVDE] stripe listen PID=$listenPid session=$sessionId" -ForegroundColor Cyan
        }

        while ($listenJob.State -eq 'Running') {
            $lines = Receive-Job -Job $listenJob -ErrorAction SilentlyContinue
            foreach ($item in @($lines)) {
                if (-not $item) { continue }
                $line = $item.ToString()
                Write-Host $line
                if (-not $whsecWritten -and $line -match '(whsec_[A-Za-z0-9]+)') {
                    $sec = $Matches[1]
                    Set-Content -LiteralPath $secretPath -Value $sec -Encoding utf8 -NoNewline
                    $whsecWritten = $true
                    if (-not $listenPid -and $stripeProc) { $listenPid = $stripeProc.Id }
                    if (-not $listenPid) {
                        $sp = Get-Process -Name stripe -ErrorAction SilentlyContinue | Sort-Object StartTime -Descending | Select-Object -First 1
                        if ($sp) { $listenPid = $sp.Id }
                    }
                    $now = (Get-Date).ToUniversalTime().ToString('o')
                    Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
                        session_id       = $sessionId
                        pid              = $listenPid
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

            if ($whsecWritten -and $listenPid -gt 0 -and ((Get-Date) - $lastHeartbeat).TotalSeconds -ge 5) {
                $now = (Get-Date).ToUniversalTime().ToString('o')
                Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
                    session_id       = $sessionId
                    pid              = $listenPid
                    started_at       = $startedAt
                    heartbeat_at     = $now
                    state            = 'ready'
                    forward_url      = $ForwardTo
                    whsec_session_id = $sessionId
                    detail           = 'forwarding'
                }
                $lastHeartbeat = Get-Date
            }

            if ($whsecWritten -and -not $probeDone -and -not $script:StripeProbeJob) {
                try {
                    $h = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3
                    if ($h.status -eq 'ok') {
                        $script:StripeProbeJob = Start-Job -ScriptBlock {
                            param($BackendBase)
                            $deadline = (Get-Date).AddSeconds(90)
                            while ((Get-Date) -lt $deadline) {
                                try {
                                    return Invoke-RestMethod -Method POST -Uri "$BackendBase/dev/stripe-e2e/probe" -TimeoutSec 75
                                } catch {
                                    Start-Sleep -Seconds 2
                                }
                            }
                            throw 'probe_timeout'
                        } -ArgumentList 'http://127.0.0.1:8000'
                    }
                } catch {
                    # backend ainda a arrancar
                }
            }
            if ($script:StripeProbeJob -and ($script:StripeProbeJob.State -eq 'Completed' -or $script:StripeProbeJob.State -eq 'Failed')) {
                if ($script:StripeProbeJob.State -eq 'Completed') {
                    $probeDone = $true
                    Write-Host '[TVDE] Stripe E2E probe OK nesta sessao.' -ForegroundColor Green
                } else {
                    Write-Host '[TVDE] Stripe E2E probe falhou (retry quando backend estavel).' -ForegroundColor Yellow
                }
                Remove-Job -Job $script:StripeProbeJob -Force -ErrorAction SilentlyContinue
                $script:StripeProbeJob = $null
            }

            Start-Sleep -Milliseconds 300
        }

        $exitCode = 0
        try {
            Stop-Job -Job $listenJob -Force -ErrorAction SilentlyContinue
            $null = Receive-Job -Job $listenJob -Wait -ErrorAction SilentlyContinue
        } catch {
            $exitCode = 1
        }
        Remove-Job -Job $listenJob -Force -ErrorAction SilentlyContinue
        Get-Process -Name stripe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

        if (-not $whsecWritten) {
            Write-Host '[TVDE] stripe listen terminou sem whsec.' -ForegroundColor Red
        } else {
            Write-Host "[TVDE] stripe listen terminou — a reiniciar..." -ForegroundColor Yellow
        }

        Write-TvdeStripeListenJson -RepoRoot $RepoRoot -Payload @{
            session_id       = $sessionId
            pid              = 0
            started_at       = $startedAt
            heartbeat_at     = (Get-Date).ToUniversalTime().ToString('o')
            state            = 'restarting'
            forward_url      = $ForwardTo
            whsec_session_id = $null
            detail           = "exit_$exitCode"
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
