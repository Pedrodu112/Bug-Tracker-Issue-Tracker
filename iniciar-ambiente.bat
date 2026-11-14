@echo off
setlocal EnableExtensions
title Ambiente PPW - IssueFlow

REM A pasta-base e sempre a raiz do repositorio, independentemente do local do clone.
set "BASE=%~dp0"

REM Prioriza qualquer Node.js 24 portatil na raiz; caso contrario, usa o Node do PATH.
set "PORTABLE_NODE="
for /d %%D in ("%BASE%node-v24.*-win-x64") do (
    if exist "%%~fD\node.exe" set "PORTABLE_NODE=%%~fD"
)
if defined PORTABLE_NODE set "PATH=%PORTABLE_NODE%;%PATH%"

where node.exe >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado.
    echo Instale Node.js 24 ou coloque node-v24.x-win-x64 na raiz do projeto.
    goto ERRO_FINAL
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo [ERRO] npm.cmd nao encontrado no PATH.
    echo Reinstale o Node.js 24 marcando a opcao de instalar o npm.
    goto ERRO_FINAL
)

set "NODE_MAJOR="
for /f "tokens=1 delims=v." %%V in ('node -v') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
    echo [ERRO] Nao foi possivel identificar a versao do Node.js.
    goto ERRO_FINAL
)
if %NODE_MAJOR% LSS 24 (
    echo [ERRO] Este projeto exige Node.js 24 ou superior.
    echo Versao encontrada:
    node -v
    echo Instale Node.js 24 ou use uma versao portatil na raiz do projeto.
    goto ERRO_FINAL
)

echo.
echo ============================================
echo             AMBIENTE ISSUEFLOW
echo ============================================
echo.
echo [OK] Node.js:
node -v
echo [OK] npm:
call npm.cmd --version
echo.

if not exist "%BASE%ppw_server\package.json" (
    echo [ERRO] Pasta ppw_server ou package.json nao encontrada.
    goto ERRO_FINAL
)
if not exist "%BASE%ppw_server\package-lock.json" (
    echo [ERRO] ppw_server\package-lock.json nao encontrado.
    goto ERRO_FINAL
)
if not exist "%BASE%ppw_client\package.json" (
    echo [ERRO] Pasta ppw_client ou package.json nao encontrada.
    goto ERRO_FINAL
)
if not exist "%BASE%ppw_client\package-lock.json" (
    echo [ERRO] ppw_client\package-lock.json nao encontrado.
    goto ERRO_FINAL
)

echo Verificando dependencias...
call :INSTALL_BACKEND
if errorlevel 1 goto ERRO_FINAL
call :INSTALL_FRONTEND
if errorlevel 1 goto ERRO_FINAL

:MENU
echo.
echo ============================================
echo                ISSUEFLOW
echo ============================================
echo.
echo [1] Iniciar BACKEND
echo [2] Iniciar FRONTEND
echo [3] Iniciar BACKEND + FRONTEND
echo [4] Reinstalar dependencias
echo [5] Preparar banco (Prisma + migracoes + seed)
echo [6] Sair
echo.
set "OPCAO="
set /p OPCAO=Escolha uma opcao:

if "%OPCAO%"=="1" goto BACKEND
if "%OPCAO%"=="2" goto FRONTEND
if "%OPCAO%"=="3" goto AMBOS
if "%OPCAO%"=="4" goto REINSTALAR
if "%OPCAO%"=="5" goto PREPARAR_BANCO
if "%OPCAO%"=="6" goto SAIR

echo Opcao invalida.
goto MENU

:BACKEND
call :CHECK_DATABASE_CONFIG
if errorlevel 1 goto MENU
echo.
echo Iniciando backend na porta 8000...
start "IssueFlow - Backend" cmd /k "cd /d ""%BASE%ppw_server"" && npm.cmd run start:dev"
goto FIM

:FRONTEND
echo.
echo Iniciando frontend na porta 3000...
start "IssueFlow - Frontend" cmd /k "cd /d ""%BASE%ppw_client"" && npm.cmd run dev"
goto FIM

:AMBOS
call :CHECK_DATABASE_CONFIG
if errorlevel 1 goto MENU
echo.
echo Iniciando backend na porta 8000...
start "IssueFlow - Backend" cmd /k "cd /d ""%BASE%ppw_server"" && npm.cmd run start:dev"
timeout /t 3 /nobreak >nul
echo Iniciando frontend na porta 3000...
start "IssueFlow - Frontend" cmd /k "cd /d ""%BASE%ppw_client"" && npm.cmd run dev"
goto FIM

:REINSTALAR
echo.
echo Reinstalando dependencias do backend...
call :INSTALL_BACKEND FORCE
if errorlevel 1 goto ERRO_FINAL
echo.
echo Reinstalando dependencias do frontend...
call :INSTALL_FRONTEND FORCE
if errorlevel 1 goto ERRO_FINAL
echo.
echo [OK] Dependencias reinstaladas.
goto MENU

