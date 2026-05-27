from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.envelope import EnvelopeRoute
from app.core import solapi, kakao, resend_email, supabase as db
from app.dependencies import AuthContext, get_current_user

router = APIRouter(prefix="/v1/notify", route_class=EnvelopeRoute)


async def _get_platform_settings(*keys: str) -> dict[str, str]:
    """platform_settings 테이블에서 지정 키를 일괄 조회한다."""
    key_filter = ",".join(keys)
    rows = await db.db_select("platform_settings", {"key": f"in.({key_filter})"})
    return {r["key"]: r["value"] for r in rows}


class SendSmsRequest(BaseModel):
    to_number: str
    text: str


@router.post("/sms")
async def send_sms(body: SendSmsRequest, auth: AuthContext = Depends(get_current_user)):
    """
    Solapi SMS 발송. 자격증명은 platform_settings에서 읽는다.
    """
    cfg = await _get_platform_settings("solapi.api_key", "solapi.api_secret", "solapi.sender_phone")
    api_key      = cfg.get("solapi.api_key", "")
    api_secret   = cfg.get("solapi.api_secret", "")
    sender_phone = cfg.get("solapi.sender_phone", "")

    if not api_key or not api_secret or not sender_phone:
        raise HTTPException(status_code=503, detail="SMS 발송 설정이 구성되지 않았습니다 (슈퍼어드민에서 설정 필요)")

    result = await solapi.send_sms(
        api_key=api_key,
        api_secret=api_secret,
        from_number=sender_phone,
        to_number=body.to_number,
        text=body.text,
    )

    if result["status_code"] >= 400:
        detail = result["body"].get("errorCode") or result["body"].get("message") or "Solapi 발송 오류"
        raise HTTPException(status_code=502, detail=str(detail))

    return {
        "ok": True,
        "message_id": result["body"].get("messageId") or result["body"].get("groupId"),
        "status_code": result["status_code"],
    }


class SendKakaoRequest(BaseModel):
    to_number: str
    template_code: str
    text: str


@router.post("/kakao")
async def send_kakao(body: SendKakaoRequest, auth: AuthContext = Depends(get_current_user)):
    """
    Solapi AlimTalk(ATA) 발송. 자격증명은 platform_settings에서 읽는다.
    """
    cfg = await _get_platform_settings("solapi.api_key", "solapi.api_secret", "kakao.sender_key")
    api_key    = cfg.get("solapi.api_key", "")
    api_secret = cfg.get("solapi.api_secret", "")
    sender_key = cfg.get("kakao.sender_key", "")

    if not api_key or not api_secret or not sender_key:
        raise HTTPException(status_code=503, detail="알림톡 발송 설정이 구성되지 않았습니다 (슈퍼어드민에서 설정 필요)")

    result = await kakao.send_alimtalk(
        api_key=api_key,
        api_secret=api_secret,
        sender_key=sender_key,
        template_code=body.template_code,
        to_number=body.to_number,
        text=body.text,
    )

    if result["status_code"] >= 400:
        detail = result["body"].get("errorCode") or result["body"].get("message") or "알림톡 발송 오류"
        raise HTTPException(status_code=502, detail=str(detail))

    return {
        "ok": True,
        "message_id": result["body"].get("messageId") or result["body"].get("groupId"),
        "status_code": result["status_code"],
    }


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    html: Optional[str] = None
    text: Optional[str] = None
    from_name: Optional[str] = None   # 테넌트 브랜딩 override (선택)
    from_email: Optional[str] = None  # 테넌트 브랜딩 override (선택)


@router.post("/email")
async def send_email_route(body: SendEmailRequest, auth: AuthContext = Depends(get_current_user)):
    """
    Resend 이메일 발송. RESEND_API_KEY는 core-api env, from 주소는 platform_settings에서 읽는다.
    """
    cfg = await _get_platform_settings("email.from_name", "email.from_email")

    result = await resend_email.send_email(
        to=body.to,
        subject=body.subject,
        html=body.html,
        text=body.text,
        from_name=body.from_name or cfg.get("email.from_name") or None,
        from_email=body.from_email or cfg.get("email.from_email") or None,
    )

    if result["status_code"] >= 400:
        detail = result["body"].get("message") or result["body"].get("name") or "이메일 발송 오류"
        raise HTTPException(status_code=502, detail=str(detail))

    return {
        "ok": True,
        "message_id": result["body"].get("id"),
        "status_code": result["status_code"],
    }
