from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.envelope import EnvelopeRoute
from app.core import anthropic_vision
from app.dependencies import AuthContext, get_current_user

router = APIRouter(prefix="/v1/business-card", route_class=EnvelopeRoute)

ALLOWED_MEDIA_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class ScanRequest(BaseModel):
    image_base64: str
    media_type: str = "image/jpeg"


@router.post("/scan")
async def scan_business_card(
    body: ScanRequest,
    auth: AuthContext = Depends(get_current_user),
) -> dict:
    """
    명함 이미지(Base64)를 Claude Vision으로 분석해 연락처 필드를 반환한다.
    - image_base64: Base64 인코딩된 이미지 문자열
    - media_type: image/jpeg | image/png | image/webp | image/gif
    """
    if body.media_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"지원하지 않는 이미지 형식입니다: {body.media_type}",
        )

    if not body.image_base64:
        raise HTTPException(status_code=422, detail="image_base64가 비어 있습니다")

    result = await anthropic_vision.scan_business_card(body.image_base64, body.media_type)

    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"])

    return result
