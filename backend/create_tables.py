import asyncio
from db import engine, Base
from db import User, Task, AIInsight, TaskPrediction, UserPattern  # ensures models metadata is imported

async def create_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created/checked successfully.")

if __name__ == "__main__":
    asyncio.run(create_all())
