[CmdletBinding()]
param(
    [string]$Destination = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$composeFile = Join-Path $projectRoot "compose.production.yaml"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker Desktop must be running before a Catchablepro backup can be made."
}
if (-not (Test-Path -LiteralPath $composeFile)) {
    throw "Could not find compose.production.yaml in $projectRoot."
}

$backupFolder = [System.IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Force -Path $backupFolder | Out-Null
$stamp = Get-Date -Format "yyyy-MM-dd-HHmmss"
$insideContainer = "/tmp/catchablepro-$stamp.db"
$backupFile = Join-Path $backupFolder "catchablepro-$stamp.db"

Push-Location $projectRoot
try {
    docker compose -f $composeFile exec -T app python manage.py backup $insideContainer
    if ($LASTEXITCODE -ne 0) { throw "The database backup command failed." }

    $containerId = (docker compose -f $composeFile ps -q app).Trim()
    if (-not $containerId) { throw "The Catchablepro app container is not running." }

    docker cp "${containerId}:$insideContainer" $backupFile
    if ($LASTEXITCODE -ne 0) { throw "Docker could not copy the backup to the host." }
}
finally {
    Pop-Location
}

Write-Host "Backup written to $backupFile"
Write-Host "Copy this file to encrypted storage outside this desktop before relying on it."
