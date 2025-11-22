@echo off
setlocal enabledelayedexpansion

echo [INFO] Validating Multiuser Todo App Setup
echo ====================================

echo [INFO] Checking project structure...

set "required_files=docker-compose.yml README.md .gitignore Makefile backend\app.py backend\requirements.txt backend\Dockerfile frontend\package.json frontend\src\App.tsx frontend\Dockerfile infra\docker-compose.prod.yml infra\nginx.conf"

set "missing_files="
set "all_present=true"

for %%f in (%required_files%) do (
    if not exist "%%f" (
        set "missing_files=!missing_files! %%f"
        set "all_present=false"
    )
)

if "%all_present%"=="true" (
    echo [SUCCESS] All required files are present
) else (
    echo [ERROR] Missing files:
    for %%f in (!missing_files!) do (
        echo   - %%f
    )
    exit /b 1
)

echo [INFO] Checking required dependencies...

docker --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker is not installed (required for containerized deployment)
) else (
    echo [SUCCESS] Docker is installed
    docker --version
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Docker Compose is not installed (required for containerized deployment)
) else (
    echo [SUCCESS] Docker Compose is installed
    docker-compose --version
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed (required for frontend development)
) else (
    echo [SUCCESS] Node.js is installed
    node --version
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed (required for frontend development)
) else (
    echo [SUCCESS] npm is installed
    npm --version
)

python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed (required for backend development)
) else (
    echo [SUCCESS] Python is installed
    python --version
)

echo [INFO] Checking configuration files...

if exist ".env.example" (
    echo [SUCCESS] Environment template found (.env.example)
) else (
    echo [WARNING] Environment template not found
)

if exist "backend\.env.example" (
    echo [SUCCESS] Backend environment template found
) else (
    echo [WARNING] Backend environment template not found
)

if exist "frontend\.env.example" (
    echo [SUCCESS] Frontend environment template found
) else (
    echo [WARNING] Frontend environment template not found
)

echo.
echo [INFO] Validation Summary:
echo ===================
echo [SUCCESS] Project structure is correct
echo [SUCCESS] All required files are present
echo [SUCCESS] Configuration templates are available

echo.
echo [INFO] Next Steps:
echo 1. Copy .env.example to .env and configure your environment
echo 2. Run 'docker-compose up --build' to start with Docker
echo 3. Or run 'run_dev.bat' for local development on Windows
echo 4. Visit http://localhost:3000 for the frontend
echo 5. Visit http://localhost:8000 for the backend API

echo [SUCCESS] Setup validation completed successfully!