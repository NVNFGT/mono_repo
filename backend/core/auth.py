from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from logger import logger
from config import JWT_SECRET, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_SECONDS

def hash_password(password: str) -> str:
    logger.debug(f"[hash_password] Hashing password for: {password[:2]}****")  # do NOT log full password
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    hashed_str = hashed.decode("utf-8")
    logger.debug(f"[hash_password] Password hashed successfully.")
    return hashed_str

def verify_password(password: str, hashed: str) -> bool:
    logger.debug("[verify_password] Verifying password...")
    try:
        result = bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        logger.debug(f"[verify_password] Password match result: {result}")
        return result
    except Exception as e:
        logger.error(f"[verify_password] Error verifying password: {e}")
        return False

def create_access_token(user_id: int) -> str:
    logger.info(f"[create_access_token] Generating token for user_id={user_id}")
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=ACCESS_TOKEN_EXPIRE_SECONDS)
    }

    logger.debug(f"[create_access_token] Payload: {payload}")
    try:
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        if isinstance(token, bytes):
            token = token.decode("utf-8")
        logger.success(f"[create_access_token] Token generated successfully for user_id={user_id}")
        return token
    except Exception as e:
        logger.exception(f"[create_access_token] Failed to create token for user_id={user_id}: {e}")
        raise

def decode_token(token: str):
    logger.info("[decode_token] Attempting to decode token...")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        logger.debug(f"[decode_token] Raw decoded payload: {payload}")

        if "sub" in payload:
            try:
                payload["sub"] = int(payload["sub"])
                logger.debug(f"[decode_token] Converted 'sub' to int: {payload['sub']}")
            except ValueError:
                logger.warning(f"[decode_token] Could not convert 'sub' to int: {payload['sub']}")

        logger.success("[decode_token] Token decoded successfully.")
        return payload

    except jwt.ExpiredSignatureError:
        logger.warning("[decode_token] Token has expired.")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"[decode_token] Invalid token: {e}")
        return None