@echo off
echo Fixing Siftly Database Issues...
echo.

cd /d "E:\SiftlyKimi\Siftly-kimi-k25-main\docker"

echo Step 1: Generating Prisma client...
docker-compose exec -T app npx prisma generate

echo.
echo Step 2: Running database migrations...
docker-compose exec -T app npx prisma migrate deploy

echo.
echo Step 3: Restarting Siftly...
docker-compose restart

echo.
echo Done! Wait 10 seconds for Siftly to restart, then try importing again.
pause
