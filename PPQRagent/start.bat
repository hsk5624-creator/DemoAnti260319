@echo off
chcp 65001 > nul
title PPQR Agent

echo.
echo  ====================================
echo   PPQR Agent ^| 서버 시작
echo  ====================================
echo.

:: ── 사전 확인 ──────────────────────────────────────────────────────
python -c "import uvicorn" > nul 2>&1
if errorlevel 1 (
    echo  [오류] Python 패키지가 설치되지 않았습니다.
    echo.
    echo  아래 명령을 실행하세요:
    echo    pip install fastapi uvicorn openpyxl pyxlsb python-docx lxml
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0web\node_modules" (
    echo  [오류] node_modules 없음. 아래 명령을 실행하세요:
    echo    cd web ^&^& npm install
    echo.
    pause
    exit /b 1
)

:: ── 기존 프로세스 종료 ──────────────────────────────────────────────
echo  기존 서버 프로세스 정리 중...

for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr " :8000 "') do taskkill /PID %%p /F > nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr " :3001 "') do taskkill /PID %%p /F > nul 2>&1

timeout /t 1 /nobreak > nul

:: ── 서버 시작 (따옴표 충돌 방지: %~dp0xxx 경로는 공백 없으므로 내부 따옴표 제거) ──
echo  [1/2] FastAPI 서버 시작 (port 8000)...
start "PPQR FastAPI" cmd /k "cd /d %~dp0api && python -m uvicorn main:app --port 8000 --reload"

echo  [2/2] Next.js 개발 서버 시작 (port 3001)...
start "PPQR Next.js" cmd /k "cd /d %~dp0web && npm run dev"

:: ── 포트 준비 대기 ────────────────────────────────────────────────
echo.
echo  서버 초기화 대기 중...
echo  Next.js 첫 실행 시 30초 이상 걸릴 수 있습니다. 잠시 기다려주세요.
echo.

:WAIT_LOOP
timeout /t 2 /nobreak > nul
curl -s http://localhost:3001 > nul 2>&1
if %errorlevel%==0 goto READY
echo  . 대기 중...
goto WAIT_LOOP

:READY
echo.
echo  ====================================
echo   서버 준비 완료!
echo   http://localhost:3001
echo  ====================================
echo.
start "" http://localhost:3001

echo  서버 종료: 열린 서버 창(PPQR FastAPI / PPQR Next.js)을 닫으세요.
