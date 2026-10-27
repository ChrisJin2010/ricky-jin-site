@echo off
chcp 65001 >nul
echo ========================================
echo   Ricky Jin Site - 一键保存到 Git
echo ========================================
echo.

REM 定位到脚本所在目录
cd /d "%~dp0"

REM 找 git
set GIT=
if exist "%LOCALAPPDATA%\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" (
    for /f "delims=" %%i in ('dir /b /on "%LOCALAPPDATA%\GitHubDesktop" 2^>nul ^| findstr "^app-"') do (
        set "GIT=%LOCALAPPDATA%\GitHubDesktop\%%i\resources\app\git\cmd\git.exe"
        goto :foundgit
    )
)
for /f "delims=" %%i in ('where git 2^>nul') do (
    set "GIT=%%i" & goto :foundgit
)
:foundgit

if not defined GIT (
    echo [错误] 没找到 git，请安装 GitHub Desktop 或 Git for Windows。
    pause & exit /b 1
)

"%GIT%" status --short >nul 2>&1
if errorlevel 1 (
    echo [错误] 当前目录不是 git 仓库。请确保在 ricky-jin-site 文件夹里运行本脚本。
    pause & exit /b 1
)

REM 添加所有改动（编辑器只会改 content.json 和 assets/img/ 下的文件）
echo [1/3] 暂存改动...
"%GIT%" add content.json assets/img/ 2>nul

set /a CHANGES=0
for /f "tokens=*" %%a in ('"%GIT%" status --porcelain ^| find /c /v ""') do set CHANGES=%%a

if %CHANGES%==0 (
    echo.
    echo 没有新改动。
    pause & exit /b 0
)

echo [2/3] 检测到 %CHANGES% 个改动，正在提交...
for /f "delims=" %%d in ('powershell -Command "Get-Date -Format 'yyyy-MM-dd HH:mm'"') do set NOW=%%d
"%GIT%" commit -m "Editor save at %NOW%"

if errorlevel 1 (
    echo [错误] 提交失败，请检查上面的输出。
    pause & exit /b 1
)

echo.
echo [3/3] 提交成功！改动已保存在本地 git。
echo.
echo ========================================
echo   现在打开 GitHub Desktop，点右上角 "Push origin" 就上线了。
echo ========================================
echo.
pause
