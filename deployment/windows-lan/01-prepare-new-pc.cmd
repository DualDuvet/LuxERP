@echo off
setlocal
pushd "%~dp0\..\.."

echo [LuxERP] Preparing this PC for local production launch...

if not exist ".env" (
  echo [LuxERP] .env not found. Copying from .env.example...
  copy ".env.example" ".env" >nul
  if errorlevel 1 goto :error
  echo [LuxERP] Created .env. Please review it before the first launch.
) else (
  echo [LuxERP] Existing .env found. Keeping current file.
)

echo [LuxERP] Installing npm dependencies...
call npm.cmd install
if errorlevel 1 goto :error

echo [LuxERP] Generating Prisma client...
call npm.cmd run prisma:generate
if errorlevel 1 goto :error

echo [LuxERP] Building production bundle...
call npm.cmd run build
if errorlevel 1 goto :error

echo.
echo [LuxERP] Preparation complete.
echo [LuxERP] Next steps:
echo   1. Edit .env
echo   2. Run deployment\windows-lan\04-open-firewall-3000.cmd as Administrator
echo   3. Run deployment\windows-lan\02-run-server.cmd
popd
exit /b 0

:error
set "EXIT_CODE=%errorlevel%"
echo.
echo [LuxERP] Preparation failed with code %EXIT_CODE%.
popd
exit /b %EXIT_CODE%
