@echo off
echo Fixing Siftly Database Issues...
echo.

cd /d "E:\SiftlyKimi\Siftly-kimi-k25-main\docker"

echo Checking Docker Compose version...
docker compose version >nul 2>&1
if %errorlevel% equ 0 (
    echo Using: docker compose (v2)
    set COMPOSE_CMD=docker compose
) else (
    echo Using: docker-compose (v1)
    set COMPOSE_CMD=docker-compose -f docker-compose.yml
)

echo.
echo Step 1: Checking if container is running...
docker ps | findstr siftly

echo.
echo Step 2: Generating Prisma client...
%COMPOSE_CMD% exec app npx prisma generate

echo.
echo Step 3: Running database migrations...
%COMPOSE_CMD% exec app npx prisma migrate deploy

echo.
echo Step 4: Restarting Siftly...
%COMPOSE_CMD% restart

echo.
echo Done! Wait 10 seconds for Siftly to restart.
echo Then try importing your bookmarks again.
pause
