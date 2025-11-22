from sanic import Request
from sqlalchemy import select
from db import AsyncSessionLocal, User
from .auth import decode_token
from logger import logger

async def attach_user(request: Request):
    request.ctx.user = None
    auth_header = request.headers.get("authorization")
    logger.debug(f"[MIDDLEWARE] Incoming request: {request.method} {request.path}")
    logger.debug(f"[MIDDLEWARE] Authorization Header: {auth_header}")

    if not auth_header:
        logger.debug("[MIDDLEWARE] No Authorization header found.")
        return

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        logger.warning(f"[MIDDLEWARE] Invalid Authorization format: {parts}")
        return

    token = parts[1]
    payload = decode_token(token)
    if not payload:
        logger.warning("[MIDDLEWARE] Token could not be decoded or expired.")
        return

    user_id = payload.get("sub")
    if not user_id:
        logger.error("[MIDDLEWARE] No user_id found in token payload.")
        return

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.id == user_id))
        user = res.scalars().first()
        if user:
            logger.debug(f"[MIDDLEWARE] Authenticated user: {user.username}")
        else:
            logger.warning(f"[MIDDLEWARE] No user found for id={user_id}")
        request.ctx.user = user