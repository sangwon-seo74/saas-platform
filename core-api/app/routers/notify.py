from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.envelope import EnvelopeRoute
from app.core import solapi, kakao, resend_email
from app.dependencies import AuthContext, get_current_user

router = APIRouter(prefix="/v1/notify", route_class=EnvelopeRoute)


class SendSmsRequest(BaseModel):
    api_key: str
    api_secret: str
    from_number: str
    to_number: str
    text: str


@router.post("/sms")
async def send_sms(body: SendSmsRequest, auth: AuthContext = Depends(get_current_user)):
    """
    Stateless Solapi SMS adapter.
    Caller (rros) passes per-tenant credentials from its own api_integrations table.
    core-api makes the Solapi HTTP call and returns the result — no DB access here.
    """
    result = await solapi.send_sms(
        api_key=body.api_key,
        api_secret=body.api_secret,
        from_number=body.from_number,
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
    api_key: str
    api_secret: str
    sender_key: str
    template_code: str
    to_number: str
    text: str


@router.post("/kakao")
async def send_kakao(body: SendKakaoRequest, auth: AuthContext = Depends(get_current_user)):
    """
    Stateless Solapi AlimTalk(ATA) adapter.
    Caller (rros) passes per-tenant credentials from its own api_integrations table.
    """
    result = await kakao.send_alimtalk(
        api_key=body.api_key,
        api_secret=body.api_secret,
        sender_key=body.sender_key,
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
    html: str | None = None
    text: str | None = None
    from_name: str | None = None
    from_email: str | None = None


@router.post("/email")
async def send_email_route(body: SendEmailRequest, auth: AuthContext = Depends(get_current_user)):
    """
    Stateless Resend email adapter.
    RESEND_API_KEY is read from core-api env — never passed by the caller.
    Caller may pass optional from_name/from_email for per-tenant branding.
    """
    result = await resend_email.send_email(
        to=body.to,
        subject=body.subject,
        html=body.html,
        text=body.text,
        from_name=body.from_name,
        from_email=body.from_email,
    )

    if result["status_code"] >= 400:
        detail = result["body"].get("message") or result["body"].get("name") or "이메일 발송 오류"
        raise HTTPException(status_code=502, detail=str(detail))

    return {
        "ok": True,
        "message_id": result["body"].get("id"),
        "status_code": result["status_code"],
    }
