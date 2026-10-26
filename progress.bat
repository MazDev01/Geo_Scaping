@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Scraping progress
"C:\Program Files\nodejs\node.exe" "%~dp0tools\progress.js"
echo.
pause
