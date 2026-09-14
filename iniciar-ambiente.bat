@echo off
title Ambiente PPW - IFSP

REM & "D:\Documentos\Documents\VScode\Bug-Tracker-Issue-Tracker\iniciar-ambiente.bat"

set "BASE=D:\Documentos\Documents\VScode\Bug-Tracker-Issue-Tracker"
set "NODE=D:\Documentos\Documents\VScode\node-v24.21.0-win-x64"

echo.
echo ============================================
echo          AMBIENTE PPW - IFSP
echo ============================================
echo.

REM ============================================
REM VERIFICAR NODE.JS
REM ============================================

if not exist "%NODE%\node.exe" (
    echo [ERRO] Node.js portatil nao encontrado.
    echo.
    echo Caminho esperado:
    echo %NODE%
    echo.
    pause
    exit /b 1
)

set "PATH=%NODE%;%PATH%"

echo [OK] Node.js:
node -v

echo [OK] npm:
call npm.cmd -v

echo.

REM ============================================
REM VERIFICAR PROJETOS
REM ============================================

if not exist "%BASE%\ppw_server\package.json" (
    echo [ERRO] ppw_server nao encontrado.
    echo.
    echo Verifique se a pasta ppw_server esta em:
    echo %BASE%
    echo.
    pause
    exit /b 1
)

echo [OK] ppw_server encontrado.

if not exist "%BASE%\ppw_client\package.json" (
    echo [ERRO] ppw_client nao encontrado.
    echo.
    echo Verifique se a pasta ppw_client esta em:
    echo %BASE%
    echo.
    pause
    exit /b 1
)

echo [OK] ppw_client encontrado.

echo.

REM ============================================
REM INSTALAR DEPENDENCIAS DO BACKEND
REM ============================================

if not exist "%BASE%\ppw_server\node_modules" (
    echo ============================================
    echo   Instalando dependencias do BACKEND...
    echo ============================================
    echo.

    cd /d "%BASE%\ppw_server"
    call npm.cmd install

    if errorlevel 1 (
        echo.
        echo [ERRO] Falha ao instalar dependencias do backend.
        pause
        exit /b 1
    )

    echo.
    echo [OK] Dependencias do backend instaladas.
    echo.
)

REM ============================================
REM INSTALAR DEPENDENCIAS DO FRONTEND
REM ============================================

if not exist "%BASE%\ppw_client\node_modules" (
    echo ============================================
    echo   Instalando dependencias do FRONTEND...
    echo ============================================
    echo.

    cd /d "%BASE%\ppw_client"
    call npm.cmd install

    if errorlevel 1 (
        echo.
        echo [ERRO] Falha ao instalar dependencias do frontend.
        pause
        exit /b 1
    )

    echo.
    echo [OK] Dependencias do frontend instaladas.
    echo.
)

REM ============================================
REM MENU
REM ============================================

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

echo.
echo [AVISO] Opcao invalida.
goto MENU

REM ============================================
REM BACKEND
REM ============================================

:BACKEND

echo.
echo ============================================
echo          INICIANDO BACKEND
echo ============================================
echo.

start "PPW - BACKEND" cmd /k "set PATH=%NODE%;%PATH% && cd /d %BASE%\ppw_server && npm.cmd run start:dev"

echo [OK] Backend iniciado em uma nova janela.
echo.
goto FIM

REM ============================================
REM FRONTEND
REM ============================================

:FRONTEND

echo.
echo ============================================
echo         INICIANDO FRONTEND
echo ============================================
echo.

start "PPW - FRONTEND" cmd /k "set PATH=%NODE%;%PATH% && cd /d %BASE%\ppw_client && npm.cmd run dev"

echo [OK] Frontend iniciado em uma nova janela.
echo.
goto FIM

REM ============================================
REM AMBOS
REM ============================================

:AMBOS

echo.
echo ============================================
echo       INICIANDO BACKEND + FRONTEND
echo ============================================
echo.

start "PPW - BACKEND" cmd /k "set PATH=%NODE%;%PATH% && cd /d %BASE%\ppw_server && npm.cmd run start:dev"

timeout /t 2 /nobreak >nul

start "PPW - FRONTEND" cmd /k "set PATH=%NODE%;%PATH% && cd /d %BASE%\ppw_client && npm.cmd run dev"

echo [OK] Backend e frontend iniciados.
echo.
goto FIM

REM ============================================
REM FINAL
REM ============================================

:FIM

echo.
echo ============================================
echo        CONFIGURACAO CONCLUIDA
echo ============================================
echo.
pause
exit /b 0

:SAIR

echo.
echo Encerrando...
exit /b 0