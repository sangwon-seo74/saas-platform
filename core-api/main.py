from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.routers import health, me, auth_log, invite, admin

settings = get_settings()

app = FastAPI(title="core-api", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "data": None,
            "error": {"code": f"http_{exc.status_code}", "message": exc.detail},
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    msg = "; ".join(
        f"{'.'.join(str(p) for p in e.get('loc', []))}: {e.get('msg', '')}"
        for e in exc.errors()
    ) or "요청 형식이 올바르지 않습니다"
    return JSONResponse(
        status_code=422,
        content={"data": None, "error": {"code": "validation_error", "message": msg}},
    )


app.include_router(health.router)
app.include_router(me.router)
app.include_router(auth_log.router)
app.include_router(invite.router)
app.include_router(admin.router)
