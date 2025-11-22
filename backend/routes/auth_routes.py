from sanic import Blueprint, json
from sqlalchemy import select, or_
from db import AsyncSessionLocal, User
from core.auth import hash_password, verify_password, create_access_token
from logger import logger

auth_bp = Blueprint('auth', url_prefix='/auth')

@auth_bp.post("/register")
async def register(request):
    logger.info("[REGISTER] Register endpoint hit")
    data = request.json or {}
    username, email, password = data.get("username"), data.get("email"), data.get("password")

    logger.debug(f"[REGISTER] Data received: username={username}, email={email}")
    if not username or not email or not password:
        logger.warning("[REGISTER] Missing required fields.")
        return json({"error": "username, email and password required"}, status=400)

    async with AsyncSessionLocal() as session:
        q = select(User).where(or_(User.email == email, User.username == username))
        res = await session.execute(q)
        exists = res.scalars().first()
        if exists:
            logger.warning("[REGISTER] User already exists.")
            return json({"error": "user with this email or username already exists"}, status=400)

        user = User(username=username, email=email, password_hash=hash_password(password))
        session.add(user)
        await session.commit()
        await session.refresh(user)
        token = create_access_token(user.id)
        logger.success(f"[REGISTER] User registered successfully: id={user.id}, username={user.username}")
        return json({"id": user.id, "username": user.username, "email": user.email, "token": token}, status=201)

@auth_bp.post("/login")
async def login(request):
    logger.info("[LOGIN] Login endpoint hit")
    data = request.json or {}
    email_or_username, password = data.get("email"), data.get("password")

    if not email_or_username or not password:
        logger.warning("[LOGIN] Missing email/username or password.")
        return json({"error": "email/username and password required"}, status=400)

    async with AsyncSessionLocal() as session:
        q = select(User).where(or_(User.email == email_or_username, User.username == email_or_username))
        res = await session.execute(q)
        user = res.scalars().first()

        if not user:
            logger.warning(f"[LOGIN] No user found for: {email_or_username}")
            return json({"error": "invalid credentials"}, status=401)

        if not verify_password(password, user.password_hash):
            logger.warning(f"[LOGIN] Invalid password for user {email_or_username}")
            return json({"error": "invalid credentials"}, status=401)

        token = create_access_token(user.id)
        logger.success(f"[LOGIN] User logged in: id={user.id}, username={user.username}")
        return json({"token": token, "user": {"id": user.id, "username": user.username, "email": user.email}})

@auth_bp.get("/me")
async def me(request):
    logger.debug("[AUTH/ME] Fetching user info")
    if not getattr(request.ctx, "user", None):
        logger.debug("[AUTH/ME] No user attached to request.")
        return json({"user": None})
    u = request.ctx.user
    logger.info(f"[AUTH/ME] Returning user info for {u.username}")
    return json({"id": u.id, "username": u.username, "email": u.email})