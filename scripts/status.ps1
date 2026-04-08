# status.ps1 — meeting-room workspace
# Usage: .\status.ps1          # 컨테이너 상태 + /health 체크
#        .\status.ps1 -Quick   # /health 체크 생략

param([switch]$Quick)

$WorkspaceDir  = $PSScriptRoot | Split-Path -Parent
$WorkspaceName = "meeting-room"
$EnvFile       = Join-Path $WorkspaceDir ".env"

Set-Location $WorkspaceDir

# ─── Load .env ────────────────────────────────────────────────────────────────
$WebPort   = "?"
$ApiPort   = "?"
$AdminPort = "?"
$ServerIP  = "192.168.0.200"

if (Test-Path $EnvFile) {
    $envContent = Get-Content $EnvFile -Raw
    if ($envContent -match '(?m)^WEB_PORT=(\d+)')   { $WebPort   = $Matches[1] }
    if ($envContent -match '(?m)^API_PORT=(\d+)')   { $ApiPort   = $Matches[1] }
    if ($envContent -match '(?m)^ADMIN_PORT=(\d+)') { $AdminPort = $Matches[1] }
    if ($envContent -match '(?m)^SERVER_IP=(.+)')   { $ServerIP  = $Matches[1].Trim() }
}

# ─── Health Check ─────────────────────────────────────────────────────────────
function Test-Health {
    param([string]$Url)
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec 3 -ErrorAction Stop -UseBasicParsing
        return "OK ($($resp.StatusCode))"
    } catch {
        return "FAIL"
    }
}

# ─── Header ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  $WorkspaceName status" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host "  $('─' * 50)" -ForegroundColor DarkGray
Write-Host ""

# ─── Docker Compose PS ────────────────────────────────────────────────────────
docker compose ps
Write-Host ""

# ─── Health Checks ────────────────────────────────────────────────────────────
if (-not $Quick) {
    Write-Host "  Health checks:" -ForegroundColor DarkGray

    $checks = @(
        @{ name = "web";   url = "http://$ServerIP`:$WebPort";         port = $WebPort }
        @{ name = "api";   url = "http://$ServerIP`:$ApiPort/health";  port = $ApiPort }
        @{ name = "admin"; url = "http://$ServerIP`:$AdminPort";       port = $AdminPort }
    )

    foreach ($c in $checks) {
        if ($c.port -eq "?") {
            Write-Host "    $($c.name.PadRight(6))  port not found in .env" -ForegroundColor DarkGray
            continue
        }
        $result = Test-Health $c.url
        $color  = if ($result -like "OK*") { "Green" } else { "Red" }
        Write-Host "    $($c.name.PadRight(6))  $($c.url.PadRight(38))  $result" -ForegroundColor $color
    }
    Write-Host ""
}

# ─── URLs ─────────────────────────────────────────────────────────────────────
Write-Host "  URLs:" -ForegroundColor DarkGray
Write-Host "    Web    http://$ServerIP`:$WebPort" -ForegroundColor White
Write-Host "    API    http://$ServerIP`:$ApiPort/health" -ForegroundColor White
Write-Host "    Admin  http://$ServerIP`:$AdminPort" -ForegroundColor White
Write-Host ""
