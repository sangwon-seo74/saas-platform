import logging
import time

import httpx
from jose import JWTError, jwt
from fastapi import HTTPException, status
from app.core.config import get_settings

_jwks_cache: dict | None = None
_jwks_cache_time: float = 0
_JWKS_TTL = 3600  # 1 hour


def _get_jwks(supabase_url: str) -> dict:
    global _jwks_cache, _jwks_cache_time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < _JWKS_TTL:
        return _jwks_cache
    resp = httpx.get(f"{supabase_url}/auth/v1/.well-known/jwks.json", timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_cache_time = now
    return _jwks_cache


def verify_supabase_jwt(token: str) -> dict:
    settings = get_settings()
    alg = "unknown"
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg in ("ES256", "RS256"):
            jwks = _get_jwks(settings.supabase_url)
            kid = header.get("kid")
            signing_key = None
            for key in jwks.get("keys", []):
                if not kid or key.get("kid") == kid:
                    signing_key = key
                    break
            if signing_key is None:
                raise JWTError("No matching public key in JWKS")
            payload = jwt.decode(token, signing_key, algorithms=[alg], audience="authenticated")
        else:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        return payload
    except JWTError as e:
        logging.error("[JWT] verify failed: %s | token_prefix=%s | alg=%s",
                      str(e), token[:20] if token else "", alg)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e
