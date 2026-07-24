@echo off
echo ==========================================
echo   HEALTH HORIZON AI - SYSTEM STARTUP
echo ==========================================
echo.

:: 1. Start Python FastAPI Backend (Port 8000)
echo [1/3] Launching Python FastAPI Backend...
start "FastAPI Backend" cmd /k "cd backend && ..\.venv\Scripts\python.exe -m uvicorn main:app --port 8000 --reload"

:: 2. Start Node.js Express API Server (Port 8080)
echo [2/3] Launching Node.js Express Server...
start "Express API" cmd /k "cd backend && node server.js"

:: 3. Start Frontend Application (Port 5501)
echo [3/3] Launching Frontend Server...
start "Frontend Web" cmd /k "cd Wave5\Wave && python -m http.server 5501"

echo.
echo ==========================================
echo   ALL SYSTEMS INITIATED
echo ==========================================
echo Frontend: http://localhost:5501/dashboard.html
echo FastAPI:  http://localhost:8000/docs
echo Express:  http://localhost:8080/api/signals
echo ==========================================
pause
