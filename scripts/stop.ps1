# stop.ps1 — meeting-room workspace
# Usage: .\stop.ps1            # graceful stop (containers remain, data preserved)
#        .\stop.ps1 -Remove    # stop + remove containers
#        .\stop.ps1 -Full      # stop + remove containers + volumes (DATA LOSS WARNING)

param(
    [switch]$Remove,
    [switch]$Full
)

$WorkspaceDir = $PSScriptRoot | Split-Path -Parent
$WorkspaceName = "meeting-room"

Set-Location $WorkspaceDir

Write-Host ""
Write-Host "  Stopping $WorkspaceName..." -ForegroundColor Cyan

# Show running services before stopping
$running = docker compose ps --services --filter "status=running" 2>$null
if ($running) {
    Write-Host "  Running services: $($running -join ', ')" -ForegroundColor DarkGray
}

if ($Full) {
    Write-Host "  [WARNING] -Full flag will remove volumes (DATA LOSS)" -ForegroundColor Red
    $confirm = Read-Host "  Type workspace name to confirm"
    if ($confirm -ne $WorkspaceName) {
        Write-Host "  Aborted." -ForegroundColor Yellow
        exit 0
    }
    docker compose down -v
    Write-Host "  $WorkspaceName stopped (containers + volumes removed)" -ForegroundColor Red
} elseif ($Remove) {
    docker compose down
    Write-Host "  $WorkspaceName stopped (containers removed, data preserved)" -ForegroundColor Yellow
} else {
    docker compose stop
    Write-Host "  $WorkspaceName stopped (containers paused, restart with start.ps1)" -ForegroundColor Green
}

Write-Host ""
