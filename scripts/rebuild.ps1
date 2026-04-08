# rebuild.ps1 - Rebuild and restart all services
# Usage: ./scripts/rebuild.ps1 [service-name]

param(
    [string]$Service = ""
)

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $WorkspaceRoot

Write-Host "Rebuilding meeting-room services..." -ForegroundColor Cyan

if ($Service) {
    Write-Host "Rebuilding service: $Service" -ForegroundColor Yellow
    docker compose build --no-cache $Service
    docker compose up -d $Service
} else {
    docker compose down
    docker compose build --no-cache
    docker compose up -d
}

Write-Host "Rebuild complete." -ForegroundColor Green
docker compose ps
