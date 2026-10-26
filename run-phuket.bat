@echo off
cd /d "%~dp0"
title Google Maps Scraper - Phuket (do not close)
echo ============================================
echo  Scraping Phuket... do not close this window
echo  It resumes automatically from where it stopped
echo ============================================
"%~dp0gmaps-scraper.exe" -input keywords-phuket.txt -results phuket-all-raw.csv -resume -email -lang th -depth 10 -c 3 -exit-on-inactivity 10m > scrape.log 2>&1
echo Building Excel file...
node "%~dp0tools\make.js" phuket-all-raw.csv phuket-all-final.xlsx
echo DONE: phuket-all-final.xlsx
start "" phuket-all-final.xlsx
pause
