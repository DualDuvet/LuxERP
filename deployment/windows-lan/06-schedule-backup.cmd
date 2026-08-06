@echo off
setlocal
pushd "%~dp0\..\.."

set "TASK_NAME=LuxERP Daily Backup"
set "BACKUP_SCRIPT=%CD%\deployment\windows-lan\03-backup-data.cmd"

echo [LuxERP] Registering daily backup task at 21:00...
schtasks.exe /Create /TN "%TASK_NAME%" /SC DAILY /ST 21:00 /TR "cmd.exe /d /c ""%BACKUP_SCRIPT%""" /F
if errorlevel 1 goto :error

echo [LuxERP] Daily backup task is registered.
echo [LuxERP] Sources: .data\orders, .data\dictionaries.json, prisma\auth\auth.db, .env
popd
exit /b 0

:error
set "EXIT_CODE=%errorlevel%"
echo [LuxERP] Could not register daily backup task. Code %EXIT_CODE%.
popd
exit /b %EXIT_CODE%
