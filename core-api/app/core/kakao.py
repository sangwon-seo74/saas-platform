import hashlib
import hmac
import uuid
from datetime import datetime, timezone

import httpx

SOLAPI_SEND_URL = "https://api.solapi.com/messages/v4/send"


def _make_auth_header(api_key: str, api_secret: str) -> str:
    date = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    salt = uuid.uuid4().hex
    signature = hmac.new(
        api_secret.encode(), (date + salt).encode(), hashlib.sha256
    ).hexdigest()
    return f"HMAC-SHA256 apiKey={api_key}, date={date}, salt={salt}, signature={signature}"


async def send_alimtalk(
    *,
    api_key: str,
    api_secret: str,
    sender_key: str,
    template_code: str,
    to_number: str,
    text: str,
) -> dict:
    """Solapi REST API로 카카오 알림톡(ATA)을 발송하고 응답 dict를 반환한다."""
    to_clean = to_number.replace("-", "").replace(" ", "")

    payload = {
        "message": {
            "to": to_clean,
            "type": "ATA",
            "kakaoOptions": {
                "pfId": sender_key,
                "templateId": template_code,
            },
            "text": text,
        }
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            SOLAPI_SEND_URL,
            json=payload,
            headers={
                "Authorization": _make_auth_header(api_key, api_secret),
                "Content-Type": "application/json",
            },
        )

    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}

    return {"status_code": resp.status_code, "body": data}