:PREPARAR_BANCO
call :CHECK_DATABASE_CONFIG
if errorlevel 1 goto MENU
echo.
echo Esta etapa conecta ao PostgreSQL configurado em ppw_server\.env.
echo Confirme que a VPN institucional esta conectada, se necessaria.
echo.
pushd "%BASE%ppw_server"

echo [1/3] Gerando Prisma Client...
call npm.cmd run prisma:generate
if errorlevel 1 (
    popd
    echo [ERRO] Falha ao gerar o Prisma Client.
    pause
    goto MENU
)

echo.
echo [2/3] Aplicando migracoes versionadas...
call npm.cmd run prisma:migrate:deploy
if errorlevel 1 (
    popd
    echo [ERRO] Falha ao aplicar as migracoes.
    pause
    goto MENU
)

echo.
echo [3/3] Executando seed...
call npm.cmd run prisma:seed
if errorlevel 1 (
    popd
    echo [ERRO] Falha ao executar o seed.
    pause
    goto MENU
)

popd
echo.
echo [OK] Banco preparado.
goto MENU

:INSTALL_BACKEND
if /I not "%~1"=="FORCE" (
    if exist "%BASE%ppw_server\node_modules\.bin\nest.cmd" if exist "%BASE%ppw_server\node_modules\.bin\prisma.cmd" (
        echo [OK] Dependencias do backend ja estao instaladas.
        exit /b 0
    )
)
echo Instalando dependencias do backend com npm ci...
pushd "%BASE%ppw_server"
call npm.cmd ci --fetch-retries=5 --fetch-timeout=120000
if errorlevel 1 (
    popd
    echo [ERRO] npm ci falhou no backend. Verifique a internet/proxy e execute o inicializador novamente.
    exit /b 1
)
popd
if not exist "%BASE%ppw_server\node_modules\.bin\nest.cmd" (
    echo [ERRO] Nest CLI nao encontrado apos a instalacao.
    exit /b 1
)
if not exist "%BASE%ppw_server\node_modules\.bin\prisma.cmd" (
    echo [ERRO] Prisma CLI nao encontrado apos a instalacao.
    exit /b 1
)
echo [OK] Backend preparado.
exit /b 0

:INSTALL_FRONTEND
if /I not "%~1"=="FORCE" (
    if exist "%BASE%ppw_client\node_modules\.bin\next.cmd" (
        echo [OK] Dependencias do frontend ja estao instaladas.
        exit /b 0
    )
)
echo Instalando dependencias do frontend com npm ci...
pushd "%BASE%ppw_client"
call npm.cmd ci --fetch-retries=5 --fetch-timeout=120000
if errorlevel 1 (
    popd
    echo [ERRO] npm ci falhou no frontend. Verifique a internet/proxy e execute o inicializador novamente.
    exit /b 1
)
popd
if not exist "%BASE%ppw_client\node_modules\.bin\next.cmd" (
    echo [ERRO] Next CLI nao encontrado apos a instalacao.
    exit /b 1
)
echo [OK] Frontend preparado.
exit /b 0

:CHECK_DATABASE_CONFIG
if not exist "%BASE%ppw_server\.env" (
    echo [ATENCAO] ppw_server\.env nao existe.
    copy "%BASE%ppw_server\.env.example" "%BASE%ppw_server\.env" >nul
    if errorlevel 1 (
        echo [ERRO] Nao foi possivel criar .env a partir de .env.example.
        exit /b 1
    )
    echo Foi criado ppw_server\.env a partir do modelo.
    echo Preencha DATABASE_URL com os dados da sua conta e salve o arquivo.
    start "" notepad.exe "%BASE%ppw_server\.env"
    pause
    exit /b 1
)

findstr /B /C:"DATABASE_URL=" "%BASE%ppw_server\.env" >nul
if errorlevel 1 (
    echo [ERRO] DATABASE_URL nao foi encontrado em ppw_server\.env.
    echo Confira o arquivo de configuracao antes de iniciar o backend.
    start "" notepad.exe "%BASE%ppw_server\.env"
    pause
    exit /b 1
)

findstr /L /C:"USUARIO:SENHA@" "%BASE%ppw_server\.env" >nul
if not errorlevel 1 (
    echo [ERRO] DATABASE_URL ainda contem os valores de exemplo.
    echo Edite ppw_server\.env e informe os dados reais do PostgreSQL.
    start "" notepad.exe "%BASE%ppw_server\.env"
    pause
    exit /b 1
)
findstr /L /C:"HOST:PORTA" "%BASE%ppw_server\.env" >nul
if not errorlevel 1 (
    echo [ERRO] HOST e PORTA ainda nao foram configurados em DATABASE_URL.
    start "" notepad.exe "%BASE%ppw_server\.env"
    pause
    exit /b 1
)
exit /b 0

:FIM
echo.
echo Comandos iniciados em janelas separadas.
echo Frontend: http://localhost:3000
echo API:      http://localhost:8000
echo Feche as janelas de cada servico para encerra-los.
pause
exit /b 0

:ERRO_FINAL
echo.
echo A inicializacao foi interrompida. Corrija o item indicado acima.
pause
exit /b 1

:SAIR
exit /b 0
