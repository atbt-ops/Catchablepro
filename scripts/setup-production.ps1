<#
.SYNOPSIS
    Fill in .env.production and the tunnel token file, then say what is left.

.DESCRIPTION
    The parts of going live that are mechanical: generating a strong SECRET_KEY,
    putting the same hostname in the two places that must agree, writing the
    tunnel token where Compose expects it, and checking that no placeholder
    survived. Doing this by hand is where the mistakes happen — a PUBLIC_URL and
    TRUSTED_HOSTS that disagree, or a SECRET_KEY someone "temporarily" left as
    the example value.

    It does NOT create your domain, your Cloudflare tunnel, or your email
    account. Those need your own logins. It tells you which are still missing
    rather than starting a stack that cannot work.

    Safe to re-run: an existing .env.production is left alone unless -Force.

.PARAMETER Force
    Overwrite an existing .env.production. This rotates SECRET_KEY, which signs
    out every user, so it prompts before doing it.

.EXAMPLE
    .\scripts\setup-production.ps1
#>
[CmdletBinding()]
param([switch]$Force)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$examplePath = Join-Path $projectRoot ".env.production.example"
$envPath     = Join-Path $projectRoot ".env.production"
$secretsDir  = Join-Path $projectRoot "secrets"
$tokenPath   = Join-Path $secretsDir "cloudflare-tunnel-token.txt"

function Write-Step($m) { Write-Host "==> $m" -ForegroundColor Cyan }
function Write-Todo($m) { Write-Host "  [ ] $m" -ForegroundColor Yellow }
function Write-Done($m) { Write-Host "  [x] $m" -ForegroundColor Green }

if (-not (Test-Path -LiteralPath $examplePath)) {
    throw "Could not find .env.production.example in $projectRoot. Are you in the project directory?"
}

# --------------------------------------------------------------------------- #
# .env.production
# --------------------------------------------------------------------------- #
if ((Test-Path -LiteralPath $envPath) -and -not $Force) {
    Write-Step "Keeping the existing .env.production (pass -Force to rewrite it)"
} else {
    if (Test-Path -LiteralPath $envPath) {
        Write-Warning "Rewriting .env.production generates a NEW SECRET_KEY, which signs out every existing user."
        if ((Read-Host "Type 'yes' to continue") -ne "yes") { throw "Cancelled." }
    }

    Write-Step "Public hostname"
    Write-Host "  The HTTPS host real users will visit, without the scheme."
    Write-Host "  Example: jobs.example.com"
    $publicHost = (Read-Host "  Hostname").Trim().TrimEnd('/')
    if ($publicHost -match '^https?://') { $publicHost = ($publicHost -replace '^https?://', '') }
    if ($publicHost -notmatch '^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') {
        throw "That does not look like a hostname: $publicHost"
    }

    # A cryptographic RNG, not Get-Random, and via the Create() factory so this
    # works on both Windows PowerShell 5.1 and PowerShell 7.
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $bytes = New-Object byte[] 48
    $rng.GetBytes($bytes)
    # URL-safe base64, matching what the README's python one-liner produces.
    $secretKey = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

    $lines = Get-Content -LiteralPath $examplePath | ForEach-Object {
        switch -Regex ($_) {
            '^\s*PUBLIC_URL\s*='    { "PUBLIC_URL=https://$publicHost"; break }
            '^\s*TRUSTED_HOSTS\s*=' { "TRUSTED_HOSTS=$publicHost"; break }
            '^\s*SECRET_KEY\s*='    { "SECRET_KEY=$secretKey"; break }
            default                 { $_ }
        }
    }
    Set-Content -LiteralPath $envPath -Value $lines -Encoding UTF8
    Write-Done ".env.production written with a fresh SECRET_KEY and $publicHost"
}

# --------------------------------------------------------------------------- #
# Cloudflare tunnel token
# --------------------------------------------------------------------------- #
New-Item -ItemType Directory -Force -Path $secretsDir | Out-Null

$haveToken = (Test-Path -LiteralPath $tokenPath) -and
             ((Get-Item -LiteralPath $tokenPath).Length -gt 0)

