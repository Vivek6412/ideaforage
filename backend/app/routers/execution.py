from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.websocket_manager import websocket_manager
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.schemas.execution import (
    ApproveTaskResponse,
    ExecutionStatusResponse,
    ExecutionTaskInfo,
    FixTaskRequest,
    MessageResponse,
    StartExecutionResponse,
    TaskDetailResponse,
)
from app.services import execution_service
from app.services.auth_service import get_api_key

# REST routes — include with prefix="/api/v1"
router = APIRouter(tags=["execution"])

# WebSocket route — include without prefix (path is /ws/...)
ws_router = APIRouter()


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


# ── REST endpoints ────────────────────────────────────────────────────────────

@router.post(
    "/projects/{project_id}/execution/start",
    response_model=StartExecutionResponse,
)
async def start_execution(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> StartExecutionResponse:
    result = await execution_service.start_execution(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        user_keys=user_keys,
    )
    return StartExecutionResponse(**result)


@router.get(
    "/projects/{project_id}/execution/status",
    response_model=ExecutionStatusResponse,
)
async def get_execution_status(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ExecutionStatusResponse:
    tasks = await execution_service.get_execution_status(db, project_id, current_user.id)
    return ExecutionStatusResponse(
        tasks=[ExecutionTaskInfo.model_validate(t) for t in tasks]
    )


# NOTE: specific path /tasks/{task_id}/approve and /tasks/{task_id}/fix
# defined before /tasks/{task_id} GET to avoid any routing ambiguity.

@router.post(
    "/projects/{project_id}/execution/tasks/{task_id}/approve",
    response_model=ApproveTaskResponse,
)
async def approve_task(
    project_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> ApproveTaskResponse:
    result = await execution_service.approve_task(
        db=db,
        task_id=task_id,
        project_id=project_id,
        user_id=current_user.id,
        user_keys=user_keys,
    )
    return ApproveTaskResponse(**result)


@router.post(
    "/projects/{project_id}/execution/tasks/{task_id}/fix",
    response_model=MessageResponse,
)
async def fix_task(
    project_id: UUID,
    task_id: UUID,
    data: FixTaskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> MessageResponse:
    result = await execution_service.fix_task(
        db=db,
        task_id=task_id,
        project_id=project_id,
        user_id=current_user.id,
        feedback=data.feedback,
        user_keys=user_keys,
    )
    return MessageResponse(**result)


@router.get(
    "/projects/{project_id}/execution/tasks/{task_id}",
    response_model=TaskDetailResponse,
)
async def get_task_detail(
    project_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TaskDetailResponse:
    detail = await execution_service.get_task_detail(
        db=db,
        task_id=task_id,
        project_id=project_id,
        user_id=current_user.id,
    )
    return TaskDetailResponse(
        task=ExecutionTaskInfo.model_validate(detail["task"]),
        generated_files=detail["generated_files"],
        validation_result=detail["validation_result"],
        error_log=detail["error_log"],
    )


@router.post(
    "/projects/{project_id}/execution/pause",
    response_model=MessageResponse,
)
async def pause_execution(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    result = await execution_service.pause_execution(db, project_id, current_user.id)
    return MessageResponse(**result)


@router.post(
    "/projects/{project_id}/execution/resume",
    response_model=MessageResponse,
)
async def resume_execution(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_keys: dict[str, str] = Depends(_get_user_keys),
) -> MessageResponse:
    result = await execution_service.resume_execution(
        db, project_id, current_user.id, user_keys
    )
    return MessageResponse(**result)


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@ws_router.websocket("/ws/projects/{project_id}/execution")
async def websocket_execution(
    websocket: WebSocket,
    project_id: UUID,
) -> None:
    """
    Client connects here to receive real-time execution events.
    Events are broadcast from execution_service via websocket_manager.
    """
    pid_str = str(project_id)
    await websocket_manager.connect(websocket, pid_str)
    try:
        while True:
            # Keep connection alive; client sends pings if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, pid_str)
    except Exception:
        websocket_manager.disconnect(websocket, pid_str)