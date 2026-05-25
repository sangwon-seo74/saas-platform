from datetime import datetime, timezone, timedelta
from app.core.invite_token import create_invite_token, verify_invite_token


def _future():
    return (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def test_roundtrip_valid_token():
    token = create_invite_token(
        email="u@example.com", tenant_id="t1", role="sales",
        invited_by="inviter", expires_at=_future(),
    )
    payload = verify_invite_token(token)
    assert payload is not None
    assert payload["email"] == "u@example.com"
    assert payload["tenantId"] == "t1"
    assert payload["role"] == "sales"


def test_tampered_signature_rejected():
    token = create_invite_token(
        email="u@example.com", tenant_id="t1", role="sales",
        invited_by="", expires_at=_future(),
    )
    data, _sig = token.rsplit(".", 1)
    assert verify_invite_token(f"{data}.tampered") is None


def test_expired_token_rejected():
    past = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    token = create_invite_token(
        email="u@example.com", tenant_id="t1", role="sales",
        invited_by="", expires_at=past,
    )
    assert verify_invite_token(token) is None


def test_malformed_token_rejected():
    assert verify_invite_token("no-dot-here") is None
    assert verify_invite_token("") is None
