@echo off
setlocal

net session >nul 2>&1
if errorlevel 1 (
  echo [LuxERP] This script must be run as Administrator.
  exit /b 1
)

echo [LuxERP] Opening inbound TCP 3000 in Windows Firewall...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$rule = Get-NetFirewallRule -DisplayName 'LuxERP TCP 3000' -ErrorAction SilentlyContinue;" ^
  "if (-not $rule) {" ^
  "  New-NetFirewallRule -DisplayName 'LuxERP TCP 3000' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 | Out-Null;" ^
  "  Write-Host '[LuxERP] Firewall rule created.';" ^
  "} else {" ^
  "  Write-Host '[LuxERP] Firewall rule already exists.';" ^
  "}"

exit /b %errorlevel%
