#!/bin/bash

# Deployment script for production environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check required commands
if ! command_exists docker; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

print_status "Starting production deployment..."

# Check if .env file exists
if [ ! -f ".env.prod" ]; then
    print_warning ".env.prod file not found. Creating from template..."
    cat > .env.prod << EOF
# Production Environment Variables
DB_PASSWORD=your-secure-database-password
JWT_SECRET=your-super-secret-jwt-key-for-production
POSTGRES_DB=tododb
POSTGRES_USER=postgres
EOF
    print_warning "Please edit .env.prod with your production values before continuing."
    exit 1
fi

# Load environment variables
export $(cat .env.prod | grep -v '^#' | xargs)

print_status "Building production images..."
docker-compose -f infra/docker-compose.prod.yml build --no-cache

print_status "Starting production services..."
docker-compose -f infra/docker-compose.prod.yml up -d

print_status "Waiting for services to be healthy..."
sleep 30

# Check if services are running
if docker-compose -f infra/docker-compose.prod.yml ps | grep -q "Up"; then
    print_success "Production deployment completed successfully!"
    echo ""
    print_status "Services are running at:"
    echo "  - Application: http://localhost"
    echo "  - API: http://localhost/api"
    echo ""
    print_status "To view logs: docker-compose -f infra/docker-compose.prod.yml logs -f"
    print_status "To stop: docker-compose -f infra/docker-compose.prod.yml down"
else
    print_error "Some services failed to start. Check logs with:"
    echo "docker-compose -f infra/docker-compose.prod.yml logs"
    exit 1
fi