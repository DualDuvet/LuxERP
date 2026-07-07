@echo off
setlocal

echo [LuxERP] Local IPv4 addresses:
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object InterfaceAlias,IPAddress | Format-Table -AutoSize"

echo.
echo [LuxERP] Checking http://127.0.0.1:3000/api/health ...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$health = Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:3000/api/health';" ^
  "$health | ConvertTo-Json -Compress"

if errorlevel 1 (
  echo [LuxERP] Health check failed.
  exit /b 1
)

echo.
echo [LuxERP] If the server PC IP is, for example, 192.168.68.50 then open:
echo [LuxERP]   http://192.168.68.50:3000/orders
exit /b 0
