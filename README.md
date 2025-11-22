# Multiuser Todo Application

A full-stack todo application built with Python Sanic backend and React TypeScript frontend.

## Features

- 🔐 **User Authentication**: JWT-based authentication with registration and login
- ✅ **Task Management**: Create, read, update, and delete tasks
- 🎯 **Task Organization**: Priority levels (low, medium, high) and status tracking
- 📅 **Due Dates**: Set and track task deadlines
- 🎨 **Modern UI**: Clean, responsive interface with dark/light theme support
- 🔍 **Task Filtering**: Filter tasks by status, priority, and search terms
- 📊 **Dashboard**: Overview of task statistics

## Technology Stack

### Backend
- **Python 3.x** with **Sanic** (async web framework)
- **PostgreSQL** database with **SQLAlchemy** ORM (async)
- **JWT** authentication with **bcrypt** password hashing
- **Loguru** for comprehensive logging
- **CORS** enabled for frontend integration

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development and building
- **Redux Toolkit** with **RTK Query** for state management
- **Tailwind CSS** for styling
- **React Hook Form** with **Zod** validation
- **Lucide React** for icons

## Project Structure

```
multiuser-todo-app/
├── backend/                 # Python Sanic API
│   ├── app.py              # Main application entry point
│   ├── config.py           # Configuration settings
│   ├── requirements.txt    # Python dependencies
│   ├── core/               # Core authentication & middleware
│   ├── db/                 # Database models and connection
│   ├── routes/             # API endpoints
│   └── utils/              # Utility functions
├── frontend/               # React TypeScript app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store and API
│   │   └── hooks/          # Custom React hooks
│   ├── package.json
│   └── vite.config.ts
├── infra/                  # Infrastructure configurations
├── docker-compose.yml      # Docker services setup
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- **Node.js 18+** and **npm** (for local development)
- **Python 3.9+** and **pip** (for local development)
- **PostgreSQL** (for local development)

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd multiuser-todo-app
   ```

2. **Start all services**
   ```bash
   docker-compose up --build
   ```

   This will start:
   - PostgreSQL database on port `5432`
   - Sanic backend on port `8000`
   - React frontend on port `3000`

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs (if available)

### Option 2: Local Development

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env  # Create and configure your .env file
   ```

5. **Start the backend**
   ```bash
   python app.py
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

### Option 3: Development Scripts

Use the provided scripts for streamlined development:

**On Unix/macOS:**
```bash
chmod +x run_dev.sh
./run_dev.sh
```

**On Windows:**
```bash
run_dev.bat
```

**Using Make:**
```bash
make dev          # Start development servers
make build        # Build for production
make clean        # Clean build artifacts
make test         # Run tests
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql+asyncpg://postgres:admin@localhost:5432/tododb
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_SECONDS=86400
DEBUG=true
HOST=0.0.0.0
PORT=8000
```

### Frontend
```env
VITE_API_URL=http://localhost:8000
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### Tasks
- `GET /tasks/` - List user's tasks (with filtering, pagination, sorting)
- `POST /tasks/` - Create new task
- `GET /tasks/{id}` - Get specific task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task

## Database Schema

### Users Table
- `id` (Primary Key)
- `username` (Unique)
- `email` (Unique)
- `password_hash`
- `created_at`

### Tasks Table
- `id` (Primary Key)
- `user_id` (Foreign Key)
- `title`
- `description`
- `status` (pending, in_progress, completed)
- `priority` (low, medium, high)
- `due_date`
- `created_at`

## Development

### Adding New Features

1. **Backend**: Add routes in `backend/routes/`, update models in `backend/db/models.py`
2. **Frontend**: Add components in `frontend/src/components/`, update API in `frontend/src/store/api/`

### Testing

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Using Docker
docker-compose -f docker-compose.prod.yml up --build

# Manual build
cd frontend && npm run build
cd backend && # Deploy using your preferred method
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.