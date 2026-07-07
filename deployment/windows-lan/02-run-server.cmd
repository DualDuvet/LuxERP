@echo off
setlocal
pushd "%~dp0\..\.."

if not exist ".env" (
  echo [LuxERP] Missing .env in project root.
  echo [LuxERP] Run deployment\windows-lan\01-prepare-new-pc.cmd first.
  popd
  exit /b 1
)

echo [LuxERP] Starting production server on 0.0.0.0:3000...
echo [LuxERP] Keep this window open while LuxERP is running.
call npm.cmd run start:tunnel
set "EXIT_CODE=%errorlevel%"

popd
exit /b %EXIT_CODE%
