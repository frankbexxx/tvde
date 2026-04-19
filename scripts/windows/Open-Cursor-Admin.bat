@echo off
rem UAC: confirma elevacao; abre o Cursor como administrador
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Cursor-Admin.ps1"
