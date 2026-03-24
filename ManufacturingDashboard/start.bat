@echo off
cd /d "%~dp0web"

rem Kill existing next dev server using lock file (read locked file via FileStream)
powershell -NoProfile -Command "if (Test-Path '.next\dev\lock') { $fs=[System.IO.FileStream]::new('.next\dev\lock','Open','Read','ReadWrite'); $sr=[System.IO.StreamReader]::new($fs); $p=($sr.ReadToEnd()|ConvertFrom-Json).pid; $sr.Close(); $fs.Close(); if($p){ taskkill /PID $p /F 2>$null } }"

rem Kill any process already on port 3010
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr " :3010 "') do (
  taskkill /PID %%p /F 2>nul
)

start cmd /k "npm run dev -- --port 3010"

:wait
timeout /t 2 /nobreak > nul
curl -s http://localhost:3010 > nul 2>&1
if errorlevel 1 goto wait

start http://localhost:3010
exit
