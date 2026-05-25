from __future__ import annotations

from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserApiKey, UserIntegration
from app.schemas.auth import (
    ApiKeyRequest,
    ApiKeyResponse,
    GithubCallbackRequest,
    GithubCallbackResponse,
    IntegrationResponse,
    LoginRequest,
    MessageResponse,
    OAuthUrlResponse,
    RegisterRequest,
    RegisterResponse,
    UserResponse,
    VerifyKeyRequest,
    VerifyKeyResponse,
)
from app.services import auth_service

router = APIRouter()

_KEY_PROVIDERS = ("anthropic", "openai", "gemini")
_INTEGRATION_PROVIDERS = ("github", "vercel", "railway")

_IS_PRODUCTION: bool = getattr(settings, "ENVIRONMENT", "development") == "production"


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post(
    "/auth/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    try:
        user = await auth_service.register(db, data)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"detail": str(e), "code": "EMAIL_TAKEN"},
        )
    return RegisterResponse(
        user=UserResponse.model_validate(user),
        message="Registration successful",
    )


@router.post("/auth/login", response_model=UserResponse)
async def login(
    data: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    try:
        user, token = await auth_service.login(db, data)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail={"detail": "Invalid email or password", "code": "INVALID_CREDENTIALS"},
        )
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=7 * 24 * 3600,
        samesite="lax",
        secure=_IS_PRODUCTION,
    )
    return UserResponse.model_validate(user)


@router.post("/auth/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite="lax",
    )
    return MessageResponse(message="Logged out successfully")


@router.get("/auth/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)


# ── API Keys ──────────────────────────────────────────────────────────────────

@router.get("/keys", response_model=List[ApiKeyResponse])
async def list_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ApiKeyResponse]:
    result = await db.execute(
        select(UserApiKey).where(UserApiKey.user_id == current_user.id)
    )
    records = result.scalars().all()
    record_map = {r.provider: r for r in records}
    return [
        ApiKeyResponse(
            provider=p,
            has_key=p in record_map,
            created_at=record_map[p].created_at if p in record_map else None,
        )
        for p in _KEY_PROVIDERS
    ]


@router.post("/keys", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def save_key(
    data: ApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    valid, error = await auth_service.verify_api_key(data.api_key, data.provider)
    if not valid:
        raise HTTPException(
            status_code=400,
            detail={"detail": error or "API key verification failed", "code": "INVALID_API_KEY"},
        )
    await auth_service.save_api_key(db, current_user.id, data.provider, data.api_key)
    return MessageResponse(message=f"{data.provider} API key saved successfully")


# NOTE: /keys/verify must be defined before /keys/{provider} to avoid
# FastAPI matching "verify" as a provider path parameter on POST method.
# Both are POST/DELETE so no HTTP-method conflict, but explicit ordering is safer.

@router.post("/keys/verify", response_model=VerifyKeyResponse)
async def verify_stored_key(
    data: VerifyKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VerifyKeyResponse:
    raw_key = await auth_service.get_api_key(db, current_user.id, data.provider)
    if not raw_key:
        raise HTTPException(
            status_code=404,
            detail={"detail": f"No {data.provider} key stored", "code": "KEY_NOT_FOUND"},
        )
    valid, error = await auth_service.verify_api_key(raw_key, data.provider)
    return VerifyKeyResponse(valid=valid, error=error)


@router.delete("/keys/{provider}", response_model=MessageResponse)
async def delete_key(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    if provider not in _KEY_PROVIDERS:
        raise HTTPException(
            status_code=400,
            detail={"detail": "Invalid provider", "code": "INVALID_PROVIDER"},
        )
    await auth_service.delete_api_key(db, current_user.id, provider)
    return MessageResponse(message=f"{provider} API key deleted")

