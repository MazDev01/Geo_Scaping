@echo off
cd /d "%~dp0"
title Google Maps Scraper - 75 provinces queue (do not close)
echo ============================================
echo  75-province queue is running. Do not close this window.
echo  Output goes to queue.log, so clicking here will NOT pause it.
echo  Double-click resume-all.bat to resume; finished provinces are skipped.
echo  Progress: double-click progress.bat
echo ============================================
"C:\Program Files\nodejs\node.exe" "%~dp0tools\queue.js" >> "%~dp0queue.log" 2>&1
echo Queue finished or stopped.
pause
