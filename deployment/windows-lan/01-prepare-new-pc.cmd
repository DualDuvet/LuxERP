@echo off
setlocal
pushd "%~dp0\..\.."
set "CREATED_ENV=0"

echo [LuxERP] Preparing this PC for local production launch...

if not exist ".env" (
  echo [LuxERP] .env not found. Copying from .env.example...
  copy ".env.example" ".env" >nul
  if errorlevel 1 goto :error
  set "CREATED_ENV=1"
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

echo [LuxERP] Applying Better Auth database migrations...
call npm.cmd run prisma:auth:deploy
if errorlevel 1 goto :error

if "%CREATED_ENV%"=="1" goto :configuration

echo [LuxERP] Building production bundle...
call npm.cmd run build
if errorlevel 1 goto :error

echo.
echo [LuxERP] Preparation complete.
echo [LuxERP] Next steps:
echo   1. Edit .env
echo   2. Run deployment\windows-lan\04-open-firewall-3000.cmd as Administrator
echo   3. Run deployment\windows-lan\06-schedule-backup.cmd
echo   4. Run deployment\windows-lan\07-enable-autostart.cmd
echo   5. Run deployment\windows-lan\02-run-server.cmd for a manual test
popd
exit /b 0

:configuration
echo.
echo [LuxERP] .env was created from the template and must be configured.
echo [LuxERP] Set AUTH_SECRET, AUTH_BOOTSTRAP_USERNAME, AUTH_BOOTSTRAP_PHRASE and URLs,
echo [LuxERP] then run this script again to build the production bundle.
popd
exit /b 0

:error
set "EXIT_CODE=%errorlevel%"
echo.
echo [LuxERP] Preparation failed with code %EXIT_CODE%.
popd
exit /b %EXIT_CODE%
