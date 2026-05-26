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


async def send_sms(
    *,
    api_key: str,
    api_secret: str,
    from_number: str,
    to_number: str,
    text: str,
) -> dict:
    """Solapi REST API로 SMS/LMS를 발송하고 응답 dict를 반환한다."""
    from_clean = from_number.replace("-", "").replace(" ", "")
    to_clean = to_number.replace("-", "").replace(" ", "")

    msg_type = "LMS" if len(text.encode("euc-kr", errors="replace")) > 90 else "SMS"

    payload = {
        "message": {
            "to": to_clean,
            "from": from_clean,
            "text": text,
            "type": msg_type,
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
