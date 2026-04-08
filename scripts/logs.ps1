# logs.ps1 - View service logs
# Usage: ./scripts/logs.ps1 [service-name]

param(
    [string]$Service = "",
    [int]$Lines = 100
)

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $WorkspaceRoot

if ($Service) {
    Write-Host "Logs for $Service (last $Lines lines):" -ForegroundColor Cyan
    docker compose logs -f --tail=$Lines $Service
} else {
    Write-Host "Logs for all services (last $Lines lines):" -ForegroundColor Cyan
    docker compose logs -f --tail=$Lines
}
