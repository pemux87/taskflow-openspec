from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


VALIDATION_ERROR = "VALIDATION_ERROR"
TOO_LONG = "TOO_LONG"
INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
TOKEN_EXPIRED = "TOKEN_EXPIRED"
FORBIDDEN = "FORBIDDEN"
NOT_OWNER = "NOT_OWNER"
NOT_FOUND = "NOT_FOUND"
EMAIL_TAKEN = "EMAIL_TAKEN"
ALREADY_IN_TEAM = "ALREADY_IN_TEAM"


def error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={"error": {"code": VALIDATION_ERROR, "message": "입력값이 올바르지 않습니다"}},
    )


async def http_exception_handler(request: Request, exc):
    detail = exc.detail
    if isinstance(detail, dict):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": detail},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "ERROR", "message": str(detail)}},
    )
