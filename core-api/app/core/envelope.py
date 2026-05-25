import json
from typing import Callable

from fastapi.routing import APIRoute
from starlette.requests import Request
from starlette.responses import JSONResponse, Response


class EnvelopeRoute(APIRoute):
    """성공 응답을 { data, error } 봉투로 감싼다 (CLAUDE.md 응답 규칙).

    에러는 main.py의 예외 핸들러가 동일한 봉투로 변환하므로 여기서는 다루지 않는다.
    이미 봉투 형태이거나 JSON이 아닌 응답(예: openapi.json은 별도 라우트라 해당 없음)은 그대로 둔다.
    """

    def get_route_handler(self) -> Callable:
        original_route_handler = super().get_route_handler()

        async def custom_route_handler(request: Request) -> Response:
            response = await original_route_handler(request)

            body = getattr(response, "body", None)
            content_type = response.headers.get("content-type", "")
            if not body or "application/json" not in content_type:
                return response

            try:
                payload = json.loads(body)
            except (ValueError, TypeError):
                return response

            if isinstance(payload, dict) and "data" in payload and "error" in payload:
                return response

            headers = {
                k: v
                for k, v in response.headers.items()
                if k.lower() not in ("content-length", "content-type")
            }
            return JSONResponse(
                content={"data": payload, "error": None},
                status_code=response.status_code,
                headers=headers or None,
            )

        return custom_route_handler
