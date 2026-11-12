@echo off
setlocal
cd /d "%~dp0"
set "APP=%~dp0Strider-Desktop.exe"
if not exist "%APP%" (
  echo.
  echo Impossibile avviare Strider: Strider-Desktop.exe non trovato.
  echo Estrai tutti i file dello ZIP nella stessa cartella e riprova.
  echo.
  pause
  exit /b 1
)
start "" "%APP%"
endlocal
