from __future__ import annotations

from typing import Any

from pydantic import BaseModel, field_validator

_VALID_SECTIONS = {
    "architecture", "tech_stack", "modules", "database_schema",
    "api_endpoints", "folder_structure", "third_party_integrations", "anti_patterns",
}


class BlueprintGenerateResponse(BaseModel):
    blueprint: dict[str, Any]
    mermaid_source: str
    warnings: list[str]


class BlueprintEditRequest(BaseModel):
    section: str
    changes: dict[str, Any]

    @field_validator("section")
    @classmethod
    def valid_section(cls, v: str) -> str:
        if v not in _VALID_SECTIONS:
            raise ValueError(f"section must be one of: {sorted(_VALID_SECTIONS)}")
        return v


class BlueprintEditResponse(BaseModel):
    updated_blueprint: dict[str, Any]


class GeneratedFile(BaseModel):
    name: str
    url: str


class BlueprintConfirmResponse(BaseModel):
    message: str
    files: list[GeneratedFile]


class BlueprintFileItem(BaseModel):
    filename: str
    download_url: str