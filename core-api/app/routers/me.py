from fastapi import APIRouter, Depends
from app.core.envelope import EnvelopeRoute
from app.dependencies import AuthContext, get_current_user

router = APIRouter(prefix="/v1", route_class=EnvelopeRoute)


@router.get("/me")
def get_me(auth: AuthContext = Depends(get_current_user)):
    return {
        "user_id": auth.user_id,
        "tenant_id": auth.tenant_id,
        "role": auth.role,
        "email": auth.email,
    }
