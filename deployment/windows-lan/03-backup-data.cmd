@echo off
setlocal
pushd "%~dp0\..\.."

rem Separate multiple backup destinations with semicolons.
set "BACKUP_ROOTS=backups"

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "(Get-Date).ToString('yyyy-MM-dd_HH-mm-ss')"`) do set "STAMP=%%I"
echo [LuxERP] Creating backup in: %BACKUP_ROOTS%...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference = 'Stop';" ^
  "$roots = '%BACKUP_ROOTS%'.Split(';') | ForEach-Object { $_.Trim() } | Where-Object { $_ };" ^
  "$stamp = '%STAMP%';" ^
  "$paths = @('.data\orders', '.data\dictionaries.json', 'prisma\auth\auth.db', '.env');" ^
  "$copied = 0;" ^
  "foreach ($root in $roots) {" ^
  "  $backupDir = Join-Path $root ('luxerp-' + $stamp);" ^
  "  New-Item -ItemType Directory -Force -Path $backupDir | Out-Null;" ^
  "  Write-Host ('[LuxERP] Destination: ' + $backupDir);" ^
  "  foreach ($path in $paths) {" ^
  "    if (Test-Path -LiteralPath $path) {" ^
  "      $destination = Join-Path $backupDir $path;" ^
  "      $parent = Split-Path -Parent $destination;" ^
  "      New-Item -ItemType Directory -Force -Path $parent | Out-Null;" ^
  "      Copy-Item -LiteralPath $path -Destination $destination -Recurse -Force;" ^
  "      Write-Host ('[LuxERP] Copied: ' + $path);" ^
  "      $copied++;" ^
  "    } else { Write-Host ('[LuxERP] Skipped missing path: ' + $path) }" ^
  "  }" ^
  "}" ^
  "if ($roots.Count -eq 0) { throw 'No backup destinations were configured.' };" ^
  "if ($copied -eq 0) { throw 'No backup source paths were found.' }"

if errorlevel 1 goto :error

echo [LuxERP] Backup complete in all configured destinations.
popd
exit /b 0

:error
set "EXIT_CODE=%errorlevel%"
echo [LuxERP] Backup failed with code %EXIT_CODE%.
popd
exit /b %EXIT_CODE%
