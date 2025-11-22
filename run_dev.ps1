# PowerShell script to run both backend and frontend
param(
    [switch]$Stop,
    [switch]$Status
)

# Colors for output
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Success { param($msg) Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "[WARNING] $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Function to check if a process is running on a specific port
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

# Function to stop services
function Stop-Services {
    Write-Info "Stopping all services..."
    
    # Kill Python processes (backend)
    Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -match "Backend Server"} | Stop-Process -Force
    Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force
    
    # Kill Node processes (frontend)
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
    
    Write-Success "All services stopped"
}

# Function to check status
function Get-ServiceStatus {
    Write-Info "Checking service status..."
    
    $backendRunning = Test-Port -Port 8000
    $frontendRunning = Test-Port -Port 5173
    
    Write-Host "`nService Status:" -ForegroundColor Cyan
    Write-Host "===============" -ForegroundColor Cyan
    
    if ($backendRunning) {
        Write-Success "✅ Backend (Port 8000): Running"
    } else {
        Write-Warning "❌ Backend (Port 8000): Not running"
    }
    
    if ($frontendRunning) {
        Write-Success "✅ Frontend (Port 5173): Running"
    } else {
        Write-Warning "❌ Frontend (Port 5173): Not running"
    }
    
    if ($backendRunning -and $frontendRunning) {
        Write-Success "`n🎉 Both services are running!"
        Write-Info "Frontend: http://localhost:5173"
        Write-Info "Backend API: http://localhost:8000"
    }
}

# Handle command line arguments
if ($Stop) {
    Stop-Services
    exit
}

if ($Status) {
    Get-ServiceStatus
    exit
}

# Main execution
Write-Info "Starting Multiuser Todo App Development Environment"
Write-Host "====================================================" -ForegroundColor Cyan

# Check if services are already running
if ((Test-Port -Port 8000) -or (Test-Port -Port 5173)) {
    Write-Warning "Some services appear to be already running."
    $response = Read-Host "Do you want to stop them first? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Stop-Services
        Start-Sleep -Seconds 2
    }
}

# Check prerequisites
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH"
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed or not in PATH"
    exit 1
}

Write-Success "All prerequisites found"

# Start backend
Write-Info "Setting up backend environment..."
Push-Location backend

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Info "Creating Python virtual environment..."
    python -m venv venv
}

# Install dependencies if needed
if (-not (Test-Path "venv\Lib\site-packages\sanic")) {
    Write-Info "Installing backend dependencies..."
    & "D:\POC\multiuser-todo-app\.venv\Scripts\pip.exe" install -r requirements.txt
}

# Start backend in new PowerShell window
Write-Info "Starting Sanic backend on port 8000..."
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; D:/POC/multiuser-todo-app/.venv/Scripts/python.exe app.py" -WindowStyle Normal -PassThru

Pop-Location

# Wait for backend to start
Write-Info "Waiting for backend to initialize..."
$timeout = 30
$elapsed = 0
while (-not (Test-Port -Port 8000) -and $elapsed -lt $timeout) {
    Start-Sleep -Seconds 1
    $elapsed++
}

if (Test-Port -Port 8000) {
    Write-Success "Backend started successfully!"
} else {
    Write-Error "Backend failed to start within $timeout seconds"
    exit 1
}

# Start frontend
Write-Info "Setting up frontend environment..."
Push-Location frontend

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing frontend dependencies..."
    npm install
}

# Start frontend in new PowerShell window
Write-Info "Starting React frontend on port 5173..."
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal -PassThru

Pop-Location

# Wait for frontend to start
Write-Info "Waiting for frontend to initialize..."
$timeout = 30
$elapsed = 0
while (-not (Test-Port -Port 5173) -and $elapsed -lt $timeout) {
    Start-Sleep -Seconds 1
    $elapsed++
}

if (Test-Port -Port 5173) {
    Write-Success "Frontend started successfully!"
} else {
    Write-Warning "Frontend may not have started properly"
}

# Final status
Write-Host "`n" -NoNewline
Write-Success "🎉 Development environment is ready!"
Write-Host "====================================================" -ForegroundColor Cyan
Write-Info "Services running:"
Write-Host "  🌐 Frontend: " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Yellow
Write-Host "  🔧 Backend:  " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Yellow
Write-Host "  ❤️  Health:   " -NoNewline; Write-Host "http://localhost:8000/health" -ForegroundColor Yellow

Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "  .\run_dev.ps1 -Status    # Check service status"
Write-Host "  .\run_dev.ps1 -Stop      # Stop all services"

Write-Host "`n✨ Happy coding!" -ForegroundColor Green