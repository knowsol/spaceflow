# start.ps1 — Start all services for meeting-room
# Usage: .\scripts\start.ps1

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
Set-Location $WorkspaceRoot

# ── Ensure ai-dev-network ────────────────────────────────────────────────────
$net = docker network ls --format "{{.Name}}" 2>$null | Where-Object { $_ -eq "ai-dev-network" }
if (-not $net) {
    Write-Host "Creating ai-dev-network..." -ForegroundColor Yellow
    docker network create ai-dev-network | Out-Null
}

# ── Check .env ───────────────────────────────────────────────────────────────
if (-not (Test-Path "$WorkspaceRoot\.env")) {
    Write-Host "Error: .env not found." -ForegroundColor Red
    Write-Host "       Re-run: .\shared\scripts\create-workspace.ps1 meeting-room" -ForegroundColor DarkGray
    exit 1
}

# ── Read ports from .env ──────────────────────────────────────────────────────
$envTxt    = Get-Content "$WorkspaceRoot\.env" -Raw
$webPort   = if ($envTxt -match '(?m)^WEB_PORT=(\d+)')   { $Matches[1] } else { "?" }
$apiPort   = if ($envTxt -match '(?m)^API_PORT=(\d+)')   { $Matches[1] } else { "?" }
$adminPort = if ($envTxt -match '(?m)^ADMIN_PORT=(\d+)') { $Matches[1] } else { "?" }
$serverIp  = if ($envTxt -match '(?m)^SERVER_IP=(.+)')   { $Matches[1].Trim() } else { "192.168.0.200" }

# ── Start ─────────────────────────────────────────────────────────────────────
Write-Host "Starting meeting-room (web=$webPort api=$apiPort admin=$adminPort)..." -ForegroundColor Cyan
docker compose up -d

Write-Host ""
Write-Host "  meeting-room services running:" -ForegroundColor Green
Write-Host "    Web   http://$serverIp`:$webPort"         -ForegroundColor White
Write-Host "    API   http://$serverIp`:$apiPort/health"  -ForegroundColor White
Write-Host "    Admin http://$serverIp`:$adminPort"       -ForegroundColor White
Write-Host ""