if ($haveToken -and -not $Force) {
    Write-Step "Tunnel token already present"
} else {
    Write-Step "Cloudflare tunnel token"
    Write-Host "  Cloudflare dashboard -> Zero Trust -> Networks -> Tunnels ->"
    Write-Host "  create a NAMED tunnel, choose the Docker connector, and copy its token."
    Write-Host "  Leave blank to skip for now."
    $secure = Read-Host "  Token (hidden)" -AsSecureString
    $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
    if ($plain -and $plain.Trim()) {
        # WriteAllText, so no trailing newline reaches cloudflared's --token-file.
        [System.IO.File]::WriteAllText($tokenPath, $plain.Trim())
        Write-Done "Token written to secrets\cloudflare-tunnel-token.txt (gitignored)"
    } else {
        Write-Todo "Tunnel token skipped — the cloudflared container will not start without it"
    }
}

# --------------------------------------------------------------------------- #
# What is still missing
# --------------------------------------------------------------------------- #
Write-Host ""
Write-Step "Readiness"

$content = Get-Content -LiteralPath $envPath -Raw
$settings = @{}
foreach ($line in ($content -split "`r?`n")) {
    if ($line -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $settings[$Matches[1]] = $Matches[2].Trim().Trim('"') }
}

$blockers = @()

function Check($name, $ok, $message) {
    if ($ok) { Write-Done $message } else { Write-Todo $message; $script:blockers += $message }
}

Check "secret"  ($settings['SECRET_KEY'] -and $settings['SECRET_KEY'] -notmatch 'replace-with') `
      "SECRET_KEY is a real value"
Check "public"  ($settings['PUBLIC_URL'] -and $settings['PUBLIC_URL'] -notmatch 'example\.com') `
      "PUBLIC_URL points at your own domain"
Check "hosts"   ($settings['TRUSTED_HOSTS'] -and
                 $settings['PUBLIC_URL'] -match [regex]::Escape($settings['TRUSTED_HOSTS'])) `
      "TRUSTED_HOSTS matches PUBLIC_URL"
Check "token"   ((Test-Path -LiteralPath $tokenPath) -and (Get-Item -LiteralPath $tokenPath).Length -gt 0) `
      "Cloudflare tunnel token present"

# Email is the one that stops the app booting rather than merely misbehaving.
$emailReady = $settings['EMAIL_BACKEND'] -and (
    ($settings['EMAIL_BACKEND'] -eq 'smtp' -and $settings['SMTP_HOST'] -and
     $settings['SMTP_HOST'] -notmatch 'example\.com') -or
    ($settings['EMAIL_BACKEND'] -eq 'sendgrid' -and $settings['SENDGRID_API_KEY'] -and
     $settings['SENDGRID_API_KEY'] -notmatch 'replace-with')
)
Check "email" $emailReady "A real email provider is configured"

Write-Host ""
if ($blockers.Count -eq 0) {
    Write-Host "Everything this script can check is in place. Start the stack with:" -ForegroundColor Green
    Write-Host "  docker compose -f compose.production.yaml up -d --build"
    Write-Host "  .\scripts\day-start.ps1"
} else {
    Write-Host "Still needed before real users:" -ForegroundColor Yellow
    foreach ($b in $blockers) { Write-Host "  - $b" }
    if (-not $emailReady) {
        Write-Host ""
        Write-Host "Email is a hard blocker: ENV=production refuses to boot without a" -ForegroundColor Yellow
        Write-Host "real mailer, because verification and password-reset messages would"
        Write-Host "otherwise go nowhere. To prove the container and tunnel work before"
        Write-Host "you have a provider, add this line to .env.production:"
        Write-Host ""
        Write-Host "    ALLOW_CONSOLE_EMAIL=1"
        Write-Host ""
        Write-Host "and DELETE it before anyone signs up. With it set, nobody can" -ForegroundColor Yellow
        Write-Host "recover a forgotten password."
    }
}
Write-Host ""
Write-Host "Never paste the tunnel token, SECRET_KEY, or SMTP password into a chat"
Write-Host "or a commit. Both files this script writes are gitignored."
