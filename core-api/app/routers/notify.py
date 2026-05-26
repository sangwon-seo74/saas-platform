from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.envelope import EnvelopeRoute
from app.core import solapi
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
