import asyncio
from db import engine
from sqlalchemy import text
from logger import logger

async def test_connection():
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            value = result.scalar()
            logger.success(f"Database connected successfully. Test query result: {value}")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(test_connection())
