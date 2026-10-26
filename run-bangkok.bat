@echo off
cd /d "%~dp0"
title Google Maps Scraper - Bangkok (do not close)
echo ============================================
echo  Bangkok scrape. Do not close this window.
echo  Double-click again to resume if it stops.
echo ============================================
"C:\Program Files\nodejs\node.exe" "%~dp0tools\run.js" keywords-bangkok.txt bangkok
start "" "%~dp0bangkok-all.xlsx"
pause
