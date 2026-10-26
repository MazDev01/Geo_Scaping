@echo off
cd /d "%~dp0"
title Resume Google Maps Scraper
tasklist /FI "IMAGENAME eq gmaps-scraper.exe" | find /i "gmaps-scraper.exe" >nul && (
  echo Scraper is already running. Nothing to do.
  pause
  exit /b
)
echo Resuming: Bangkok first, then the 75-province queue (one window).
start "" /min cmd /c "%~dp0run-all-provinces.bat"
echo Started. You can close this window.
timeout /t 10 >nul
