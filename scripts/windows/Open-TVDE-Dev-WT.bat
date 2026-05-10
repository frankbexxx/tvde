@echo off
setlocal EnableExtensions

rem Verifica privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)

set "ROOT=C:\dev\APP"
set "BACKEND=%ROOT%\backend"

rem Localiza o executavel do Windows Terminal
set "WINWT=%LocalAppData%\Microsoft\Windows Terminal\wt.exe"
if not exist "%WINWT%" set "WINWT=wt.exe"

rem Define o PowerShell 7 (pwsh.exe) como prioritario, senao usa o 5.1 (powershell.exe)
where pwsh.exe >nul 2>&1
if %errorLevel% equ 0 (
    set "PS=pwsh.exe"
) else (
    set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
)

set "PSFLAGS=-NoExit -NoProfile -ExecutionPolicy Bypass -File"

rem Execucao no Windows Terminal com titulos forcados e PS7
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

rem Abre o Cursor se existir
if exist "%LOCALAPPDATA%\Programs\cursor\Cursor.exe" (
  start "" "%LOCALAPPDATA%\Programs\cursor\Cursor.exe"
)

endlocal
exit /b 0
