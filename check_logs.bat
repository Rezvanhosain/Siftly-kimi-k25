@echo off
echo Checking Siftly Docker logs for errors...
echo.
echo If you see "Cannot find module '@/app/generated/prisma/client'" 
echo or database-related errors, the Prisma client needs to be generated.
echo.

cd /d "E:\SiftlyKimi\Siftly-kimi-k25-main\docker"
docker-compose logs --tail=50 app

echo.
pause
