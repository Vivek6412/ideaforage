import uuid
from sqlalchemy import (
    Column, String, Boolean, Text, UniqueConstraint,
    CheckConstraint, ForeignKey, TIMESTAMP
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import text
from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("tier IN ('free','pro','team')", name="chk_users_tier"),
    )

    id            = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email         = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    full_name     = Column(String(255))
    tier          = Column(String(20), server_default="free")
    is_verified   = Column(Boolean, server_default=text("FALSE"))
    created_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
    updated_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))


class UserApiKey(Base):
    __tablename__ = "user_api_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_api_keys_user_provider"),
        CheckConstraint("provider IN ('anthropic','openai','gemini')", name="chk_user_api_keys_provider"),
    )

    id            = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider      = Column(String(30), nullable=False)
    encrypted_key = Column(Text, nullable=False)
    created_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))
    updated_at    = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))


class UserIntegration(Base):
    __tablename__ = "user_integrations"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", name="uq_user_integrations_user_provider"),
        CheckConstraint("provider IN ('github','vercel','railway')", name="chk_user_integrations_provider"),
    )

    id           = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id      = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider     = Column(String(30), nullable=False)
    access_token = Column(Text, nullable=False)
    username     = Column(String(255))
    created_at   = Column(TIMESTAMP(timezone=True), server_default=text("NOW()"))