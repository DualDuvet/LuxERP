@echo off
setlocal
pushd "%~dp0\..\.."

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Date).ToString('yyyy-MM-dd_HH-mm-ss')"`) do set "STAMP=%%I"
set "BACKUP_DIR=backups\luxerp-%STAMP%"

echo [LuxERP] Creating backup in %BACKUP_DIR%...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "New-Item -ItemType Directory -Force -Path '%BACKUP_DIR%' | Out-Null;" ^
  "if (Test-Path '.data') { Copy-Item -LiteralPath '.data' -Destination '%BACKUP_DIR%\.data' -Recurse -Force };" ^
  "if (Test-Path '.env') { Copy-Item -LiteralPath '.env' -Destination '%BACKUP_DIR%\.env' -Force }"

if errorlevel 1 goto :error

echo [LuxERP] Backup complete: %BACKUP_DIR%
popd
exit /b 0

:error
set "EXIT_CODE=%errorlevel%"
echo [LuxERP] Backup failed with code %EXIT_CODE%.
popd
exit /b %EXIT_CODE%
