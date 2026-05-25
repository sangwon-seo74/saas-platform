import hmac
import hashlib
import json
import base64
from datetime import datetime, timezone
from typing import Optional
from app.core.config import get_settings


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    pad = 4 - len(s) % 4
    if pad != 4:
        s += "=" * pad
    return base64.urlsafe_b64decode(s)


def _sign(data: str) -> str:
    secret = get_settings().invite_token_secret.encode()
    return _b64url_encode(
        hmac.new(secret, data.encode(), hashlib.sha256).digest()
    )


def create_invite_token(
    email: str,
    tenant_id: str,
    role: str,
    invited_by: str,
    expires_at: str,
) -> str:
    # Field order must match TS: {email, tenantId, role, invitedBy, expiresAt}
    # separators=(",", ":") removes whitespace so base64url matches TS output
    payload = {"email": email, "tenantId": tenant_id, "role": role,
               "invitedBy": invited_by, "expiresAt": expires_at}
    data = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    sig = _sign(data)
    return f"{data}.{sig}"


def verify_invite_token(token: str) -> Optional[dict]:
    try:
        dot = token.rfind(".")
        if dot == -1:
            return None
        data, sig = token[:dot], token[dot + 1:]
        expected = _sign(data)
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(_b64url_decode(data))
        # Python 3.9 fromisoformat() doesn't handle trailing 'Z' — replace it with +00:00
        expires_str = payload["expiresAt"].replace("Z", "+00:00")
        if datetime.fromisoformat(expires_str) < datetime.now(timezone.utc):
            return None
        return payload
    except Exception:
        return None
