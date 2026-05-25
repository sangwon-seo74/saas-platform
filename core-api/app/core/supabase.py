import httpx
from app.core.config import get_settings


def _service_headers() -> dict:
    key = get_settings().supabase_service_role_key
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _rest_url(path: str) -> str:
    return f"{get_settings().supabase_url}/rest/v1/{path}"


def _auth_admin_url(path: str) -> str:
    return f"{get_settings().supabase_url}/auth/v1/admin/{path}"


def get_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(headers=_service_headers(), timeout=10.0)


async def db_select(table: str, filters: dict, select: str = "*") -> list:
    params = {k: v for k, v in filters.items()}
    params["select"] = select
    async with get_client() as client:
        r = await client.get(_rest_url(table), params=params)
        r.raise_for_status()
        return r.json()


async def db_insert(table: str, data: dict) -> dict:
    async with get_client() as client:
        r = await client.post(
            _rest_url(table),
            json=data,
            headers={"Prefer": "return=representation"},
        )
        r.raise_for_status()
        result = r.json()
        return result[0] if isinstance(result, list) else result


async def db_update(table: str, filters: dict, data: dict) -> None:
    params = {k: v for k, v in filters.items()}
    async with get_client() as client:
        r = await client.patch(_rest_url(table), params=params, json=data)
        r.raise_for_status()


async def db_delete(table: str, filters: dict) -> None:
    params = {k: v for k, v in filters.items()}
    async with get_client() as client:
        r = await client.delete(_rest_url(table), params=params)
        r.raise_for_status()


async def auth_create_user(
    email: str,
    password: str,
    name: str,
    tenant_id: str,
    role: str,
) -> dict:
    async with get_client() as client:
        r = await client.post(
            _auth_admin_url("users"),
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"name": name},
                "app_metadata": {"tenant_id": tenant_id, "role": role},
            },
        )
        r.raise_for_status()
        return r.json()


async def auth_update_user_password(user_id: str, password: str) -> None:
    async with get_client() as client:
        r = await client.put(
            _auth_admin_url(f"users/{user_id}"),
            json={"password": password},
        )
        r.raise_for_status()


async def auth_generate_magic_link(email: str, redirect_to: str) -> str:
    async with get_client() as client:
        r = await client.post(
            _auth_admin_url("generate_link"),
            json={"type": "magiclink", "email": email, "options": {"redirect_to": redirect_to}},
        )
        r.raise_for_status()
        data = r.json()
        link = (data.get("properties") or {}).get("action_link") or data.get("action_link")
        if not link:
            raise ValueError("No action_link in response")
        return link
