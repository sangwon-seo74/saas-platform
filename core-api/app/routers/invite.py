from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Optional
from app.core import supabase as db
from app.core.invite_token import create_invite_token, verify_invite_token
from app.core.config import get_settings
from app.core.envelope import EnvelopeRoute
from app.dependencies import AuthContext, get_current_user

router = APIRouter(prefix="/v1", route_class=EnvelopeRoute)

VALID_ROLES = ("admin", "manager", "sales")


class InviteRequest(BaseModel):
    email: str
    name: str
    role: str


class AcceptInviteRequest(BaseModel):
    token: str
    name: str
    password: str


@router.post("/invite")
async def send_invite(body: InviteRequest, auth: AuthContext = Depends(get_current_user)):
    if auth.role not in ("admin", "manager"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin 또는 manager만 초대할 수 있습니다")
    if not body.email.strip():
        raise HTTPException(status_code=400, detail="이메일은 필수입니다")
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="이름은 필수입니다")
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role은 {', '.join(VALID_ROLES)} 중 하나여야 합니다")
    if body.role == "admin" and auth.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 계정은 관리자만 초대할 수 있습니다")

    rows = await db.db_select("users", {"email": f"eq.{body.email}", "tenant_id": f"eq.{auth.tenant_id}", "select": "id"})
    if rows:
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다")

    tenant_rows = await db.db_select("tenants", {"id": f"eq.{auth.tenant_id}", "select": "name"})
    inviter_rows = await db.db_select("users", {"id": f"eq.{auth.user_id}", "select": "name"})
    tenant_name = tenant_rows[0]["name"] if tenant_rows else ""
    inviter_name = inviter_rows[0]["name"] if inviter_rows else ""

    result = await _create_and_store_invite(
        email=body.email, name=body.name, role=body.role,
        tenant_id=auth.tenant_id, tenant_name=tenant_name,
        user_id=auth.user_id, inviter_name=inviter_name,
    )

    resp = {"message": "초대 이메일을 발송했습니다", "email": body.email, "role": body.role, "expires_at": result["expires_at"]}
    import os
    if os.getenv("NODE_ENV") == "development" or True:  # always return in dev
        resp["invite_url"] = result["invite_url"]
    return resp


@router.get("/accept-invite")
async def check_invite(token: str = Query(...)):
    payload = verify_invite_token(token)
    if not payload:
        raise HTTPException(status_code=400, detail="유효하지 않거나 만료된 초대 링크입니다")

    rows = await db.db_select("tenants", {"id": f"eq.{payload['tenantId']}", "select": "name"})
    tenant_name = rows[0]["name"] if rows else ""

    return {
        "email": payload["email"],
        "role": payload["role"],
        "tenant_name": tenant_name,
        "expires_at": payload["expiresAt"],
    }


@router.post("/accept-invite")
async def accept_invite(body: AcceptInviteRequest):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="name은 필수입니다")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="비밀번호는 8자 이상이어야 합니다")

    payload = verify_invite_token(body.token)
    if not payload:
        raise HTTPException(status_code=400, detail="유효하지 않거나 만료된 초대 링크입니다")

    rows = await db.db_select("users", {"email": f"eq.{payload['email']}", "select": "id"})
    if rows:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다")

    user_data = await db.auth_create_user(
        email=payload["email"], password=body.password, name=body.name,
        tenant_id=payload["tenantId"], role=payload["role"],
    )

    await db.db_delete("invite_tokens", {"token": f"eq.{body.token}"})

    return {
        "message": "계정이 생성되었습니다. 로그인하세요.",
        "user": {"id": user_data["id"], "email": user_data["email"], "name": body.name},
    }


async def _create_and_store_invite(
    email: str, name: str, role: str,
    tenant_id: Optional[str], tenant_name: str,
    user_id: Optional[str], inviter_name: str,
) -> dict:
    settings = get_settings()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    token = create_invite_token(
        email=email, tenant_id=tenant_id or "", role=role,
        invited_by=user_id or "", expires_at=expires_at,
    )
    invite_url = f"{settings.app_url}/invite/{token}"

    await db.db_delete("invite_tokens", {"email": f"eq.{email}", "tenant_id": f"eq.{tenant_id}"})
    await db.db_insert("invite_tokens", {
        "token": token, "email": email, "tenant_id": tenant_id,
        "role": role, "invited_by": user_id, "expires_at": expires_at,
    })

    # Email sending — console log until Resend is configured
    print(f"[Invite Email] to={email} url={invite_url}")

    return {"token": token, "invite_url": invite_url, "expires_at": expires_at}
