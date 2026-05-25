from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.prompt import (
    ConfirmPromptsResponse,
    ExecutionQueueItem,
    PromptGenerateResponse,
    PromptItem,
    RegenerateRequest,
    RegenerateResponse,
)
from app.services import prompt_service
from app.services.auth_service import get_api_key

router = APIRouter(tags=["prompts"])


async def _get_user_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    keys: dict[str, str] = {}
    for provider in ("anthropic", "openai", "gemini"):
        key = await get_api_key(db, current_user.id, provider)
        if key:
            keys[provider] = key
    return keys


@router.post(
    "/projects/{project_id}/prompts/generate",
    response_model=PromptGenerateResponse,
)
async def generate_prompts(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> PromptGenerateResponse:
    try:
        result = await prompt_service.generate_prompts(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            user_keys=user_keys,
        )
        return PromptGenerateResponse(
            prompts=[PromptItem(**p) for p in result["prompts"]]
        )
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail={"detail": "Internal Server Error during generation", "traceback": error_trace}
        )


# NOTE: defined before /{prompt_id}/regenerate — different HTTP method (PATCH vs POST)
# so no routing conflict, but explicit ordering is cleaner.
@router.post(
    "/projects/{project_id}/prompts/confirm",
    response_model=ConfirmPromptsResponse,
)
async def confirm_prompts(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ConfirmPromptsResponse:
    result = await prompt_service.confirm_prompts(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
    )
    return ConfirmPromptsResponse(
        message=result["message"],
        execution_queue=[
            ExecutionQueueItem(**item) for item in result["execution_queue"]
        ],
    )


@router.patch(
    "/projects/{project_id}/prompts/{prompt_id}/regenerate",
    response_model=RegenerateResponse,
)
async def regenerate_prompt(
    project_id: UUID,
    prompt_id: str,
    data: RegenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> RegenerateResponse:
    prompt = await prompt_service.regenerate_prompt(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        prompt_id=prompt_id,
        feedback=data.feedback,
        user_keys=user_keys,
    )
    return RegenerateResponse(prompt=PromptItem(**prompt))