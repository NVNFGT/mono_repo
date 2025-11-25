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

# AI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AI_MODEL_NAME = os.getenv("AI_MODEL_NAME", "gpt-4o-mini")
ENABLE_AI_FEATURES = os.getenv("ENABLE_AI_FEATURES", "True").lower() == "true"
AI_REQUEST_TIMEOUT = int(os.getenv("AI_REQUEST_TIMEOUT", 30))
MAX_AI_REQUESTS_PER_MINUTE = int(os.getenv("MAX_AI_REQUESTS_PER_MINUTE", 60))

# NLP Configuration
SPACY_MODEL = os.getenv("SPACY_MODEL", "en_core_web_sm")
ENABLE_NLTK_DOWNLOAD = os.getenv("ENABLE_NLTK_DOWNLOAD", "True").lower() == "true"

# ML Configuration
AI_MODEL_PATH = os.getenv("AI_MODEL_PATH", "./ai/models/")
ENABLE_ML_PREDICTIONS = os.getenv("ENABLE_ML_PREDICTIONS", "True").lower() == "true"
MODEL_RETRAIN_INTERVAL_HOURS = int(os.getenv("MODEL_RETRAIN_INTERVAL_HOURS", 24))

# Log the configuration (safely)
logger.info("🔧 Configuration loaded:")
logger.info(f"├── Database: {DATABASE_URL.split('@')[-1]}")  # Only log host/db, not credentials
logger.info(f"├── JWT Secret: {JWT_SECRET[:6]}****")
logger.info(f"├── Debug Mode: {DEBUG}")
logger.info(f"├── Server: {HOST}:{PORT}")
logger.info(f"├── AI Features: {ENABLE_AI_FEATURES}")
logger.info(f"├── AI Model: {AI_MODEL_NAME}")
logger.info(f"├── SpaCy Model: {SPACY_MODEL}")
logger.info(f"└── ML Predictions: {ENABLE_ML_PREDICTIONS}")