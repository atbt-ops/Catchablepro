<#
.SYNOPSIS
    Configure an email provider, prove it works, then stop pretending.

.DESCRIPTION
    Until outbound email works, nobody but you can hold an account: signup
    verification and password reset are the only paths that send mail, and both
    fail silently from the user's side. They see "check your inbox" either way.

    The order here is the point. The provider settings are written first and a
    real test message is sent while ALLOW_CONSOLE_EMAIL is still in place. Only
    once that message is accepted is the flag removed. Doing it the other way
    round means a wrong password leaves you with a container that refuses to
    boot and a site that is down.

    What this cannot do: create your provider account, or add the SPF and DKIM
    records to your DNS. Both need your own logins, and without the DNS records
    your mail will be accepted by the provider and dropped in spam by the
    recipient.

.PARAMETER TestAddress
    Where to send the proving message. Prompted for if omitted. Use an inbox on
    a different provider than your own domain - Gmail is ideal - so you learn
    what a stranger's mail server makes of it.

.EXAMPLE
    .\scripts\setup-email.ps1
#>
[CmdletBinding()]
param([string]$TestAddress)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $projectRoot "compose.production.yaml"
$envPath     = Join-Path $projectRoot ".env.production"

function Write-Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "  [x] $m" -ForegroundColor Green }
function Write-Bad($m)  { Write-Host "  [ ] $m" -ForegroundColor Yellow }

if (-not (Test-Path -LiteralPath $envPath)) { throw "No .env.production. Run .\scripts\setup-production.ps1 first." }

function Set-EnvLine([string]$key, [string]$value) {
    $lines = @(Get-Content -LiteralPath $envPath)
    $found = $false
    $out = foreach ($line in $lines) {
        if ($line -match "^\s*$key\s*=") { $found = $true; "$key=$value" } else { $line }
    }
    if (-not $found) { $out += "$key=$value" }
    Set-Content -LiteralPath $envPath -Value $out -Encoding UTF8
}

function Remove-EnvLine([string]$key) {
    $lines = @(Get-Content -LiteralPath $envPath) | Where-Object { $_ -notmatch "^\s*$key\s*=" }
    Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8
}

function Read-Secret([string]$prompt) {
    $secure = Read-Host $prompt -AsSecureString
    [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

# --------------------------------------------------------------------------- #
# 1. Which provider
# --------------------------------------------------------------------------- #
Write-Step "Email provider"
Write-Host "  1. Resend        SMTP relay, free tier, simplest to set up"
Write-Host "  2. Other SMTP    Postmark, Mailgun, SES, Gmail, anything with a relay"
Write-Host "  3. SendGrid API  when outbound SMTP ports are blocked"
$choice = (Read-Host "  Choose 1, 2 or 3").Trim()

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "  In the Resend dashboard: add and verify catchablepro.com as a domain,"
        Write-Host "  add the DNS records it gives you, then create an API key."
        $key = Read-Secret "  Resend API key (hidden)"
        if (-not $key.Trim()) { throw "No API key entered." }
        Set-EnvLine "EMAIL_BACKEND" "smtp"
        Set-EnvLine "SMTP_HOST"     "smtp.resend.com"
        Set-EnvLine "SMTP_PORT"     "587"
        Set-EnvLine "SMTP_USER"     "resend"
        Set-EnvLine "SMTP_PASSWORD" $key.Trim()
        Set-EnvLine "SMTP_USE_TLS"  "true"
    }
    "2" {
        $smtpHost = (Read-Host "  SMTP host (e.g. smtp.postmarkapp.com)").Trim()
        if (-not $smtpHost) { throw "No SMTP host entered." }
        $port = (Read-Host "  SMTP port [587]").Trim()
        if (-not $port) { $port = "587" }
        $user = (Read-Host "  SMTP username").Trim()
        $pass = Read-Secret "  SMTP password (hidden)"
        Set-EnvLine "EMAIL_BACKEND" "smtp"
        Set-EnvLine "SMTP_HOST"     $smtpHost
        Set-EnvLine "SMTP_PORT"     $port
        Set-EnvLine "SMTP_USER"     $user
        Set-EnvLine "SMTP_PASSWORD" $pass.Trim()
        # Port 465 is implicit TLS and must not also be STARTTLS-upgraded.
        Set-EnvLine "SMTP_USE_TLS"  $(if ($port -eq "465") { "false" } else { "true" })
    }
    "3" {
        $key = Read-Secret "  SendGrid API key (hidden)"
        if (-not $key.Trim()) { throw "No API key entered." }
        Set-EnvLine "EMAIL_BACKEND"    "sendgrid"
        Set-EnvLine "SENDGRID_API_KEY" $key.Trim()
    }
    default { throw "Choose 1, 2 or 3." }
}

