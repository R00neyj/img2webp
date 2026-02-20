@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

title img2webp Image Converter (vibeCoding)

:: node_modules 확인 및 자동 설치
if not exist "node_modules" (
    echo [INFO] node_modules 폴더가 없음. 필요한 패키지를 설치함...
    npm install
    if %errorlevel% neq 0 (
        echo [ERR] npm install 중 오류가 발생함. Node.js가 설치되어 있는지 확인하셈.
        pause
        exit /b
    )
)

:: input 폴더 확인 및 생성
if not exist "input" (
    echo [INFO] input 폴더가 없어 생성함.
    mkdir "input"
)

:: output 폴더 확인 및 생성
if not exist "output" (
    echo [INFO] output 폴더가 없어 생성함.
    mkdir "output"
)

:menu
cls
echo ============================================
echo   img2webp - 이미지 일괄 변환 (to WebP)
echo ============================================
echo.
echo   [1] 퀄리티: 상 (품질 90%%, 용량 다소 큼)
echo   [2] 퀄리티: 중 (품질 80%%, 추천 권장)
echo   [3] 퀄리티: 하 (품질 70%%, 용량 최적화)
echo.
echo   [0] 종료
echo.
echo ============================================
set /p choice="번호를 입력하고 엔터를 치셈 (기본값 2): "

set "quality="
if "%choice%"=="" set "choice=2"
if "%choice%"=="1" set "quality=high"
if "%choice%"=="2" set "quality=mid"
if "%choice%"=="3" set "quality=low"
if "%choice%"=="0" exit

if not defined quality (
    echo [ERR] 잘못된 번호임. 다시 입력해주셈.
    timeout /t 2 > nul
    goto menu
)

echo.
echo [START] %quality% 모드로 변환 시작...
echo.

:: Node.js 스크립트 실행
node convert.js %quality%

echo.
echo [DONE] 모든 작업이 완료됨! 엔터 치면 종료됨.
echo.
pause > nul
exit
