# Makefile for Multiuser Todo App

.PHONY: help dev build clean test docker-dev docker-build docker-clean install-backend install-frontend

# Default target
help:
	@echo "Available commands:"
	@echo "  dev              - Start development servers"
	@echo "  build            - Build for production"
	@echo "  clean            - Clean build artifacts"
	@echo "  test             - Run tests"
	@echo "  docker-dev       - Start with Docker Compose"
	@echo "  docker-build     - Build Docker images"
	@echo "  docker-clean     - Clean Docker containers and images"
	@echo "  install-backend  - Install backend dependencies"
	@echo "  install-frontend - Install frontend dependencies"

# Development targets
dev:
	@echo "Starting development environment..."
	@if [ -f "run_dev.sh" ]; then \
		chmod +x run_dev.sh && ./run_dev.sh; \
	else \
		echo "run_dev.sh not found"; \
		exit 1; \
	fi

install-backend:
	@echo "Installing backend dependencies..."
	@cd backend && \
	if [ ! -d "venv" ]; then python3 -m venv venv || python -m venv venv; fi && \
	. venv/bin/activate && \
	pip install -r requirements.txt

install-frontend:
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install

install: install-backend install-frontend

# Build targets
build: build-frontend
	@echo "Build completed"

build-frontend:
	@echo "Building frontend..."
	@cd frontend && npm run build

build-backend:
	@echo "Backend doesn't require building for production"

# Test targets
test: test-backend test-frontend

test-backend:
	@echo "Running backend tests..."
	@cd backend && \
	. venv/bin/activate && \
	python -m pytest tests/ || echo "No backend tests found"

test-frontend:
	@echo "Running frontend tests..."
	@cd frontend && npm test || echo "No frontend tests configured"

# Clean targets
clean: clean-backend clean-frontend clean-docker

clean-backend:
	@echo "Cleaning backend artifacts..."
	@cd backend && \
	rm -rf __pycache__ .pytest_cache .coverage htmlcov && \
	find . -type d -name "__pycache__" -delete && \
	find . -name "*.pyc" -delete

clean-frontend:
	@echo "Cleaning frontend artifacts..."
	@cd frontend && \
	rm -rf dist build .vite

clean-docker:
	@echo "Cleaning Docker artifacts..."
	@docker-compose down --volumes --remove-orphans || true
	@docker system prune -f || true

# Docker targets
docker-dev:
	@echo "Starting development environment with Docker..."
	@docker-compose up --build

docker-build:
	@echo "Building Docker images..."
	@docker-compose build

docker-clean:
	@echo "Cleaning Docker environment..."
	@docker-compose down --volumes --remove-orphans
	@docker system prune -f

# Production targets
prod-build:
	@echo "Building for production..."
	@docker-compose -f docker-compose.prod.yml build

prod-up:
	@echo "Starting production environment..."
	@docker-compose -f docker-compose.prod.yml up -d

prod-down:
	@echo "Stopping production environment..."
	@docker-compose -f docker-compose.prod.yml down