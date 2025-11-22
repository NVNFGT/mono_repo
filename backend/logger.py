import sys
import os
from loguru import logger

# Create a logs directory if it doesn't exist
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Remove default loguru handler to avoid duplicates
logger.remove()

# Add pretty console handler for development
logger.add(
    sys.stdout,
    colorize=True,
    backtrace=True,   # show full trace in errors
    diagnose=True,    # show variable values in trace
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
           "<level>{level: <8}</level> | "
           "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
           "<level>{message}</level>",
)

# Add file handler for persistent logs
logger.add(
    os.path.join(LOG_DIR, "app.log"),
    rotation="5 MB",
    retention="10 days",
    compression="zip",
    level="DEBUG",  # store even debug logs to file
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} - {message}",
)

logger.info("Logger initialized successfully.")
