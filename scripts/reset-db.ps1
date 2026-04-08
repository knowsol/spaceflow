# reset-db.ps1 - Reset database (WARNING: destroys all data)
# Usage: ./scripts/reset-db.ps1

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $WorkspaceRoot

Write-Host "WARNING: This will destroy all database data!" -ForegroundColor Red
$confirm = Read-Host "Type 'yes' to confirm"

if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "Stopping services..." -ForegroundColor Cyan
docker compose down -v

Write-Host "Restarting services with fresh database..." -ForegroundColor Cyan
docker compose up -d

Write-Host "Database reset complete." -ForegroundColor Green
