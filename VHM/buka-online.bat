@echo off
echo ========================================================
echo   Membuka Website VHM SUB 2 ke Publik / Online
echo ========================================================
echo.
echo 1. Memastikan server lokal aktif...
start /B node server.js
timeout /t 2 /nobreak >nul
echo.
echo 2. Menghubungkan ke tunnel online publik...
cmd.exe /c "npx --yes localtunnel --port 3000"
pause

