@echo off
setlocal enabledelayedexpansion

echo [INFO] Starting Multiuser Todo App Development Environment
echo ================================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed or not in PATH
    exit /b 1
)

echo [SUCCESS] All required dependencies found

REM Start backend
echo [INFO] Starting backend server...
cd backend

REM Check if virtual environment exists
if not exist "venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
pip install -r requirements.txt >nul 2>&1

REM Start backend in background
echo [INFO] Starting Sanic backend on port 8000...
start "Backend Server" cmd /k "D:/POC/multiuser-todo-app/.venv/Scripts/python.exe app.py"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

cd ..

REM Start frontend
echo [INFO] Starting frontend server...
cd frontend

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
npm install >nul 2>&1

REM Start frontend in new window
echo [INFO] Starting React frontend on port 5173...
start "Frontend Server" cmd /k "npm run dev"

cd ..

echo.
echo [SUCCESS] Development environment is ready!
echo ================================================
echo [INFO] Services starting in separate windows:
echo   - Backend:  http://localhost:8000 (Sanic server)
echo   - Frontend: http://localhost:5173 (Vite dev server)
echo.
echo [INFO] Both services are running in separate command windows.
echo [INFO] Close those windows or press Ctrl+C in them to stop services.
echo.
echo [INFO] You can now:
echo   1. Visit http://localhost:5173 for the app
echo   2. Test API at http://localhost:8000/health
echo   3. Register/login and create tasks
echo.
pause