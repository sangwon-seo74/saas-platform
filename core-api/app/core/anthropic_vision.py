from __future__ import annotations

import json
import os

import httpx

ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
SCAN_MODEL = "claude-haiku-4-5-20251001"

_EXTRACT_PROMPT = """\
이 명함 이미지에서 텍스트 정보를 추출해 주세요.
반드시 아래 JSON 형식만 반환하세요. 설명 없이 JSON만 출력하세요.

{
  "company_name": "회사명 또는 null",
  "contact_name": "담당자 이름 또는 null",
  "title": "직책/직함 또는 null",
  "department": "부서명 또는 null",
  "phone": "대표전화 또는 null (예: 02-1234-5678)",
  "mobile": "휴대폰 또는 null (예: 010-1234-5678)",
  "email": "이메일 또는 null",
  "website": "웹사이트 URL 또는 null",
  "address": "주소 또는 null",
  "biz_no": "사업자등록번호 또는 null (예: 123-45-67890)"
}

규칙:
- 명함에 없는 정보는 null로 표시한다.
- 전화번호는 하이픈(-) 포함 형식으로 정규화한다.
- 이메일은 소문자로 정규화한다.
- JSON 외 어떤 텍스트도 출력하지 않는다."""


async def scan_business_card(image_base64: str, media_type: str) -> dict:
    """Claude Vision으로 명함 이미지에서 연락처 정보를 추출한다."""
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"error": "ANTHROPIC_API_KEY가 설정되지 않았습니다"}

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if media_type not in allowed_types:
        return {"error": f"지원하지 않는 이미지 형식입니다: {media_type}"}

    payload = {
        "model": SCAN_MODEL,
        "max_tokens": 1024,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_base64,
                        },
                    },
                    {"type": "text", "text": _EXTRACT_PROMPT},
                ],
            }
        ],
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_API_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json=payload,
        )

    if resp.status_code >= 400:
        try:
            body = resp.json()
            detail = body.get("error", {}).get("message") or resp.text
        except Exception:
            detail = resp.text
        return {"error": f"Anthropic API 오류: {detail}"}

    try:
        response_body = resp.json()
        text_content = response_body["content"][0]["text"].strip()
        # JSON 블록 추출 (```json ... ``` 래핑 방어)
        if text_content.startswith("```"):
            lines = text_content.splitlines()
            text_content = "\n".join(
                line for line in lines if not line.startswith("```")
            ).strip()
        extracted = json.loads(text_content)
    except Exception as e:
        return {"error": f"응답 파싱 실패: {e}"}

    return extracted
