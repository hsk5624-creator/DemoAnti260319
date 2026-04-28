@echo off
title PPQR Agent

echo.
echo  ====================================
echo   PPQR Agent
echo  ====================================
echo.
echo  Bat started OK. Press any key to continue diagnostics...
pause > nul

:: Pre-check: uvicorn
python -c "import uvicorn" > nul 2>&1
if errorlevel 1 goto NO_PYTHON

:: Pre-check: node_modules
if not exist "%~dp0web\node_modules" goto NO_NODE

:: Kill existing processes on ports 8000 / 3001
echo  Cleaning up existing processes...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":8000 "') do taskkill /PID %%p /F > nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":3001 "') do taskkill /PID %%p /F > nul 2>&1
timeout /t 1 /nobreak > nul

echo  [1/2] FastAPI server starting (port 8000)...
cd /d "%~dp0api"
start "PPQR FastAPI" cmd /k "python -m uvicorn main:app --port 8000 --reload"

echo  [2/2] Next.js server starting (port 3001)...
cd /d "%~dp0web"
start "PPQR Next.js" cmd /k "npm run dev"

echo.
echo  Waiting for both servers...
echo  (Next.js compile ~30s + FastAPI preload ~30s on first run)
echo.

set TRIES=0
:WAIT_LOOP
timeout /t 2 /nobreak > nul
set /a TRIES+=1
:: Hit /api/health via Next.js proxy — succeeds only when BOTH 3001 AND 8000 are up
curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health 2>nul | findstr /r "^200" > nul
if not errorlevel 1 goto READY
if %TRIES% geq 90 goto TIMEOUT
echo  . still waiting... (%TRIES% x 2s)
goto WAIT_LOOP

:READY
echo.
echo  ====================================
echo   Server ready!
echo   http://localhost:3001
echo  ====================================
echo.
start "" "http://localhost:3001"
echo.
echo  [INFO] Browser opened. Servers are running in separate windows.
echo  [INFO] Close "PPQR FastAPI" / "PPQR Next.js" windows to stop.
echo.
pause
goto END

:TIMEOUT
echo.
echo  [WARNING] Servers did not become ready within 180 seconds.
echo  Check the "PPQR FastAPI" and "PPQR Next.js" windows for error messages.
echo  You can manually open: http://localhost:3001
echo.
pause
goto END

:NO_PYTHON
echo.
echo  [ERROR] uvicorn not installed.
echo  Please run: pip install fastapi uvicorn openpyxl pyxlsb python-docx lxml
echo.
pause
goto END

:NO_NODE
echo.
echo  [ERROR] web\node_modules is missing.
echo  Please run: cd web  then  npm install
echo.
pause
goto END

:END
