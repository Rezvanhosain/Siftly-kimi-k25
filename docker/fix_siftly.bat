@echo off
echo Fixing Siftly Database Issues...
echo.

cd /d "E:\SiftlyKimi\Siftly-kimi-k25-main\docker"

echo Step 1: Checking if container is running...
docker ps | findstr siftly

echo.
echo Step 2: Generating Prisma client...
docker-compose -f docker-compose.yml exec -T app npx prisma generate

echo.
echo Step 3: Running database migrations...
docker-compose -f docker-compose.yml exec -T app npx prisma migrate deploy

echo.
echo Step 4: Restarting Siftly...
docker-compose -f docker-compose.yml restart

echo.
echo Done! Wait 10 seconds for Siftly to restart.
echo Then try importing your bookmarks again.
pause
