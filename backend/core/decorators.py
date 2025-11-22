import functools
from sanic.response import json
from logger import logger

def require_auth(handler):
    @functools.wraps(handler)
    async def wrapper(request, *args, **kwargs):
        if not getattr(request.ctx, "user", None):
            logger.warning(f"[AUTH] Unauthorized access attempt to {request.path}")
            return json({"error": "Unauthorized"}, status=401)
        return await handler(request, *args, **kwargs)
    return wrapper