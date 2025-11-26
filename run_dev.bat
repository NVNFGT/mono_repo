@echo off
echo Starting Multiuser Todo App...

REM ----------------------------
REM Activate Python Virtual Env
REM ----------------------------
IF NOT DEFINED VIRTUAL_ENV (
    echo Activating virtual environment...
    call .venv\Scripts\activate.bat
) ELSE (
    echo Virtual environment already active.
)

REM ----------------------------
REM Start Backend (Sanic / Python)
REM ----------------------------
echo Starting Backend...
start cmd /k "cd /d %~dp0 && python backend\app.py"

REM ----------------------------
REM Start Frontend (React / Vite)
REM ----------------------------
echo Starting Frontend...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo All services launched!
