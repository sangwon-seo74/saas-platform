from dataclasses import dataclass
from typing import Optional
import asyncio
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import verify_supabase_jwt
from app.core.config import get_settings

bearer_scheme = HTTPBearer()


@dataclass
class AuthContext:
    user_id: str
    tenant_id: Optional[str]
    role: str
    email: Optional[str]


@dataclass
class SuperAdminContext:
    email: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> AuthContext:
    payload = verify_supabase_jwt(credentials.credentials)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing sub claim")

    app_metadata = payload.get("app_metadata", {})

    return AuthContext(
        user_id=sub,
        tenant_id=app_metadata.get("tenant_id"),
        role=app_metadata.get("role", "sales"),
        email=payload.get("email"),
    )


def get_super_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> SuperAdminContext:
    settings = get_settings()
    payload = verify_supabase_jwt(credentials.credentials)

    email = payload.get("email", "")
    if email not in settings.super_admin_emails_list:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="슈퍼 관리자 권한이 필요합니다")

    whitelist = settings.super_admin_ip_whitelist_list
    if whitelist:
        forwarded = request.headers.get("x-forwarded-for", "")
        client_ip = forwarded.split(",")[0].strip() if forwarded else (request.headers.get("x-real-ip", ""))
        if client_ip not in whitelist:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"허용되지 않은 IP입니다 ({client_ip})")

    return SuperAdminContext(email=email)
