@echo off
setlocal
title Ambiente PPW - IssueFlow

REM A pasta-base sempre e a raiz do repositorio, independentemente do local do clone.
set "BASE=%~dp0"
set "PORTABLE_NODE=%BASE%node-v24.21.0-win-x64"

REM Prioriza o Node portatil caso esteja presente; caso contrario, usa o Node do PATH.
if exist "%PORTABLE_NODE%\node.exe" set "PATH=%PORTABLE_NODE%;%PATH%"

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo Instale Node.js 24 ou coloque node-v24.21.0-win-x64 na raiz do projeto.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERRO] npm nao encontrado no PATH.
    pause
    exit /b 1
)

echo.
echo ============================================
echo          AMBIENTE PPW - ISSUEFLOW
echo ============================================
echo.
echo [OK] Node.js:
node -v
echo [OK] npm:
call npm.cmd -v
echo.

if not exist "%BASE%ppw_server\package.json" (
    echo [ERRO] Pasta ppw_server nao encontrada na raiz do repositorio.
    pause
    exit /b 1
)

if not exist "%BASE%ppw_client\package.json" (
    echo [ERRO] Pasta ppw_client nao encontrada na raiz do repositorio.
    pause
    exit /b 1
)

if not exist "%BASE%ppw_server\node_modules" (
    echo Instalando dependencias do backend...
    cd /d "%BASE%ppw_server"
    call npm.cmd ci
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias do backend.
        pause
        exit /b 1
    )
)

if not exist "%BASE%ppw_client\node_modules" (
    echo Instalando dependencias do frontend...
    cd /d "%BASE%ppw_client"
    call npm.cmd ci
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias do frontend.
        pause
        exit /b 1
    )
)

:MENU
echo.
echo ============================================
echo             AMBIENTE PRONTO
echo ============================================
echo.
echo [1] Iniciar BACKEND
echo [2] Iniciar FRONTEND
echo [3] Iniciar BACKEND + FRONTEND
echo [4] Apenas configurar ambiente
echo [5] Sair
echo.
set /p OPCAO=Escolha uma opcao:

if "%OPCAO%"=="1" goto BACKEND
if "%OPCAO%"=="2" goto FRONTEND
if "%OPCAO%"=="3" goto AMBOS
if "%OPCAO%"=="4" goto FIM
if "%OPCAO%"=="5" goto SAIR

echo Opcao invalida.
goto MENU

:BACKEND
start "IssueFlow - Backend" cmd /k "cd /d ""%BASE%ppw_server"" && npm.cmd run start:dev"
goto FIM

:FRONTEND
start "IssueFlow - Frontend" cmd /k "cd /d ""%BASE%ppw_client"" && npm.cmd run dev"
goto FIM

:AMBOS
start "IssueFlow - Backend" cmd /k "cd /d ""%BASE%ppw_server"" && npm.cmd run start:dev"
timeout /t 2 /nobreak >nul
start "IssueFlow - Frontend" cmd /k "cd /d ""%BASE%ppw_client"" && npm.cmd run dev"
goto FIM

:FIM
echo.
echo Configuracao concluida.
pause
exit /b 0

:SAIR
exit /b 0
