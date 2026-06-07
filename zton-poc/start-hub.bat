@echo off
REM ZTON Hub — Windows CMD launcher
cd /d "%~dp0"

if not exist "dashboard\dist\index.html" (
    echo Building SOC dashboard...
    cd dashboard
    call npm install
    call npm run build
    cd ..
)

set ZTON_ROLE=hub
set ZTON_DEVICE_ID=laptop-a
set ZTON_DEVICE_NAME=Laptop A (Hub)
set ZTON_UDP_PORT=9999
set ZTON_WEB_PORT=8080

echo.
echo   ZTON Hub starting...
echo   Dashboard: http://localhost:8080
echo   UDP overlay: port 9999
echo.

python main.py
