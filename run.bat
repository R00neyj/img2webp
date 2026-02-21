@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

title img2webp Image Converter (vibeCoding)

:: src/node_modules 확인 및 자동 설치
if not exist "src\node_modules" (
    echo [INFO] 필요한 패키지가 없어서 설치를 시작합니다
    pushd src
    call npm install
    popd
    if %errorlevel% neq 0 (
        echo [ERR] npm install 중 오류가 발생했습니다 Node.js가 설치되어 있는지 확인해 주세요
        pause
        exit /b
    )
)

:: input 폴더 확인 및 생성
if not exist "input" (
    echo [INFO] input 폴더가 없어서 생성합니다
    mkdir "input"
)

:: output 폴더 확인 및 생성
if not exist "output" (
    echo [INFO] output 폴더가 없어서 생성합니다
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
echo   [4] 직접 입력 (1~100 사이 숫자 입력)
echo.
echo   [0] 종료
echo.
echo ============================================
set "choice=2"
set /p choice="번호를 입력하고 엔터를 눌러 주세요 (기본값 2): "

set "quality="
if "%choice%"=="1" set "quality=high"
if "%choice%"=="2" set "quality=mid"
if "%choice%"=="3" set "quality=low"
if "%choice%"=="4" (
    set /p custom_q="원하는 퀄리티 숫자를 입력하세요 (1-100): "
    set "quality=!custom_q!"
)
if "%choice%"=="0" exit

if not defined quality (
    echo [ERR] 잘못된 번호입니다 다시 입력해 주세요
    timeout /t 2 > nul
    goto menu
)

echo.
echo [START] %quality% 모드로 변환을 시작합니다
echo.

:: src 폴더의 스크립트 실행
node src/convert.js %quality%

echo.
echo [DONE] 모든 작업이 완료되었습니다! 엔터를 누르면 종료됩니다
echo.
pause > nul
exit
