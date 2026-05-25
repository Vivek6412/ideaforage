from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.encryption import decrypt, encrypt
from app.models.user import User, UserApiKey, UserIntegration
from app.schemas.auth import LoginRequest, RegisterRequest

logger = logging.getLogger(__name__)

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── User ──────────────────────────────────────────────────────────────────────

async def register(db: AsyncSession, data: RegisterRequest) -> User:
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise ValueError("Email already registered")
    user = User(
        email=data.email,
        password_hash=_pwd_context.hash(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login(db: AsyncSession, data: LoginRequest) -> tuple[User, str]:
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not _pwd_context.verify(data.password, user.password_hash):
        raise ValueError("Invalid credentials")
    token = _create_jwt(str(user.id))
    return user, token


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


def verify_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as e:
        raise ValueError("Invalid token") from e


def _create_jwt(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


# ── API Keys ──────────────────────────────────────────────────────────────────

async def save_api_key(
    db: AsyncSession,
    user_id: UUID,
    provider: str,
    raw_key: str,
) -> None:
    encrypted = encrypt(raw_key)
    result = await db.execute(
        select(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.encrypted_key = encrypted
        record.updated_at = datetime.now(timezone.utc)
    else:
        db.add(
            UserApiKey(
                user_id=user_id,
                provider=provider,
                encrypted_key=encrypted,
            )
        )
    await db.commit()


async def get_api_key(
    db: AsyncSession,
    user_id: UUID,
    provider: str,
) -> Optional[str]:
    result = await db.execute(
        select(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return None
    return decrypt(record.encrypted_key)


async def delete_api_key(
    db: AsyncSession,
    user_id: UUID,
    provider: str,
) -> None:
    result = await db.execute(
        select(UserApiKey).where(
            UserApiKey.user_id == user_id,
            UserApiKey.provider == provider,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        await db.delete(record)
        await db.commit()


async def verify_api_key(raw_key: str, provider: str) -> tuple[bool, Optional[str]]:
    """Returns (valid, error_message)."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if provider == "anthropic":
                resp = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": raw_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": "claude-haiku-4-5-20251001",
                        "max_tokens": 1,
                        "messages": [{"role": "user", "content": "hi"}],
                    },
                )
                if resp.status_code == 401:
                    return False, "Invalid API key"
                return True, None

            elif provider == "openai":
                # Auto-detect OpenRouter keys (sk-or-*) and verify against OpenRouter
                is_openrouter = raw_key.startswith("sk-or-")
                verify_url = (
                    "https://openrouter.ai/api/v1/models"
                    if is_openrouter
                    else "https://api.openai.com/v1/models"
                )
                resp = await client.get(
                    verify_url,
                    headers={"Authorization": f"Bearer {raw_key}"},
                )
                if resp.status_code == 401:
                    return False, "Invalid API key"
                return True, None

            elif provider == "gemini":
                resp = await client.get(
                    f"https://generativelanguage.googleapis.com/v1beta/models?key={raw_key}"
                )
                if resp.status_code in (400, 403):
                    return False, "Invalid API key"
                return True, None

    except httpx.RequestError as e:
        return False, f"Network error: {str(e)}"

    return False, "Unknown provider"


# ── Integrations ──────────────────────────────────────────────────────────────

async def save_integration(
    db: AsyncSession,
    user_id: UUID,
    provider: str,
    token: str,
    username: Optional[str],
) -> None:
    encrypted = encrypt(token)
    result = await db.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == user_id,
            UserIntegration.provider == provider,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.access_token = encrypted
        record.username = username
    else:
        db.add(
            UserIntegration(
                user_id=user_id,
                provider=provider,
                access_token=encrypted,
                username=username,
            )
        )
    await db.commit()


async def get_integration(
    db: AsyncSession,
    user_id: UUID,
    provider: str,
) -> Optional[str]:
    result = await db.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == user_id,
            UserIntegration.provider == provider,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return None
    return decrypt(record.access_token)