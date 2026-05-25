from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.state_machine import advance_state
from app.models.execution_task import ExecutionTask
from app.models.project import Project
from app.models.stage_output import StageOutput


async def create_project(
    db: AsyncSession,
    user_id: UUID,
    name: str,
) -> Project:
    project = Project(user_id=user_id, name=name)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def get_projects(
    db: AsyncSession,
    user_id: UUID,
) -> list[Project]:
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())


async def get_project(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> Project:
    """Fetch project and verify ownership. Raises 404 if not found or not owned."""
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == user_id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": "Project not found",
                "code": "PROJECT_NOT_FOUND",
            },
        )
    return project


async def get_project_with_details(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> tuple[Project, list[StageOutput], list[ExecutionTask]]:
    project = await get_project(db, project_id, user_id)

    stage_result = await db.execute(
        select(StageOutput)
        .where(StageOutput.project_id == project_id)
        .order_by(StageOutput.created_at.asc())
    )
    stage_outputs = list(stage_result.scalars().all())

    task_result = await db.execute(
        select(ExecutionTask)
        .where(ExecutionTask.project_id == project_id)
        .order_by(ExecutionTask.created_at.asc())
    )
    execution_tasks = list(task_result.scalars().all())

    return project, stage_outputs, execution_tasks


async def delete_project(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> None:
    project = await get_project(db, project_id, user_id)
    await db.delete(project)
    await db.commit()


async def advance_project_state(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    new_state: str,
) -> Project:
    project = await get_project(db, project_id, user_id)
    advance_state(project, new_state)  # raises HTTPException on invalid
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return project


async def pause_project(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    reason: str,
) -> Project:
    project = await get_project(db, project_id, user_id)
    previous_state = project.current_state
    advance_state(project, "PAUSED")
    # Encode both reason and previous_state for resume_project to read back.
    project.paused_reason = json.dumps(
        {"reason": reason, "previous_state": previous_state}
    )
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return project


async def resume_project(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> Project:
    project = await get_project(db, project_id, user_id)

    if project.current_state != "PAUSED":
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "Project is not paused",
                "code": "NOT_PAUSED",
            },
        )

    try:
        paused_data: dict = json.loads(project.paused_reason or "{}")
        previous_state: str | None = paused_data.get("previous_state")
    except (json.JSONDecodeError, AttributeError):
        previous_state = None

    if not previous_state:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "Cannot determine previous state — paused_reason is corrupt or missing",
                "code": "RESUME_FAILED",
            },
        )

    advance_state(project, previous_state)
    project.paused_reason = None
    project.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(project)
    return project