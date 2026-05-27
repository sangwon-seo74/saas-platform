import os

import httpx

RESEND_API_URL = "https://api.resend.com/emails"


async def send_email(
    *,
    to: str,
    subject: str,
    html: str | None = None,
    text: str | None = None,
    from_name: str | None = None,
    from_email: str | None = None,
) -> dict:
    """Resend REST API로 이메일을 발송하고 응답 dict를 반환한다."""
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        return {"status_code": 500, "body": {"message": "RESEND_API_KEY가 설정되지 않았습니다"}}

    default_from_email = os.environ.get("RESEND_FROM_EMAIL", "noreply@saas-foundry.io")
    default_from_name  = os.environ.get("RESEND_FROM_NAME", "SaaS Platform")

    sender_name  = from_name  or default_from_name
    sender_email = from_email or default_from_email
    from_field   = f"{sender_name} <{sender_email}>"

    payload: dict = {"from": from_field, "to": [to], "subject": subject}
    if html:
        payload["html"] = html
    elif text:
        payload["text"] = text
    else:
        payload["text"] = ""

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            RESEND_API_URL,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}

    return {"status_code": resp.status_code, "body": data}
