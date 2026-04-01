@echo off
title SMART Innovation - Timeline Dashboard

echo 포트 4000 기존 프로세스 종료 중...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000 "') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo 서버 시작 중...
cd /d "%~dp0web"
start "" http://localhost:4000
npm run dev
pause
