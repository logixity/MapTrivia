@echo off
cd /d "%~dp0"

call npm run build
if errorlevel 1 (
  echo Build failed, not pushing.
  pause
  exit /b 1
)

set "MSG=%*"
if "%MSG%"=="" set /p MSG=Commit message (Enter for "Update"): 
if "%MSG%"=="" set "MSG=Update"

git add .
git commit -m "%MSG%"
git push -u origin main

echo.
if errorlevel 1 (echo Push failed.) else (echo Done.)
pause
