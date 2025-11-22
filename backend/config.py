import os
from dotenv import load_dotenv
from logger import logger

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

# Database settings
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:admin@localhost:5432/tododb")

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "change_this_super_secret")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24  # 1 day

# App settings
DEBUG = os.getenv("DEBUG", "True").lower() == "true"
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))

# Log the configuration (safely)
logger.info("🔧 Configuration loaded:")
logger.info(f"├── Database: {DATABASE_URL.split('@')[-1]}")  # Only log host/db, not credentials
logger.info(f"├── JWT Secret: {JWT_SECRET[:6]}****")
logger.info(f"├── Debug Mode: {DEBUG}")
logger.info(f"└── Server: {HOST}:{PORT}")