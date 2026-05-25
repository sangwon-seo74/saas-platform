from fastapi.testclient import TestClient
import main

client = TestClient(main.app, raise_server_exceptions=False)


def test_health_enveloped():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"data": {"status": "ok"}, "error": None}


def test_invalid_invite_returns_enveloped_error():
    r = client.get("/v1/accept-invite?token=clearly-invalid")
    assert r.status_code == 400
    body = r.json()
    assert body["data"] is None
    assert body["error"]["code"] == "http_400"
    assert isinstance(body["error"]["message"], str)


def test_me_requires_auth_enveloped():
    r = client.get("/v1/me")
    assert r.status_code == 403  # HTTPBearer auto_error → 403
    body = r.json()
    assert body["data"] is None
    assert body["error"]["code"] == "http_403"


def test_validation_error_enveloped():
    r = client.post("/v1/auth/log-access", json={})  # missing required 'email'
    assert r.status_code == 422
    body = r.json()
    assert body["data"] is None
    assert body["error"]["code"] == "validation_error"


def test_me_rejects_garbage_token():
    r = client.get("/v1/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401
    body = r.json()
    assert body["error"]["code"] == "http_401"
