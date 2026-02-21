@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

title img2webp Image Converter (vibeCoding)

:: src/node_modules 확인 및 자동 설치
if not exist "src\node_modules" (
    echo [INFO] 필요한 패키지가 없어서 설치를 시작합니다...
    pushd src
    call npm install
    popd
    if %errorlevel% neq 0 (
        echo [ERR] npm install 중 오류가 발생했습니다. Node.js가 설치되어 있는지 확인해 주세요.
        pause
        exit /b
    )
)

:: src 폴더의 스크립트 실행
node src/convert.js

echo.
echo [INFO] 엔터를 누르면 종료됩니다.
pause > nul
exit
