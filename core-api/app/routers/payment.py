"""
Toss Payments 샌드박스 연동 — 실제 결제 검증 없이 구독을 활성화한다.
실운영 전환 시: /confirm 엔드포인트에서 Toss API 검증 로직 추가.
"""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core import supabase as db
from app.core.config import get_settings
from app.core.envelope import EnvelopeRoute
from app.dependencies import AuthContext, get_current_user

router = APIRouter(prefix="/v1/payment", route_class=EnvelopeRoute)

TOSS_SANDBOX_CLIENT_KEY = "test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq"


class PrepareRequest(BaseModel):
    plan_code: str
    billing_cycle: str  # monthly | yearly
    tenant_id: str


class ConfirmRequest(BaseModel):
    order_id: str
    payment_key: str = ""
    amount: int = 0


@router.post("/prepare")
async def prepare_payment(body: PrepareRequest, auth: AuthContext = Depends(get_current_user)):
    if auth.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 결제를 진행할 수 있습니다")

    plans = await db.db_select(
        "plans",
        {"code": f"eq.{body.plan_code}", "is_active": "eq.true", "select": "id,name,monthly_price,yearly_price"},
    )
    if not plans:
        raise HTTPException(status_code=400, detail="존재하지 않는 요금제입니다")

    plan = plans[0]
    amount = plan["yearly_price"] if body.billing_cycle == "yearly" else plan["monthly_price"]
    order_id = f"order_{uuid.uuid4().hex[:16]}"
    order_name = f"{plan['name']} ({('연간' if body.billing_cycle == 'yearly' else '월간')})"

    # 임시 주문 저장 (tenant_invoices에 pending 상태로)
    await db.db_insert("tenant_invoices", {
        "tenant_id": body.tenant_id,
        "amount": amount,
        "status": "pending",
        "pg_order_id": order_id,
        "description": order_name,
    })

    settings = get_settings()
    client_key = getattr(settings, "toss_client_key", TOSS_SANDBOX_CLIENT_KEY)

    return {
        "order_id": order_id,
        "amount": amount,
        "order_name": order_name,
        "client_key": client_key,
    }


@router.post("/confirm")
async def confirm_payment(body: ConfirmRequest, auth: AuthContext = Depends(get_current_user)):
    """
    결제 결과와 무관하게 구독을 활성화한다 (샌드박스 모드).
    실운영 전환 시 Toss /v1/payments/confirm API 호출 추가 필요.
    """
    if auth.role != "admin":
        raise HTTPException(status_code=403, detail="관리자만 결제를 완료할 수 있습니다")

    # 인보이스 조회
    invoices = await db.db_select(
        "tenant_invoices",
        {"pg_order_id": f"eq.{body.order_id}", "tenant_id": f"eq.{auth.tenant_id}", "select": "id,amount,description"},
    )
    if not invoices:
        raise HTTPException(status_code=404, detail="주문 정보를 찾을 수 없습니다")

    invoice = invoices[0]

    # 인보이스 상태 → paid
    await db.db_update(
        "tenant_invoices",
        {"pg_order_id": f"eq.{body.order_id}"},
        {"status": "paid", "pg_payment_key": body.payment_key or "sandbox_mock"},
    )

    # 구독 활성화 (pending_payment → active)
    next_billing = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    subs = await db.db_select(
        "tenant_subscriptions",
        {"tenant_id": f"eq.{auth.tenant_id}", "select": "id,status"},
    )
    sub_id = ""
    if subs:
        sub_id = subs[0]["id"]
        await db.db_update(
            "tenant_subscriptions",
            {"tenant_id": f"eq.{auth.tenant_id}"},
            {
                "status": "active",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "next_billing_at": next_billing,
            },
        )

    return {
        "message": "결제가 완료되었습니다. 구독이 활성화되었습니다.",
        "subscription_id": sub_id,
        "status": "active",
    }
