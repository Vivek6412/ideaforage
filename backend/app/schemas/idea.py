from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class ClarifyingQuestion(BaseModel):
    id: str
    question: str
    field: str
    options: list[str] = []


class WarningModel(BaseModel):
    type: str
    message: str


class IdeaProcessResponse(BaseModel):
    title: str
    description: str
    target_users: str
    core_features: list[str]
    tech_preferences: list[str]
    constraints: list[str]
    questions: list[ClarifyingQuestion] = []
    warnings: list[WarningModel] = []
    ready_to_proceed: bool = False


class IdeaRefineRequest(BaseModel):
    answers: dict[str, Any]
    corrections: dict[str, Any]
    round: int


class IdeaRefineResponse(IdeaProcessResponse):
    pass


class IdeaConfirmResponse(BaseModel):
    message: str
    next_stage: str