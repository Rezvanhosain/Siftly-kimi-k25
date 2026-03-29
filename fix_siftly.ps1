# Siftly Database Fix Script
# Run this in PowerShell

# Navigate to docker folder
Set-Location "E:\SiftlyKimi\Siftly-kimi-k25-main\docker"

Write-Host "Step 1: Checking if Siftly is running..." -ForegroundColor Green
$running = docker ps | Select-String "siftly"
if (-not $running) {
    Write-Host "Siftly not running. Starting now..." -ForegroundColor Yellow
    docker-compose up -d
    Write-Host "Waiting 10 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "Step 2: Detecting Docker Compose version..." -ForegroundColor Green

try {
    $null = docker compose version 2>$null
    Write-Host "Using: docker compose (v2)" -ForegroundColor Cyan
    $compose = "docker compose"
} catch {
    Write-Host "Using: docker-compose (v1)" -ForegroundColor Cyan
    $compose = "docker-compose"
}

Write-Host ""
Write-Host "Step 3: Generating Prisma Client..." -ForegroundColor Green
Invoke-Expression "$compose exec app npx prisma generate"

Write-Host ""
Write-Host "Step 4: Running Database Migrations..." -ForegroundColor Green
Invoke-Expression "$compose exec app npx prisma migrate deploy"

Write-Host ""
Write-Host "Step 5: Restarting Siftly..." -ForegroundColor Green
Invoke-Expression "$compose restart"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "DONE! Wait 10 seconds then refresh browser" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

Read-Host "Press Enter to close"
