<#
.SYNOPSIS
    Bring Catchablepro up and prove it is actually serving.

.DESCRIPTION
    You should not normally need this. Both containers use
    `restart: unless-stopped`, so Docker restarts them after a crash and after
    Docker Desktop itself restarts. What this script really does is answer the
    question that matters at the start of a day — *is the site up?* — instead of
    leaving you to assume it, and it starts the stack if the answer is no.

    It is safe to run when everything is already running: `docker compose up -d`
    is idempotent and will not restart healthy containers.

    The check is the point. A container that is "running" can still be failing
    every request, so this polls /readyz — the endpoint that reports the
    database and uploads directory — and refuses to claim success without a 200.

.PARAMETER Rebuild
    Rebuild the image first. Use this after pulling code changes; skip it
    otherwise, since a rebuild costs minutes and restarts the app.

.PARAMETER TimeoutSeconds
    How long to wait for /readyz to come good. Docker Desktop can take a while
    to start its engine after sign-in, so the default is generous.

.EXAMPLE
    .\scripts\day-start.ps1

.EXAMPLE
    .\scripts\day-start.ps1 -Rebuild
#>
[CmdletBinding()]
param(
    [switch]$Rebuild,
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $projectRoot "compose.production.yaml"
$envFile     = Join-Path $projectRoot ".env.production"
$tokenFile   = Join-Path $projectRoot "secrets\cloudflare-tunnel-token.txt"
$readyUrl    = "http://127.0.0.1:8000/readyz"

function Write-Step($message) { Write-Host "==> $message" }

# --------------------------------------------------------------------------- #
# Refuse to start rather than start wrong
# --------------------------------------------------------------------------- #
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker was not found. Install Docker Desktop and sign in to Windows first."
}
if (-not (Test-Path -LiteralPath $composeFile)) {
    throw "Could not find compose.production.yaml in $projectRoot."
}
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing .env.production. Copy .env.production.example and fill it in."
}
if (-not (Test-Path -LiteralPath $tokenFile)) {
    throw "Missing secrets\cloudflare-tunnel-token.txt. Without it the tunnel cannot connect and the site stays private."
}

# --------------------------------------------------------------------------- #
# Wait for the engine. After a reboot the script often wins the race against
# Docker Desktop, and "cannot connect to the Docker daemon" reads like a broken
# install rather than "not awake yet".
# --------------------------------------------------------------------------- #
Write-Step "Waiting for the Docker engine"
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$engineReady = $false
while ((Get-Date) -lt $deadline) {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $engineReady = $true; break }
    Start-Sleep -Seconds 3
}
if (-not $engineReady) {
    throw "The Docker engine did not become available within $TimeoutSeconds seconds. Is Docker Desktop set to start when you sign in?"
}

# --------------------------------------------------------------------------- #
# Start (or leave alone) the stack
# --------------------------------------------------------------------------- #
Push-Location $projectRoot
try {
    if ($Rebuild) {
        Write-Step "Rebuilding the image and starting the stack"
        docker compose -f $composeFile up -d --build
    } else {
        Write-Step "Starting the stack (no-op if it is already up)"
        docker compose -f $composeFile up -d
    }
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed." }

    # ----------------------------------------------------------------------- #
    # Prove it serves. "Running" is not "working".
    # ----------------------------------------------------------------------- #
    Write-Step "Waiting for $readyUrl to report ok"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $readyUrl -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch {
            # Still booting, or readiness is reporting 503. Either way, wait.
        }
        Start-Sleep -Seconds 3
    }

    if (-not $ready) {
        Write-Warning "Catchablepro did not become ready within $TimeoutSeconds seconds."
        Write-Host ""
        Write-Host "Container status:"
        docker compose -f $composeFile ps
        Write-Host ""
        Write-Host "Last 40 lines from the app:"
        docker compose -f $composeFile logs --tail=40 app
        Write-Host ""
        Write-Host "Last 20 lines from the tunnel:"
        docker compose -f $composeFile logs --tail=20 cloudflared
        Write-Host ""
        Write-Host "Start at section 1 of docs/runbook.md; /readyz names the failing dependency."
        exit 1
    }

    Write-Step "Catchablepro is serving"
    docker compose -f $composeFile ps

    # The public hostname is the one users actually visit, so print it rather
    # than making someone open the env file to remember it.
    $publicUrl = ""
    foreach ($line in Get-Content -LiteralPath $envFile) {
        if ($line -match '^\s*PUBLIC_URL\s*=\s*(\S+)\s*$') { $publicUrl = $Matches[1] }
    }

    Write-Host ""
    Write-Host "  Local health check   $readyUrl"
    if ($publicUrl) {
        Write-Host "  Public site          $publicUrl"
    }
    Write-Host ""
    Write-Host "Sign-in only works at the public HTTPS URL: session cookies are"
    Write-Host "Secure in production, so a browser will not return them over"
    Write-Host "http://127.0.0.1. The loopback address is for health checks."
}
finally {
    Pop-Location
}
