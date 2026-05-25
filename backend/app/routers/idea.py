from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.idea import IdeaRefineRequest, IdeaProcessResponse, IdeaRefineResponse
from app.services import idea_service
from app.services.auth_service import get_api_key
from app.services.project_service import get_project

router = APIRouter(tags=["idea"])


# ── Shared dependency: fetch all user AI keys in one call ─────────────────────

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


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/idea/process",
    response_model=IdeaProcessResponse,
    status_code=status.HTTP_200_OK,
)
async def process_idea(
    project_id: UUID,
    text: Optional[str] = Form(None),
    voice: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> IdeaProcessResponse:
    await get_project(db, project_id, current_user.id)  # ownership check

    text_content: Optional[str] = idea_service.preprocess_text(text) if text else None

    voice_transcript: Optional[str] = None
    if voice:
        openai_key = user_keys.get("openai")
        if not openai_key:
            raise HTTPException(
                status_code=400,
                detail={
                    "detail": "Voice transcription requires an OpenAI API key",
                    "code": "OPENAI_KEY_REQUIRED",
                },
            )
        audio_bytes = await voice.read()
        voice_transcript = await idea_service.preprocess_voice(
            audio_bytes, openai_key
        )

    file_content: Optional[str] = None
    if file:
        file_content = await idea_service.preprocess_file(file)

    image_desc: Optional[str] = None
    if image:
        anthropic_key = user_keys.get("anthropic")
        if not anthropic_key:
            raise HTTPException(
                status_code=400,
                detail={
                    "detail": "Image analysis requires an Anthropic API key",
                    "code": "ANTHROPIC_KEY_REQUIRED",
                },
            )
        image_bytes = await image.read()
        image_desc = await idea_service.preprocess_image(
            image_bytes,
            image.content_type or "image/jpeg",
            anthropic_key,
        )

    merged = idea_service.merge_inputs(text_content, voice_transcript, file_content, image_desc)

    return await idea_service.process_idea(
        db=db,
        project_id=project_id,
        merged_input=merged,
        user_keys=user_keys,
        round_num=1,
    )


@router.post("/projects/{project_id}/idea/refine", response_model=IdeaRefineResponse)
async def refine_idea(
    project_id: UUID,
    data: IdeaRefineRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> IdeaRefineResponse:
    await get_project(db, project_id, current_user.id)
    return await idea_service.refine_idea(
        db=db,
        project_id=project_id,
        answers=data.answers,
        corrections=data.corrections,
        round_num=data.round,
        user_keys=user_keys,
    )


@router.post("/projects/{project_id}/idea/confirm")
async def confirm_idea(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await get_project(db, project_id, current_user.id)
    await idea_service.confirm_idea(db=db, project_id=project_id)
    return {"message": "Idea confirmed. Proceeding to blueprint generation.", "next_stage": "BLUEPRINT_DRAFT"}