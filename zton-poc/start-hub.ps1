# ZTON Hub — Windows PowerShell launcher
# Usage: .\start-hub.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path "dashboard\dist\index.html")) {
    Write-Host "Building SOC dashboard..." -ForegroundColor Yellow
    Push-Location dashboard
    npm install
    npm run build
    Pop-Location
}

$env:ZTON_ROLE = "hub"
$env:ZTON_DEVICE_ID = "laptop-a"
$env:ZTON_DEVICE_NAME = "Laptop A (Hub)"
$env:ZTON_UDP_PORT = "9999"
$env:ZTON_WEB_PORT = "8080"

Write-Host ""
Write-Host "  ZTON Hub starting..." -ForegroundColor Cyan
Write-Host "  Dashboard: http://localhost:8080" -ForegroundColor Green
Write-Host "  UDP overlay: port 9999" -ForegroundColor Green
Write-Host ""

python main.py
