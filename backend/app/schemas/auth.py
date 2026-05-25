from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

_KEY_PROVIDERS = {"anthropic", "openai", "gemini"}
_INTEGRATION_PROVIDERS = {"github", "vercel", "railway"}


# ── Requests ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ApiKeyRequest(BaseModel):
    provider: str
    api_key: str

    @field_validator("provider")
    @classmethod
    def valid_provider(cls, v: str) -> str:
        if v not in _KEY_PROVIDERS:
            raise ValueError("provider must be anthropic, openai, or gemini")
        return v


class VerifyKeyRequest(BaseModel):
    provider: str

    @field_validator("provider")
    @classmethod
    def valid_provider(cls, v: str) -> str:
        if v not in _KEY_PROVIDERS:
            raise ValueError("provider must be anthropic, openai, or gemini")
        return v


class GithubCallbackRequest(BaseModel):
    code: str


# ── Responses ─────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    tier: str
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RegisterResponse(BaseModel):
    user: UserResponse
    message: str


class MessageResponse(BaseModel):
    message: str


class ApiKeyResponse(BaseModel):
    provider: str
    has_key: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class VerifyKeyResponse(BaseModel):
    valid: bool
    error: Optional[str] = None


class IntegrationResponse(BaseModel):
    provider: str
    connected: bool
    username: Optional[str] = None

    model_config = {"from_attributes": True}


class OAuthUrlResponse(BaseModel):
    url: str


class GithubCallbackResponse(BaseModel):
    username: Optional[str]
    message: str