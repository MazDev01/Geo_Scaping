@echo off
cd /d "%~dp0"
title Google Maps Scraper - Phuket round 2 (do not close)
echo ============================================
echo  Round 2: area-by-area scrape. Do not close.
echo  Resumes automatically, skips places already saved.
echo ============================================
"%~dp0gmaps-scraper.exe" -input keywords-phuket-2.txt -results phuket-all-raw.csv -resume -email -lang th -depth 10 -c 3 -exit-on-inactivity 10m > scrape2.log 2>&1
echo Building Excel file...
"C:\Program Files\nodejs\node.exe" "%~dp0tools\make.js" phuket-all-raw.csv phuket-all-v2.xlsx > build.log 2>&1
type build.log
start "" "%~dp0phuket-all-v2.xlsx"
pause
