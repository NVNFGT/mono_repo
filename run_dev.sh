#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to cleanup background processes
cleanup() {
    print_status "Cleaning up background processes..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

print_status "Starting Multiuser Todo App Development Environment"
echo "================================================"

# Check required commands
if ! command_exists python3 && ! command_exists python; then
    print_error "Python is not installed or not in PATH"
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is not installed or not in PATH"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed or not in PATH"
    exit 1
fi

# Set Python command (prefer python3)
PYTHON_CMD="python3"
if ! command_exists python3; then
    PYTHON_CMD="python"
fi

print_success "All required dependencies found"

# Start backend
print_status "Starting backend server..."
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    $PYTHON_CMD -m venv venv
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install backend dependencies
print_status "Installing backend dependencies..."
pip install -r requirements.txt >/dev/null 2>&1

# Start backend in background
print_status "Starting Sanic backend on port 8000..."
$PYTHON_CMD app.py &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Check if backend is running
if ps -p $BACKEND_PID > /dev/null; then
    print_success "Backend started successfully (PID: $BACKEND_PID)"
else
    print_error "Failed to start backend"
    exit 1
fi

cd ..

# Start frontend
print_status "Starting frontend server..."
cd frontend

# Install frontend dependencies
print_status "Installing frontend dependencies..."
npm install >/dev/null 2>&1

# Start frontend in background
print_status "Starting React frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

# Wait a bit for frontend to start
sleep 5

# Check if frontend is running
if ps -p $FRONTEND_PID > /dev/null; then
    print_success "Frontend started successfully (PID: $FRONTEND_PID)"
else
    print_warning "Frontend may not have started properly (PID: $FRONTEND_PID)"
fi

cd ..

echo ""
print_success "Development environment is ready!"
echo "================================================"
print_status "Services running:"
echo "  - Backend:  http://localhost:8000"
echo "  - Frontend: http://localhost:3000"
echo ""
print_status "Press Ctrl+C to stop all services"
echo ""

# Keep script running and wait for user interrupt
wait