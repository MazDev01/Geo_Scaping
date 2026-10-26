@echo off
title Stop Google Maps Scraper
echo Stopping all scraping...
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'tools\\(run|queue)\.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
taskkill /IM gmaps-scraper.exe /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Google Maps Scraper*" /F >nul 2>&1
echo.
echo Stopped. All data collected so far is saved.
echo To continue later, double-click resume-all.bat
pause