# The From address must be on a domain the provider has verified, or the
# provider itself will refuse the message before deliverability is even a
# question.
Write-Step "Sender address"
Write-Host "  Must be on a domain your provider has verified."
$from = (Read-Host "  From address [no-reply@catchablepro.com]").Trim()
if (-not $from) { $from = "no-reply@catchablepro.com" }
Set-EnvLine "EMAIL_FROM" $from
Write-Ok "Provider settings written to .env.production"

# --------------------------------------------------------------------------- #
# 2. Restart with the new settings, keeping the safety flag for now
# --------------------------------------------------------------------------- #
Push-Location $projectRoot
try {
    Write-Step "Restarting with the new settings"
    docker compose -f $composeFile up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed." }

    $deadline = (Get-Date).AddSeconds(120)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            if ((Invoke-WebRequest -Uri "http://127.0.0.1:8000/readyz" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) {
                $ready = $true; break
            }
        } catch { }
        Start-Sleep -Seconds 3
    }
    if (-not $ready) { throw "The app did not come back up. Nothing was removed; run go-live.ps1 to diagnose." }
    Write-Ok "App is running with the new provider"

    # ----------------------------------------------------------------------- #
    # 3. Prove it before trusting it
    # ----------------------------------------------------------------------- #
    Write-Step "Sending a test message"
    if (-not $TestAddress) {
        Write-Host "  Use an inbox somewhere else - Gmail is ideal - so you find out what"
        Write-Host "  a stranger's mail server makes of your domain."
        $TestAddress = (Read-Host "  Send the test to").Trim()
    }
    if (-not $TestAddress) { throw "An address is required to prove this works." }

    docker compose -f $composeFile exec -T app python manage.py send-test-email $TestAddress
    $sent = ($LASTEXITCODE -eq 0)

    if (-not $sent) {
        Write-Host ""
        Write-Bad "The provider rejected it. ALLOW_CONSOLE_EMAIL has been left in place,"
        Write-Host "      so the site stays up while you fix this." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "      Usual causes, in order:" -ForegroundColor Yellow
        Write-Host "        1. Wrong API key or password."
        Write-Host "        2. The From address is on a domain the provider has not verified."
        Write-Host "        3. Wrong port. 587 is STARTTLS, 465 is implicit TLS; they are not"
        Write-Host "           interchangeable."
        Write-Host ""
        Write-Host "      Re-run this script once corrected."
        exit 1
    }

    Write-Ok "The provider accepted the message"

    # ----------------------------------------------------------------------- #
    # 4. Only now drop the flag
    # ----------------------------------------------------------------------- #
    Write-Step "Removing ALLOW_CONSOLE_EMAIL"
    Remove-EnvLine "ALLOW_CONSOLE_EMAIL"
    docker compose -f $composeFile up -d
    if ($LASTEXITCODE -ne 0) { throw "Restart failed after removing the flag." }

    $deadline = (Get-Date).AddSeconds(120)
    $ready = $false
    while ((Get-Date) -lt $deadline) {
        try {
            if ((Invoke-WebRequest -Uri "http://127.0.0.1:8000/readyz" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) {
                $ready = $true; break
            }
        } catch { }
        Start-Sleep -Seconds 3
    }
    if (-not $ready) {
        Write-Bad "The app did not come back after removing the flag."
        docker compose -f $composeFile logs --tail=40 app
        exit 1
    }

    Write-Ok "Running on a real mailer, with no console fallback"

    Write-Step "Before you tell anyone the site exists"
    Write-Host "  1. Open the test message. Check the spam folder too - landing there"
    Write-Host "     means SPF or DKIM, not the application."
    Write-Host "  2. Sign up as a brand new user at your public URL and complete the"
    Write-Host "     verification link from the email, not from the logs."
    Write-Host "  3. Use the forgotten-password flow end to end."
    Write-Host "  4. Add a DMARC record at p=none first, and read the reports for a"
    Write-Host "     week before moving to p=reject. Going straight to reject bounces"
    Write-Host "     mail you did not know you were sending."
}
finally {
    Pop-Location
}
