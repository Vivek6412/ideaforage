from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.blueprint import (
    BlueprintConfirmResponse,
    BlueprintEditRequest,
    BlueprintEditResponse,
    BlueprintFileItem,
    BlueprintGenerateResponse,
    GeneratedFile,
)
from app.services import blueprint_service

router = APIRouter(tags=["blueprint"])


@router.post(
    "/projects/{project_id}/blueprint/generate",
    response_model=BlueprintGenerateResponse,
)
async def generate_blueprint(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BlueprintGenerateResponse:
    result = await blueprint_service.generate_blueprint(db, project_id, current_user.id)
    return BlueprintGenerateResponse(
        blueprint=result["blueprint"],
        mermaid_source=result["mermaid_source"],
        warnings=result.get("warnings", []),
    )


@router.patch(
    "/projects/{project_id}/blueprint/edit",
    response_model=BlueprintEditResponse,
)
async def edit_blueprint(
    project_id: UUID,
    data: BlueprintEditRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BlueprintEditResponse:
    updated = await blueprint_service.edit_blueprint_section(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        section=data.section,
        changes=data.changes,
    )
    return BlueprintEditResponse(updated_blueprint=updated)


@router.post(
    "/projects/{project_id}/blueprint/confirm",
    response_model=BlueprintConfirmResponse,
)
async def confirm_blueprint(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BlueprintConfirmResponse:
    files = await blueprint_service.confirm_blueprint(db, project_id, current_user.id)
    return BlueprintConfirmResponse(
        message="Blueprint confirmed. 12 context files generated and uploaded.",
        files=[GeneratedFile(name=f["name"], url=f["url"]) for f in files],
    )


@router.get(
    "/projects/{project_id}/blueprint/files",
    response_model=list[BlueprintFileItem],
)
async def get_blueprint_files(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[BlueprintFileItem]:
    files = await blueprint_service.get_blueprint_files(db, project_id, current_user.id)
    return [BlueprintFileItem(filename=f["filename"], download_url=f["download_url"]) for f in files]