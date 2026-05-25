from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.auth import get_current_user
from app.database import get_db
from app.models.user import User
from app.services import github_service

router = APIRouter(tags=["github", "integrations"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class PushRequest(BaseModel):
    repo_name: str = Field(..., min_length=1, max_length=100)
    is_private: bool = True
    branch: str = Field(default="main", min_length=1, max_length=100)


class PushResponse(BaseModel):
    repo_url: str
    commit_sha: str


class PreviewResponse(BaseModel):
    files: list[str]
    auto_generated: list[str]
    total: int


class OAuthUrlResponse(BaseModel):
    url: str


class CallbackRequest(BaseModel):
    code: str = Field(..., min_length=1)


class CallbackResponse(BaseModel):
    username: str
    message: str


class IntegrationItem(BaseModel):
    provider: str
    connected: bool
    username: str | None


class MessageResponse(BaseModel):
    message: str


# ── GitHub Stage 5 routes ─────────────────────────────────────────────────────

@router.get(
    "/projects/{project_id}/github/preview",
    response_model=PreviewResponse,
    summary="Preview files that will be pushed to GitHub",
)
async def preview_github_push(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PreviewResponse:
    data = await github_service.get_preview(db, project_id, current_user.id)
    return PreviewResponse(**data)


@router.post(
    "/projects/{project_id}/github/push",
    response_model=PushResponse,
    status_code=201,
    summary="Create GitHub repo and push all approved files in a single commit",
)
async def push_to_github(
    project_id: UUID,
    body: PushRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PushResponse:
    # Verify project ownership + get object
    project = await github_service._get_project(db, project_id, current_user.id)

    # Retrieve decrypted GitHub token
    github_token = await github_service.get_decrypted_token(db, current_user.id, "github")
    if not github_token:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "GitHub integration not connected",
                "code": "GITHUB_NOT_CONNECTED",
            },
        )

    try:
        result = await github_service.push_to_github(
            db=db,
            project=project,
            repo_name=body.repo_name,
            is_private=body.is_private,
            branch=body.branch,
            github_token=github_token,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"detail": str(exc), "code": "GITHUB_PUSH_FAILED"},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"detail": f"GitHub push failed: {exc}", "code": "GITHUB_PUSH_FAILED"},
        ) from exc

    await github_service.save_push_result(
        db=db,
        project_id=project_id,
        repo_name=body.repo_name,
        branch=body.branch,
        is_private=body.is_private,
        result=result,
    )
    await github_service.advance_state_to_pushed(db, project_id, current_user.id)

    return PushResponse(**result)


# ── Integration routes ────────────────────────────────────────────────────────

@router.get(
    "/integrations",
    response_model=list[IntegrationItem],
    summary="List connection status for all integrations",
)
async def list_integrations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[IntegrationItem]:
    data = await github_service.list_integrations(db, current_user.id)
    return [IntegrationItem(**item) for item in data]


@router.get(
    "/integrations/github/oauth-url",
    response_model=OAuthUrlResponse,
    summary="Get GitHub OAuth authorization URL",
)
async def get_github_oauth_url(
    current_user: User = Depends(get_current_user),
) -> OAuthUrlResponse:
    return OAuthUrlResponse(url=github_service.get_oauth_url())


@router.post(
    "/integrations/github/callback",
    response_model=CallbackResponse,
    status_code=201,
    summary="Exchange OAuth code for token, encrypt and store",
)
async def github_oauth_callback(
    body: CallbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallbackResponse:
    try:
        token = await github_service.exchange_code_for_token(body.code)
    except (ValueError, Exception) as exc:
        raise HTTPException(
            status_code=400,
            detail={"detail": str(exc), "code": "GITHUB_OAUTH_FAILED"},
        ) from exc

    try:
        username = await github_service.get_github_username(token)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"detail": f"Failed to fetch GitHub user: {exc}", "code": "GITHUB_USER_FETCH_FAILED"},
        ) from exc

    await github_service.store_integration(
        db=db,
        user_id=current_user.id,
        provider="github",
        access_token=token,
        username=username,
    )

    return CallbackResponse(
        username=username,
        message=f"GitHub connected as @{username}",
    )


@router.delete(
    "/integrations/{provider}",
    response_model=MessageResponse,
    summary="Disconnect an integration",
)
async def delete_integration(
    provider: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    allowed = {"github", "vercel", "railway"}
    if provider not in allowed:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"Unknown provider '{provider}'",
                "code": "INVALID_PROVIDER",
            },
        )
    await github_service.delete_integration(db, current_user.id, provider)
    return MessageResponse(message=f"{provider} integration removed")
