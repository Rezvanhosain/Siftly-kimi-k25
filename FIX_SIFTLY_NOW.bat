@echo off
echo ============================================
echo Siftly Database Fix - Auto-Detection
echo ============================================
echo.

cd /d "E:\SiftlyKimi\Siftly-kimi-k25-main\docker"

REM Check if Siftly is running
echo Checking if Siftly is running...
docker ps | findstr "siftly" >nul
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Siftly container is NOT running!
    echo Starting Siftly now...
    docker-compose up -d
    echo Waiting 10 seconds for startup...
    timeout /t 10 /nobreak >nul
)

REM Check which Docker Compose version is available
echo.
echo Detecting Docker Compose version...

docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    echo Found: docker compose (v2) - Using this one
    set COMPOSE_CMD=docker compose
) else (
    docker-compose version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Found: docker-compose (v1) - Using this one
        set COMPOSE_CMD=docker-compose
    ) else (
        echo ERROR: Docker Compose not found!
        echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo Step 1: Generating Prisma Client
echo ============================================
%COMPOSE_CMD% exec -T app npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo Step 2: Running Database Migrations
echo ============================================
%COMPOSE_CMD% exec -T app npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo [ERROR] Database migration failed!
    pause
    exit /b 1
)

echo.
echo ============================================
echo Step 3: Restarting Siftly
echo ============================================
%COMPOSE_CMD% restart

echo.
echo ============================================
echo SUCCESS! Siftly has been fixed!
echo ============================================
echo.
echo Please wait 10 seconds for Siftly to fully restart,
echo then refresh your browser and try importing again.
echo.
pause
