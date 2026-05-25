from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    current_state: str
    paused_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StageOutputResponse(BaseModel):
    id: UUID
    stage: str
    output_json: dict[str, Any]
    status: str
    user_feedback: Optional[str] = None
    round_number: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExecutionTaskSummary(BaseModel):
    id: UUID
    name: str
    status: str
    retry_count: int

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectResponse):
    stage_outputs: list[StageOutputResponse] = []
    execution_tasks: list[ExecutionTaskSummary] = []