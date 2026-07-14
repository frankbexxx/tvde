@echo off
setlocal EnableExtensions

rem Dev normal — sem UAC, sem Stripe.
rem Se arrancou elevado (ex.: atalho "Run as administrator"), relanca sem admin.
net session >nul 2>&1
if %errorLevel% equ 0 (
  echo [TVDE] Detetado modo Administrador — a relancar sem elevacao...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0'"
  exit /b 0
)

for %%I in ("%~dp0..\..") do set "ROOT=%%~fI"
set "BACKEND=%ROOT%\backend"
set "SCRIPTS=%ROOT%\scripts\windows"

set "WINWT=%LocalAppData%\Microsoft\Windows Terminal\wt.exe"
if not exist "%WINWT%" set "WINWT=wt.exe"

where pwsh.exe >nul 2>&1
if %errorLevel% equ 0 (
    set "PS=pwsh.exe"
) else (
    set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
)

set "PSFLAGS=-NoExit -NoProfile -ExecutionPolicy Bypass -File"

"%WINWT%" ^
 -p "Windows PowerShell" --title "Backend_Dev" --tabColor "#e81123" -d "%BACKEND%" ^
 %PS% %PSFLAGS% "%SCRIPTS%\tab-backend.ps1" ^
 ; new-tab -p "Windows PowerShell" --title "Frontend_Dev" --tabColor "#c87310" -d "%ROOT%\web-app" ^
 %PS% %PSFLAGS% "%SCRIPTS%\tab-frontend.ps1" ^
 ; new-tab -p "Windows PowerShell" --title "Postgres_Local" --tabColor "#107c10" -d "%ROOT%" ^
 %PS% %PSFLAGS% "%SCRIPTS%\tab-docker-postgres.ps1" ^
 ; new-tab -p "Windows PowerShell" --title "Utils_Dev" --tabColor "#605e1b" -d "%ROOT%" ^
 %PS% %PSFLAGS% "%SCRIPTS%\tab-utils.ps1" ^
 ; focus-tab -t 0

rem Cursor detached — async/hidden pwsh; bat termina sem consola extra.
start "" "%PS%" -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%SCRIPTS%\invoke-cursor-workspace.ps1"

endlocal
exit /b 0
