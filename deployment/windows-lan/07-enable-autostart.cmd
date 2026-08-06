@echo off
setlocal
pushd "%~dp0\..\.."

net session >nul 2>&1
if errorlevel 1 (
  echo [LuxERP] This script must be run as Administrator.
  popd
  exit /b 1
)

set "TASK_NAME=LuxERP Server"
set "SERVER_SCRIPT=%CD%\deployment\windows-lan\02-run-server.cmd"

echo [LuxERP] Registering LuxERP server autostart task...
schtasks.exe /Create /TN "%TASK_NAME%" /SC ONSTART /DELAY 0000:30 /RU SYSTEM /RL HIGHEST /TR "cmd.exe /d /c ""%SERVER_SCRIPT%""" /F
if errorlevel 1 goto :error

echo [LuxERP] Autostart task is registered. The server will start 30 seconds after Windows starts.
popd
exit /b 0

:error
set "EXIT_CODE=%errorlevel%"
echo [LuxERP] Could not register autostart task. Code %EXIT_CODE%.
popd
exit /b %EXIT_CODE%
