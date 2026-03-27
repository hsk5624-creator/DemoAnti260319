@echo off
chcp 65001 > nul
echo.
echo  ╔═══════════════════════════════════════╗
echo  ║      MRO 구매 검토 시스템 시작        ║
echo  ╚═══════════════════════════════════════╝
echo.

cd /d "%~dp0web"

if not exist "node_modules" (
  echo  [1/2] 패키지 설치 중...
  call npm install
  echo.
)

echo  [2/2] 서버 시작 중...
echo  브라우저에서 http://localhost:3000 으로 접속하세요
echo.
start "" "http://localhost:3000"
call npm run dev
