# ZTON 4-device stack — starts hub + 3 nodes (separate windows)
# Usage: .\start-all.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not (Test-Path "$root\dashboard\dist\index.html")) {
    Write-Host "Building dashboard..." -ForegroundColor Yellow
    Push-Location "$root\dashboard"
    npm install
    npm run build
    Pop-Location
}

function Start-ZtonNode {
    param([string]$Title, [hashtable]$Env)
    $cmd = "`$env:ZTON_ROLE='$($Env.ZTON_ROLE)'; "
    foreach ($k in $Env.Keys) {
        if ($k -ne "ZTON_ROLE") { $cmd += "`$env:$k='$($Env[$k])'; " }
    }
    $cmd += "Set-Location '$root'; python main.py"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd -WindowStyle Normal
    Start-Sleep -Seconds 1
}

# Kill anything on our ports first
8080,8081,8082,8083 | ForEach-Object {
    Get-NetTCPConnection -LocalPort $_ -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

Write-Host "Starting 4 ZTON devices..." -ForegroundColor Cyan

Start-ZtonNode "Hub" @{
    ZTON_ROLE="hub"; ZTON_DEVICE_ID="laptop-a"; ZTON_DEVICE_NAME="Laptop A (Hub)"
    ZTON_UDP_PORT="9999"; ZTON_WEB_PORT="8080"
}
Start-ZtonNode "Laptop B" @{
    ZTON_ROLE="node"; ZTON_DEVICE_ID="laptop-b"; ZTON_DEVICE_NAME="Laptop B"
    ZTON_HUB_HOST="127.0.0.1"; ZTON_UDP_PORT="9999"; ZTON_WEB_PORT="8081"
    ZTON_AUTHORIZED="true"; ZTON_TARGETS="phone-b,hub"
}
Start-ZtonNode "Phone B" @{
    ZTON_ROLE="node"; ZTON_DEVICE_ID="phone-b"; ZTON_DEVICE_NAME="Phone B"
    ZTON_HUB_HOST="127.0.0.1"; ZTON_UDP_PORT="9999"; ZTON_WEB_PORT="8082"
    ZTON_AUTHORIZED="true"; ZTON_TARGETS="hub"
}
Start-ZtonNode "Phone A" @{
    ZTON_ROLE="node"; ZTON_DEVICE_ID="phone-a"; ZTON_DEVICE_NAME="Phone A"
    ZTON_HUB_HOST="127.0.0.1"; ZTON_UDP_PORT="9999"; ZTON_WEB_PORT="8083"
    ZTON_AUTHORIZED="false"
}

Write-Host ""
Write-Host "  Hub:      http://localhost:8080" -ForegroundColor Green
Write-Host "  Laptop B: http://localhost:8081" -ForegroundColor Green
Write-Host "  Phone B:  http://localhost:8082" -ForegroundColor Green
Write-Host "  Phone A:  http://localhost:8083" -ForegroundColor Green
Write-Host ""
