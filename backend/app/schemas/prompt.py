from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class PromptItem(BaseModel):
    id: str
    name: str
    type: str
    content: str
    depends_on: list[str] = []


class PromptGenerateResponse(BaseModel):
    prompts: list[PromptItem]


class RegenerateRequest(BaseModel):
    feedback: Optional[str] = None


class RegenerateResponse(BaseModel):
    prompt: PromptItem


class ExecutionQueueItem(BaseModel):
    id: str
    name: str
    type: str
    order_index: int
    depends_on: list[str] = []


class ConfirmPromptsResponse(BaseModel):
    message: str
    execution_queue: list[ExecutionQueueItem]