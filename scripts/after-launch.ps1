<#
.SYNOPSIS
    Create the first admin account and take the first backup.

.DESCRIPTION
    What to do once the site answers on its public URL and before anyone else
    touches it. Two things, in one command.

    First, an admin account. Signing up through the site needs a mailer to
    deliver the verification link, and before an email provider is configured
    that link goes to the container log - a miserable way to make your first
    account. This creates one directly in the database, already verified,
    because someone with shell access has nothing left to prove about owning
    the address.

    Second, a backup. There is now a Docker volume holding real data, and until
    a copy of it exists somewhere else, one dying disk is the end of the
    project.

.PARAMETER Email
    The address for the admin account. Prompted for if omitted.

.PARAMETER SkipAdmin
    Only take the backup. Use this on later runs, once the account exists.

.EXAMPLE
    .\scripts\after-launch.ps1

.EXAMPLE
    .\scripts\after-launch.ps1 -Email you@example.com
#>
[CmdletBinding()]
param(
    [string]$Email,
    [switch]$SkipAdmin
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $projectRoot "compose.production.yaml"
$envPath     = Join-Path $projectRoot ".env.production"

function Write-Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "  [x] $m" -ForegroundColor Green }

if (-not (Test-Path -LiteralPath $composeFile)) { throw "No compose.production.yaml in $projectRoot." }

Push-Location $projectRoot
try {
    # The app must be running: both steps execute inside the container, against
    # the volume, not against any database on the host.
    $running = docker compose -f $composeFile ps --status running --services 2>$null
    if ($running -notcontains "app") {
        throw "The app container is not running. Start it with .\scripts\go-live.ps1 first."
    }

    # ----------------------------------------------------------------------- #
    # 1. First admin
    # ----------------------------------------------------------------------- #
    if (-not $SkipAdmin) {
        Write-Step "Creating the first admin account"
        if (-not $Email) {
            $Email = (Read-Host "  Email for the admin account").Trim()
        }
        if (-not $Email) { throw "An email address is required." }

        Write-Host "  You will be asked for a password twice. It is not echoed."
        Write-Host "  It never appears on the command line, so it stays out of shell history."

        # -it so getpass can reach a real terminal inside the container.
        docker compose -f $composeFile exec -it app python manage.py create-admin $Email
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "  The account was not created. If it already exists, grant admin with:" -ForegroundColor Yellow
            Write-Host "    docker compose -f compose.production.yaml exec app python manage.py make-admin $Email"
        } else {
            Write-Ok "Admin account created and verified"
        }
    }

    # ----------------------------------------------------------------------- #
    # 2. First backup
    # ----------------------------------------------------------------------- #
    Write-Step "Taking a backup"
    & (Join-Path $PSScriptRoot "backup.ps1")
    if ($LASTEXITCODE -ne 0) { throw "The backup failed. Do not skip this; fix it now." }

    # ----------------------------------------------------------------------- #
    # What is left
    # ----------------------------------------------------------------------- #
    $publicUrl = ""
    $consoleEmail = $false
    if (Test-Path -LiteralPath $envPath) {
        foreach ($line in Get-Content -LiteralPath $envPath) {
            if ($line -match '^\s*PUBLIC_URL\s*=\s*(\S+)\s*$') { $publicUrl = $Matches[1] }
            if ($line -match '^\s*ALLOW_CONSOLE_EMAIL\s*=\s*(1|true|yes)\s*$') { $consoleEmail = $true }
        }
    }

    Write-Step "Done"
    if ($publicUrl) {
        Write-Host "  Sign in at $publicUrl/login" -ForegroundColor Green
        Write-Host "  Admin console at $publicUrl/admin"
    }
    Write-Host ""
    Write-Host "  Copy the backup file off this machine. A backup sitting beside the live"
    Write-Host "  volume does not survive the disk dying, which is the case it exists for."

    if ($consoleEmail) {
        Write-Host ""
        Write-Host "  ALLOW_CONSOLE_EMAIL is still set, so no mail is delivered." -ForegroundColor Yellow
        Write-Host "  Nobody but you can verify an address or reset a password. Configure a"
        Write-Host "  provider, remove that line from .env.production, and run go-live.ps1"
        Write-Host "  again before telling anyone the site exists."
    }
}
finally {
    Pop-Location
}
