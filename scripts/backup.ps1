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
# Staged on the data volume, not /tmp. The container is read_only with a
# tmpfs at /tmp, and docker cp cannot read from a tmpfs mount: it copies
# from the container's filesystem, which a tmpfs is not part of. The volume
# is the only writable path docker cp can see. Removed once it is on the host.
$insideContainer = "/app/data/.backup-$stamp.db"
$backupFile = Join-Path $backupFolder "catchablepro-$stamp.db"

Push-Location $projectRoot
try {
    docker compose -f $composeFile exec -T app python manage.py backup $insideContainer
    if ($LASTEXITCODE -ne 0) { throw "The database backup command failed." }

    $containerId = (docker compose -f $composeFile ps -q app).Trim()
    if (-not $containerId) { throw "The Catchablepro app container is not running." }

    try {
        docker cp "${containerId}:$insideContainer" $backupFile
        if ($LASTEXITCODE -ne 0) { throw "Docker could not copy the backup to the host." }
    }
    finally {
        # Always clean up, including after a failed copy: the staged file is a
        # full copy of the database sitting on the same volume as the original.
        docker compose -f $composeFile exec -T app rm -f $insideContainer 2>&1 | Out-Null
    }
}
finally {
    Pop-Location
}

Write-Host "Backup written to $backupFile"
Write-Host "Copy this file to encrypted storage outside this desktop before relying on it."
