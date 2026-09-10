<#
.SYNOPSIS
    First launch: check, build, start, and prove the public URL actually serves.

.DESCRIPTION
    Everything between a filled-in .env.production and a working public site,
    in one command, with the checks worth making at each step rather than a
    hopeful "up -d" followed by squinting at logs.

    The step that matters is the last one. A container can be running, and
    /readyz can be green on loopback, while the public hostname still returns
    nothing because the tunnel route points at the wrong service or the
    hostname does not match TRUSTED_HOSTS. So this fetches the public HTTPS URL
    from the outside and refuses to claim success without a 200.

    Use day-start.ps1 for every day after this one. This script is for the
    first launch, or after changing hostnames or the tunnel.

.PARAMETER Rebuild
    Force a rebuild even if an image already exists.

.PARAMETER TimeoutSeconds
    How long to wait at each waiting step. The first build is not covered by
    this; Compose runs to completion on its own.

.EXAMPLE
    .\scripts\go-live.ps1
#>
[CmdletBinding()]
param(
    [switch]$Rebuild,
    [int]$TimeoutSeconds = 180
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $projectRoot "compose.production.yaml"
$envPath     = Join-Path $projectRoot ".env.production"
$tokenPath   = Join-Path $projectRoot "secrets\cloudflare-tunnel-token.txt"

function Write-Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "  [x] $m" -ForegroundColor Green }
function Write-Bad($m)  { Write-Host "  [ ] $m" -ForegroundColor Yellow }

function Show-Diagnostics {
    Write-Host ""
    Write-Host "Container status:" -ForegroundColor Yellow
    docker compose -f $composeFile ps
    Write-Host ""
    Write-Host "App, last 40 lines:" -ForegroundColor Yellow
    docker compose -f $composeFile logs --tail=40 app
    Write-Host ""
    Write-Host "Tunnel, last 25 lines:" -ForegroundColor Yellow
    docker compose -f $composeFile logs --tail=25 cloudflared
}

# --------------------------------------------------------------------------- #
# 1. Preflight. Refuse to start something that cannot work.
# --------------------------------------------------------------------------- #
Write-Step "Checking configuration"

if (-not (Test-Path -LiteralPath $composeFile)) { throw "No compose.production.yaml in $projectRoot." }
if (-not (Test-Path -LiteralPath $envPath))     { throw "No .env.production. Run .\scripts\setup-production.ps1 first." }
if (-not (Test-Path -LiteralPath $tokenPath) -or (Get-Item -LiteralPath $tokenPath).Length -eq 0) {
    throw "No Cloudflare tunnel token. Run .\scripts\setup-production.ps1 first."
}

$settings = @{}
foreach ($line in (Get-Content -LiteralPath $envPath)) {
    if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $settings[$Matches[1]] = $Matches[2].Trim().Trim('"') }
}

$publicUrl = $settings['PUBLIC_URL']
if (-not $publicUrl) { throw "PUBLIC_URL is not set in .env.production." }
$publicHost = ([Uri]$publicUrl).Host

if ($settings['TRUSTED_HOSTS'] -notmatch [regex]::Escape($publicHost)) {
    throw "TRUSTED_HOSTS ($($settings['TRUSTED_HOSTS'])) does not include $publicHost. The app would reject its own traffic with a 400."
}
Write-Ok "PUBLIC_URL and TRUSTED_HOSTS agree on $publicHost"

# The one that stops the container booting rather than merely misbehaving.
$consoleEmail = $settings['ALLOW_CONSOLE_EMAIL'] -and
                $settings['ALLOW_CONSOLE_EMAIL'] -match '^(1|true|yes)$'
$realMailer = ($settings['EMAIL_BACKEND'] -eq 'smtp' -and $settings['SMTP_HOST'] -and
               $settings['SMTP_HOST'] -notmatch 'example\.com') -or
              ($settings['EMAIL_BACKEND'] -eq 'sendgrid' -and $settings['SENDGRID_API_KEY'] -and
               $settings['SENDGRID_API_KEY'] -notmatch 'replace-with')

if ($realMailer) {
    Write-Ok "A real email provider is configured"
    if ($consoleEmail) {
        Write-Warning "ALLOW_CONSOLE_EMAIL is still set. With it, the console mailer can win over your provider. Remove it."
    }
} elseif ($consoleEmail) {
    Write-Bad "No email provider. Running in smoke-test mode (ALLOW_CONSOLE_EMAIL is set)."
    Write-Host "      Nobody can verify an address or reset a password. Do not take signups." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "No email provider is configured, and ENV=production refuses to boot without one." -ForegroundColor Yellow
    Write-Host "Adding ALLOW_CONSOLE_EMAIL=1 lets it start so you can prove the container and"
    Write-Host "tunnel work. Mail will go to the log instead of to people, so it must be removed"
    Write-Host "before anyone signs up."
    if ((Read-Host "Add ALLOW_CONSOLE_EMAIL=1 for this smoke test? (yes/no)") -ne "yes") {
        throw "Stopped. Configure an email provider, then run this again."
    }
    Add-Content -LiteralPath $envPath -Value "ALLOW_CONSOLE_EMAIL=1"
    Write-Ok "Added ALLOW_CONSOLE_EMAIL=1 (remember to remove it)"
}

