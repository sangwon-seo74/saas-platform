import secrets
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional
from app.core import supabase as db
from app.core.config import get_settings
from app.core.envelope import EnvelopeRoute
from app.dependencies import SuperAdminContext, get_super_admin

router = APIRouter(prefix="/v1/admin", route_class=EnvelopeRoute)

_TEMP_PW_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"


def _generate_temp_password(length: int = 12) -> str:
    return "".join(secrets.choice(_TEMP_PW_CHARS) for _ in range(length))


class ResendInviteRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None


class ImpersonateRequest(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None


@router.post("/tenants/{tenant_id}/resend-invite")
async def resend_invite(
    tenant_id: str,
    body: ResendInviteRequest,
    request: Request,
    admin: SuperAdminContext = Depends(get_super_admin),
):
    email = (body.email or "").strip() or None
    name = (body.name or "").strip() or None

    if not email:
        rows = await db.db_select("users", {
            "tenant_id": f"eq.{tenant_id}", "role": "eq.admin",
            "order": "created_at.asc", "limit": "1", "select": "email,name",
        })
        if not rows:
            raise HTTPException(status_code=404, detail="재발송할 관리자 정보가 없습니다")
        email = rows[0]["email"]
        name = rows[0].get("name") or email

    tenant_rows = await db.db_select("tenants", {"id": f"eq.{tenant_id}", "select": "name"})
    tenant_name = tenant_rows[0]["name"] if tenant_rows else ""

    from app.routers.invite import _create_and_store_invite
    result = await _create_and_store_invite(
        email=email, name=name or email, role="admin",
        tenant_id=tenant_id, tenant_name=tenant_name,
        user_id=None, inviter_name="Super Admin",
    )

    await _audit(admin.email, f"resend-invite/{tenant_id}", request)
    return {"email": email, "invite_url": result["invite_url"], "expires_at": result["expires_at"],
            "message": f"{email}로 초대 메일을 재발송했습니다"}


@router.post("/tenants/{tenant_id}/reset-password")
async def reset_password(
    tenant_id: str,
    request: Request,
    admin: SuperAdminContext = Depends(get_super_admin),
):
    rows = await db.db_select("users", {
        "tenant_id": f"eq.{tenant_id}", "role": "eq.admin", "is_active": "eq.true",
        "order": "created_at.asc", "limit": "1", "select": "id,name,email",
    })
    if not rows:
        raise HTTPException(status_code=404, detail="활성 관리자 사용자가 없습니다")

    target = rows[0]
    temp_password = _generate_temp_password()
    await db.auth_update_user_password(target["id"], temp_password)

    await _audit(admin.email, f"reset-password/{tenant_id}", request)
    return {
        "user": {"id": target["id"], "name": target.get("name"), "email": target["email"]},
        "temp_password": temp_password,
        "message": "임시 비밀번호가 발급되었습니다. 사용자에게 안전한 채널로 전달하세요.",
    }


@router.post("/impersonate")
async def impersonate(
    body: ImpersonateRequest,
    request: Request,
    admin: SuperAdminContext = Depends(get_super_admin),
):
    target_email = (body.email or "").strip() or None
    if not target_email and body.user_id:
        rows = await db.db_select("users", {"id": f"eq.{body.user_id}", "select": "email"})
        target_email = rows[0]["email"] if rows else None
    if not target_email:
        raise HTTPException(status_code=400, detail="user_id 또는 email이 필요합니다")

    settings = get_settings()
    redirect_to = f"{settings.app_url}/app/dashboard"
    link = await db.auth_generate_magic_link(target_email, redirect_to)

    await _audit(admin.email, "impersonate", request)
    return {
        "email": target_email,
        "impersonation_link": link,
        "expires_in_seconds": 3600,
        "warning": "이 링크는 시크릿/별도 브라우저 창에서 사용하세요. 현재 슈퍼어드민 세션과 충돌할 수 있습니다.",
    }


async def _audit(email: str, action: str, request: Request) -> None:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.headers.get("x-real-ip", "") or "")
    ua = request.headers.get("user-agent", "")
    try:
        await db.db_insert("audit_logs", {
            "email": email, "action": f"sa.post {action}",
            "ip": ip, "user_agent": ua, "result": "success",
        })
    except Exception as e:
        print(f"[Audit log failed] {e}")


# ─── 플랫폼 설정 (platform_settings 테이블) ───────────────────────────────────

# 민감 키 목록 — GET 시 값 대신 __set__ 반환
_SECRET_KEYS = {"solapi.api_key", "solapi.api_secret", "kakao.sender_key"}


class UpdatePlatformSettingsRequest(BaseModel):
    settings: dict[str, str]


@router.get("/platform/settings")
async def get_platform_settings(admin: SuperAdminContext = Depends(get_super_admin)):
    rows = await db.db_select("platform_settings", {})
    result: dict[str, str] = {}
    for row in rows:
        key = row["key"]
        val = row["value"]
        result[key] = "__set__" if (key in _SECRET_KEYS and val) else val
    return {"settings": result}


@router.patch("/platform/settings")
async def update_platform_settings(
    body: UpdatePlatformSettingsRequest,
    request: Request,
    admin: SuperAdminContext = Depends(get_super_admin),
):
    for key, value in body.settings.items():
        if value == "__set__":
            continue
        try:
            await db.db_update("platform_settings", {"key": f"eq.{key}"}, {"value": value, "updated_at": "now()"})
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"설정 저장 실패 ({key}): {e}")

    await _audit(admin.email, "platform-settings", request)
    return {"ok": True}
