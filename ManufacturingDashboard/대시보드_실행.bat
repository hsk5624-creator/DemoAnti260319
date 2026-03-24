@echo off
cd /d "%~dp0web"
start cmd /k "npm run dev -- --port 3010"

:wait
timeout /t 2 /nobreak > nul
curl -s http://localhost:3010 > nul 2>&1
if errorlevel 1 goto wait

start http://localhost:3010
exit
