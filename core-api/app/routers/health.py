from fastapi import APIRouter
from app.core.envelope import EnvelopeRoute

router = APIRouter(route_class=EnvelopeRoute)


@router.get("/health")
def health():
    return {"status": "ok"}
