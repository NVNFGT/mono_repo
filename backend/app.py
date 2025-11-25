from sanic import Sanic
from sanic.response import json
from sanic_ext import Extend
from routes.ai_routes import register_ai_routes


from core.middleware import attach_user
from routes import auth_bp, task_bp
from logger import logger
from config import DEBUG, HOST, PORT
from db import engine, Base

app = Sanic("todo_app_backend")

# ------------ CORS CONFIG ------------
FRONTEND_ORIGIN = "http://localhost:5173"   # <-- change if your frontend runs elsewhere

# Sanic Extensions CORS settings (see docs)
app.config.CORS_ORIGINS = FRONTEND_ORIGIN
app.config.CORS_SUPPORTS_CREDENTIALS = True          # if you send cookies / auth headers
app.config.CORS_ALLOW_HEADERS = "Content-Type,Authorization"
app.config.CORS_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS"

# Attach Sanic Extensions (enables CORS + auto OPTIONS)
Extend(app)
logger.debug(f"[INIT] sanic-ext CORS enabled for {FRONTEND_ORIGIN}")

# ------------ DB SETUP ------------
@app.listener("before_server_start")
async def setup_db(app, loop):
  try:
      async with engine.begin() as conn:
          await conn.run_sync(Base.metadata.create_all)
      logger.success("✅ Database initialized and tables ready.")
  except Exception:
      logger.exception("❌ Failed to initialize the database.")

# ------------ MIDDLEWARE ------------
app.middleware("request")(attach_user)

# ------------ HEALTH CHECK ------------
@app.get("/health")
async def health_check(request):
    return json({"status": "healthy", "service": "todo-backend"})

# ------------ BLUEPRINTS ------------
app.blueprint(auth_bp)
app.blueprint(task_bp)
register_ai_routes(app)


if __name__ == "__main__":
    logger.info("🚀 Starting Sanic backend server...")
    app.run(host=HOST, port=PORT, debug=DEBUG, auto_reload=True)
