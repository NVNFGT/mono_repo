from sanic import Sanic
from core.middleware import attach_user
from routes import auth_bp, task_bp
from logger import logger
from config import DEBUG, HOST, PORT
from db import engine, Base

try:
    from sanic_cors import CORS
except Exception:
    CORS = None

# Initialize Sanic app
app = Sanic("todo_app_backend")

# Configure CORS if available
if CORS:
    CORS(app, resources={r"/*": {"origins": "*"}})
    logger.debug("[INIT] CORS enabled for all origins")

# DB Setup
@app.listener("before_server_start")
async def setup_db(app, loop):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.success("✅ Database initialized and tables ready.")
    except Exception as e:
        logger.exception("❌ Failed to initialize the database.")

# Register middleware
app.middleware("request")(attach_user)

# Health check endpoint
@app.get("/health")
async def health_check(request):
    return json({"status": "healthy", "service": "todo-backend"})

# Register blueprints
app.blueprint(auth_bp)
app.blueprint(task_bp)

if __name__ == "__main__":
    logger.info("🚀 Starting Sanic backend server...")
    app.run(host=HOST, port=PORT, debug=DEBUG)
