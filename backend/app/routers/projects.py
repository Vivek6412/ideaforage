from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.project import (
    ExecutionTaskSummary,
    ProjectCreate,
    ProjectDetail,
    ProjectResponse,
    StageOutputResponse,
)
from app.services import project_service

router = APIRouter(tags=["projects"])


@router.get("/projects", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectResponse]:
    projects = await project_service.get_projects(db, current_user.id)
    return [ProjectResponse.model_validate(p) for p in projects]


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = await project_service.create_project(db, current_user.id, data.name)
    return ProjectResponse.model_validate(project)


@router.get("/projects/{project_id}", response_model=ProjectDetail)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectDetail:
    project, stage_outputs, execution_tasks = await project_service.get_project_with_details(
        db, project_id, current_user.id
    )
    return ProjectDetail(
        **ProjectResponse.model_validate(project).model_dump(),
        stage_outputs=[StageOutputResponse.model_validate(s) for s in stage_outputs],
        execution_tasks=[ExecutionTaskSummary.model_validate(t) for t in execution_tasks],
    )


@router.delete("/projects/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await project_service.delete_project(db, project_id, current_user.id)
    return MessageResponse(message="Project deleted successfully")