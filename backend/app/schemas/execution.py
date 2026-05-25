from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class StartExecutionResponse(BaseModel):
    message: str
    websocket_url: str


class ExecutionTaskInfo(BaseModel):
    id: UUID
    task_name: str
    task_order: int
    status: str
    retry_count: int

    model_config = {"from_attributes": True}


class ExecutionStatusResponse(BaseModel):
    tasks: list[ExecutionTaskInfo]


class TaskDetailResponse(BaseModel):
    task: ExecutionTaskInfo
    generated_files: list[dict[str, Any]]
    validation_result: Optional[dict[str, Any]] = None
    error_log: Optional[str] = None


class ApproveTaskResponse(BaseModel):
    message: str
    next_task: Optional[str] = None


class FixTaskRequest(BaseModel):
    feedback: str


class MessageResponse(BaseModel):
    message: str