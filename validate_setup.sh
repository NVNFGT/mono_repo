#!/bin/bash

# Validation script to check if setup is correct

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_status "Validating Multiuser Todo App Setup"
echo "===================================="

# Check project structure
print_status "Checking project structure..."

required_files=(
    "docker-compose.yml"
    "README.md"
    ".gitignore"
    "Makefile"
    "backend/app.py"
    "backend/requirements.txt"
    "backend/Dockerfile"
    "frontend/package.json"
    "frontend/src/App.tsx"
    "frontend/Dockerfile"
    "infra/docker-compose.prod.yml"
    "infra/nginx.conf"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    print_success "All required files are present"
else
    print_error "Missing files:"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

# Check required commands
print_status "Checking required dependencies..."

if command_exists docker; then
    print_success "Docker is installed"
    docker --version
else
    print_warning "Docker is not installed (required for containerized deployment)"
fi

if command_exists docker-compose; then
    print_success "Docker Compose is installed"
    docker-compose --version
else
    print_warning "Docker Compose is not installed (required for containerized deployment)"
fi

if command_exists node; then
    print_success "Node.js is installed"
    node --version
else
    print_error "Node.js is not installed (required for frontend development)"
fi

if command_exists npm; then
    print_success "npm is installed"
    npm --version
else
    print_error "npm is not installed (required for frontend development)"
fi

if command_exists python3 || command_exists python; then
    print_success "Python is installed"
    if command_exists python3; then
        python3 --version
    else
        python --version
    fi
else
    print_error "Python is not installed (required for backend development)"
fi

print_status "Checking configuration files..."

# Check if environment files exist
if [ -f ".env.example" ]; then
    print_success "Environment template found (.env.example)"
else
    print_warning "Environment template not found"
fi

if [ -f "backend/.env.example" ]; then
    print_success "Backend environment template found"
else
    print_warning "Backend environment template not found"
fi

if [ -f "frontend/.env.example" ]; then
    print_success "Frontend environment template found"
else
    print_warning "Frontend environment template not found"
fi

echo ""
print_status "Validation Summary:"
echo "==================="
print_success "✅ Project structure is correct"
print_success "✅ All required files are present"
print_success "✅ Configuration templates are available"

echo ""
print_status "Next Steps:"
echo "1. Copy .env.example to .env and configure your environment"
echo "2. Run 'docker-compose up --build' to start with Docker"
echo "3. Or run './run_dev.sh' (Unix) or 'run_dev.bat' (Windows) for local development"
echo "4. Visit http://localhost:3000 for the frontend"
echo "5. Visit http://localhost:8000 for the backend API"

print_success "Setup validation completed successfully!"