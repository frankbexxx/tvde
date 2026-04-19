@echo off
setlocal EnableExtensions
rem Minimal dev layout: one double-click, elevated once (UAC), WT tabs with venv only; Postgres: Docker + 10s + docker start; then Cursor if present.

net session >nul 2>&1
if %errorLevel% neq 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

set "ROOT=C:\dev\APP"
set "BACKEND=%ROOT%\backend"
set "WINWT=%LocalAppData%\Microsoft\Windows Terminal\wt.exe"
if not exist "%WINWT%" set "WINWT=wt.exe"

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "PSFLAGS=-NoExit -NoProfile -ExecutionPolicy Bypass -File"

"%WINWT%" ^
 -p "Windows PowerShell" --title "Backend_Admin" --tabColor "#e81123" -d "%BACKEND%" ^
 %PS% %PSFLAGS% "%ROOT%\scripts\windows\tab-backend.ps1" ^
 ; new-tab -p "Windows PowerShell" --title "Frontend_Admin" --tabColor "#c87310" -d "%BACKEND%" ^
 %PS% %PSFLAGS% "%ROOT%\scripts\windows\tab-frontend.ps1" ^
 ; new-tab -p "Windows PowerShell" --title "Postgres_Admin" --tabColor "#107c10" -d "%BACKEND%" ^
 %PS% %PSFLAGS% "%ROOT%\scripts\windows\tab-docker-postgres.ps1" ^
 ; new-tab -p "Windows PowerShell" --title "Stripe_Admin" --tabColor "#635bff" -d "%BACKEND%" ^
 %PS% %PSFLAGS% "%ROOT%\scripts\windows\tab-stripe.ps1" ^
 ; new-tab -p "Windows PowerShell" --title "Utils_Admin" --tabColor "#605e1b" -d "%BACKEND%" ^
 %PS% %PSFLAGS% "%ROOT%\scripts\windows\tab-utils.ps1" ^
 ; focus-tab -t 0

if exist "%LOCALAPPDATA%\Programs\cursor\Cursor.exe" (
  start "" "%LOCALAPPDATA%\Programs\cursor\Cursor.exe"
)

endlocal
exit /b 0
