import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.core import supabase as db
from app.core.envelope import EnvelopeRoute

router = APIRouter(prefix="/v1", route_class=EnvelopeRoute)


class SignupRequest(BaseModel):
    company_name: str
    admin_name: str
    email: EmailStr
    password: str
    plan_code: str
    domain: str


@router.post("/signup")
async def signup(body: SignupRequest):
    if len(body.company_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="회사명은 2자 이상이어야 합니다")
    if len(body.admin_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="이름은 2자 이상이어야 합니다")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="비밀번호는 8자 이상이어야 합니다")

    # 이메일 중복 확인
    existing = await db.db_select("users", {"email": f"eq.{body.email}", "select": "id"})
    if existing:
        raise HTTPException(status_code=409, detail="이미 가입된 이메일입니다")

    # 플랜 조회
    plans = await db.db_select(
        "plans",
        {"code": f"eq.{body.plan_code}", "is_active": "eq.true", "select": "id,code,name,monthly_price"},
    )
    if not plans:
        raise HTTPException(status_code=400, detail="존재하지 않는 요금제입니다")
    plan = plans[0]

    # 테넌트 생성
    tenant_id = str(uuid.uuid4())
    await db.db_insert("tenants", {
        "id": tenant_id,
        "name": body.company_name.strip(),
        "signup_domain": body.domain,
        "signup_plan_code": body.plan_code,
    })

    # 관리자 계정 생성 (Supabase auth → trigger → public.users 동기화)
    user_data = await db.auth_create_user(
        email=body.email,
        password=body.password,
        name=body.admin_name.strip(),
        tenant_id=tenant_id,
        role="admin",
    )
    user_id = user_data["id"]

    # 구독 생성 (무료 플랜은 바로 active, 유료는 pending_payment)
    subscription_status = "active" if plan["monthly_price"] == 0 else "pending_payment"
    subscription = await db.db_insert("tenant_subscriptions", {
        "tenant_id": tenant_id,
        "plan_id": plan["id"],
        "billing_cycle": "monthly",
        "status": subscription_status,
    })

    return {
        "message": "회사 계정이 생성되었습니다",
        "tenant_id": tenant_id,
        "user": {"id": user_id, "email": body.email, "name": body.admin_name.strip()},
        "subscription": {
            "id": subscription.get("id", ""),
            "plan_code": body.plan_code,
            "status": subscription_status,
        },
    }
