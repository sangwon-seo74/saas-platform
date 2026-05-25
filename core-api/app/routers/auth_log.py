from fastapi import APIRouter, Request
from pydantic import BaseModel
from app.core import supabase as db

router = APIRouter(prefix="/v1/auth")


class LogAccessRequest(BaseModel):
    email: str
    action: str = "login"
    result: str = "success"


@router.post("/log-access")
async def log_access(body: LogAccessRequest, request: Request):
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.headers.get("x-real-ip", "") or "")
    ua = _parse_ua(request.headers.get("user-agent", ""))

    user_id = None
    tenant_id = None

    if body.result == "success":
        rows = await db.db_select("users", {"email": f"eq.{body.email}", "select": "id,tenant_id", "limit": "1"})
        if rows:
            user_id = rows[0].get("id")
            tenant_id = rows[0].get("tenant_id")
            await db.db_update("users", {"id": f"eq.{user_id}"}, {"last_login_at": "now()"})

    await db.db_insert("audit_logs", {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "email": body.email.strip(),
        "action": body.action,
        "ip": ip,
        "user_agent": ua,
        "result": body.result,
    })

    return {"logged": True}


def _parse_ua(ua: str) -> str:
    if not ua:
        return ""
    import re
    browser = (
        "Edge" if re.search(r"Edg/|Edge/", ua) else
        "Chrome" if "Chrome/" in ua and "Edg" not in ua else
        "Safari" if "Safari/" in ua and "Chrome" not in ua else
        "Firefox" if "Firefox/" in ua else
        "Unknown"
    )
    os_ = (
        "Windows" if "Windows" in ua else
        "macOS" if "Mac OS X" in ua else
        "Android" if "Android" in ua else
        "iOS" if re.search(r"iPhone|iPad|iOS", ua) else
        "Linux" if "Linux" in ua else
        "Unknown"
    )
    return f"{browser} / {os_}"
