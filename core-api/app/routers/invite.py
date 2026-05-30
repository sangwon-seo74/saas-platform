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

# rros: admin / manager / sales  |  ncm: owner / member
VALID_ROLES = ("admin", "manager", "sales", "owner", "member")


class InviteRequest(BaseModel):
    email: str
    name: str
    role: str
    app_url: Optional[str] = None  # 앱별 초대 URL 베이스 (ncm 등)


class AcceptInviteRequest(BaseModel):
    token: str
    name: str
    password: str


@router.post("/invite")
async def send_invite(body: InviteRequest, auth: AuthContext = Depends(get_current_user)):
    if auth.role not in ("admin", "manager", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin, manager 또는 owner만 초대할 수 있습니다")
    if not body.email.strip():
        raise HTTPException(status_code=400, detail="이메일은 필수입니다")
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="이름은 필수입니다")
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role은 {', '.join(VALID_ROLES)} 중 하나여야 합니다")
    if body.role in ("admin", "owner") and auth.role not in ("admin", "owner"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자/owner 계정은 동급 이상만 초대할 수 있습니다")

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
        app_url=body.app_url,
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


# ─── 팀 초대 링크 (Slack 스타일) ────────────────────────────────────────────

class TeamInviteLinkRequest(BaseModel):
    role: str = "sales"
    label: Optional[str] = None
    max_uses: Optional[int] = None
    expires_days: Optional[int] = 30


class JoinRequest(BaseModel):
    token: str
    name: str
    email: str
    password: str


@router.post("/team-invite")
async def create_team_invite_link(body: TeamInviteLinkRequest, auth: AuthContext = Depends(get_current_user)):
    if auth.role not in ("admin", "manager", "owner"):
        raise HTTPException(status_code=403, detail="admin 또는 manager만 초대 링크를 생성할 수 있습니다")
    if body.role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail=f"role은 {', '.join(VALID_ROLES)} 중 하나여야 합니다")

    import secrets as sec
    token = sec.token_urlsafe(32)
    settings = get_settings()

    expires_at = None
    if body.expires_days:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=body.expires_days)).isoformat()

    row = await db.db_insert("team_invite_links", {
        "tenant_id": auth.tenant_id,
        "token": token,
        "role": body.role,
        "label": body.label,
        "max_uses": body.max_uses,
        "use_count": 0,
        "created_by": auth.user_id,
        "expires_at": expires_at,
        "is_active": True,
    })

    join_url = f"{settings.app_url}/join?token={token}"
    return {**row, "join_url": join_url}


@router.get("/team-invite")
async def list_team_invite_links(auth: AuthContext = Depends(get_current_user)):
    if auth.role not in ("admin", "manager", "owner"):
        raise HTTPException(status_code=403, detail="admin 또는 manager만 초대 링크를 조회할 수 있습니다")

    rows = await db.db_select(
        "team_invite_links",
        {"tenant_id": f"eq.{auth.tenant_id}", "order": "created_at.desc"},
    )
    settings = get_settings()
    return [
        {**r, "join_url": f"{settings.app_url}/join?token={r['token']}"}
        for r in rows
    ]


@router.delete("/team-invite/{link_id}")
async def deactivate_team_invite_link(link_id: str, auth: AuthContext = Depends(get_current_user)):
    if auth.role not in ("admin", "manager", "owner"):
        raise HTTPException(status_code=403, detail="권한이 없습니다")

    rows = await db.db_select(
        "team_invite_links",
        {"id": f"eq.{link_id}", "tenant_id": f"eq.{auth.tenant_id}", "select": "id"},
    )
    if not rows:
        raise HTTPException(status_code=404, detail="초대 링크를 찾을 수 없습니다")

    await db.db_update("team_invite_links", {"id": f"eq.{link_id}"}, {"is_active": False})
    return {"ok": True}


@router.get("/join")
async def check_team_invite(token: str):
    rows = await db.db_select(
        "team_invite_links",
        {"token": f"eq.{token}", "is_active": "eq.true", "select": "id,tenant_id,role,label,max_uses,use_count,expires_at"},
    )
    if not rows:
        raise HTTPException(status_code=400, detail="유효하지 않거나 비활성화된 초대 링크입니다")

    link = rows[0]
    if link.get("expires_at") and datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="만료된 초대 링크입니다")
    if link.get("max_uses") and link["use_count"] >= link["max_uses"]:
        raise HTTPException(status_code=400, detail="사용 횟수를 초과한 초대 링크입니다")

    tenant_rows = await db.db_select("tenants", {"id": f"eq.{link['tenant_id']}", "select": "name"})
    tenant_name = tenant_rows[0]["name"] if tenant_rows else ""

    return {"tenant_name": tenant_name, "role": link["role"], "label": link.get("label")}


@router.post("/join")
async def join_with_team_link(body: JoinRequest):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="이름은 필수입니다")
    if not body.email.strip():
        raise HTTPException(status_code=400, detail="이메일은 필수입니다")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="비밀번호는 8자 이상이어야 합니다")

    rows = await db.db_select(
        "team_invite_links",
        {"token": f"eq.{body.token}", "is_active": "eq.true", "select": "id,tenant_id,role,max_uses,use_count,expires_at"},
    )
    if not rows:
        raise HTTPException(status_code=400, detail="유효하지 않거나 비활성화된 초대 링크입니다")

    link = rows[0]
    if link.get("expires_at") and datetime.fromisoformat(link["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="만료된 초대 링크입니다")
    if link.get("max_uses") and link["use_count"] >= link["max_uses"]:
        raise HTTPException(status_code=400, detail="사용 횟수를 초과한 초대 링크입니다")

    existing = await db.db_select("users", {"email": f"eq.{body.email}", "select": "id"})
    if existing:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다")

    user_data = await db.auth_create_user(
        email=body.email,
        password=body.password,
        name=body.name.strip(),
        tenant_id=link["tenant_id"],
        role=link["role"],
    )

    await db.db_update(
        "team_invite_links",
        {"id": f"eq.{link['id']}"},
        {"use_count": link["use_count"] + 1},
    )

    return {
        "message": "계정이 생성되었습니다. 로그인하세요.",
        "user": {"id": user_data["id"], "email": body.email, "name": body.name.strip()},
    }


async def _create_and_store_invite(
    email: str, name: str, role: str,
    tenant_id: Optional[str], tenant_name: str,
    user_id: Optional[str], inviter_name: str,
    app_url: Optional[str] = None,
) -> dict:
    settings = get_settings()
    base_url = app_url or settings.app_url
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    token = create_invite_token(
        email=email, tenant_id=tenant_id or "", role=role,
        invited_by=user_id or "", expires_at=expires_at,
    )
    invite_url = f"{base_url}/invite/{token}"

    await db.db_delete("invite_tokens", {"email": f"eq.{email}", "tenant_id": f"eq.{tenant_id}"})
    await db.db_insert("invite_tokens", {
        "token": token, "email": email, "tenant_id": tenant_id,
        "role": role, "invited_by": user_id, "expires_at": expires_at,
    })

    # Email sending — console log until Resend is configured
    print(f"[Invite Email] to={email} url={invite_url}")

    return {"token": token, "invite_url": invite_url, "expires_at": expires_at}