# --------------------------------------------------------------------------- #
# 2. Docker engine
# --------------------------------------------------------------------------- #
Write-Step "Waiting for the Docker engine"
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker was not found. Start Docker Desktop, then open a new terminal so PATH is picked up."
}
$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$engineReady = $false
while ((Get-Date) -lt $deadline) {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $engineReady = $true; break }
    Start-Sleep -Seconds 3
}
if (-not $engineReady) { throw "The Docker engine did not respond within $TimeoutSeconds seconds. Is Docker Desktop running?" }
Write-Ok "Docker engine is up"

# --------------------------------------------------------------------------- #
# 3. Build and start
# --------------------------------------------------------------------------- #
Push-Location $projectRoot
try {
    Write-Step "Building and starting (the first build takes a few minutes)"
    if ($Rebuild) {
        docker compose -f $composeFile up -d --build --force-recreate
    } else {
        docker compose -f $composeFile up -d --build
    }
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed. Nothing below ran." }

    # ----------------------------------------------------------------------- #
    # 4. Local readiness. Proves the app works; says nothing about the tunnel.
    # ----------------------------------------------------------------------- #
    Write-Step "Waiting for the app on 127.0.0.1:8000"
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $localReady = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/readyz" -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -eq 200) { $localReady = $true; break }
        } catch { }
        Start-Sleep -Seconds 3
    }
    if (-not $localReady) {
        Write-Bad "The app did not become ready locally."
        Write-Host "      A container that exits immediately is usually a config guard refusing" -ForegroundColor Yellow
        Write-Host "      to boot. The last lines of the app log say which one." -ForegroundColor Yellow
        Show-Diagnostics
        exit 1
    }
    Write-Ok "App is serving locally and /readyz reports ok"

    # ----------------------------------------------------------------------- #
    # 5. The real test: the public URL, end to end through Cloudflare.
    # ----------------------------------------------------------------------- #
    Write-Step "Waiting for $publicUrl to answer from the Internet"
    Write-Host "  This leaves your machine, reaches Cloudflare, and comes back down the tunnel."
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $publicReady = $false
    $lastError = ""
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "$publicUrl/readyz" -UseBasicParsing -TimeoutSec 10
            if ($r.StatusCode -eq 200) { $publicReady = $true; break }
        } catch {
            $lastError = $_.Exception.Message
        }
        Start-Sleep -Seconds 5
    }

    if (-not $publicReady) {
        Write-Bad "The public URL did not answer."
        Write-Host "      Last error: $lastError" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "      The app is fine, so this is the path in front of it. In order of likelihood:" -ForegroundColor Yellow
        Write-Host "        1. The tunnel route's service is not http://app:8000. Inside the"
        Write-Host "           connector container, localhost is the connector, not the app."
        Write-Host "        2. The published hostname is not $publicHost."
        Write-Host "        3. The route was added under Hostname routes or CIDR routes, which"
        Write-Host "           are private-network features. It belongs in Published application routes."
        Write-Host "        4. DNS for $publicHost has not propagated yet. Give it a minute."
        Show-Diagnostics
        exit 1
    }

    Write-Ok "$publicUrl answered from the Internet"

    Write-Step "Live"
    docker compose -f $composeFile ps
    Write-Host ""
    Write-Host "  Public site   $publicUrl" -ForegroundColor Green
    Write-Host "  Health        $publicUrl/readyz"
    Write-Host ""
    Write-Host "  Open it on a phone using mobile data, not your home wifi. That proves the"
    Write-Host "  path really is Internet -> Cloudflare -> tunnel, and not something local."
    Write-Host ""
    if (-not $realMailer) {
        Write-Host "  Still in smoke-test mode: no mail is delivered, so do not take signups." -ForegroundColor Yellow
        Write-Host "  Configure a provider, remove ALLOW_CONSOLE_EMAIL from .env.production, and"
        Write-Host "  run this again."
        Write-Host ""
    }
    Write-Host "  From tomorrow, use .\scripts\day-start.ps1 instead of this script."
}
finally {
    Pop-Location
}
