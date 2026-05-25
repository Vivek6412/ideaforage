from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.ai_client import ai_client
from app.core.state_machine import advance_state
from app.models.project import Project
from app.models.stage_output import StageOutput
from app.services import version_service
from app.services.auth_service import get_api_key

logger = logging.getLogger(__name__)

MAX_PARSE_RETRIES: int = 2
CONTEXT_FILE_NAMES: list[str] = [
    "PRODUCT.md", "STACK.md", "ARCHITECTURE.md", "FOLDER_STRUCTURE.md",
    "SCHEMA.md", "API_SPEC.md", "BUSINESS_LOGIC.md", "ENV.md",
    "CONVENTIONS.md", "ANTI_PATTERNS.md", "DEPENDENCIES.md", "FILE_INJECTION_GUIDE.md",
]

BLUEPRINT_PROMPT: str = """Role: software architect
Task: generate a complete technical blueprint as valid JSON

Input:
  structured_idea = {idea_json}
  verified_versions = {versions_json}
  deprecation_flags = {deprecations_json}

Rules:
- Architecture: monolithic for all MVPs (default, non-negotiable)
- Use ONLY versions from verified_versions — never assume or invent versions
- Inject all deprecation_flags entries directly into the anti_patterns field
- Database schema must be real (not placeholder): exact SQL types, constraints, UUID PKs, TIMESTAMPTZ
- API routes must be versioned /api/v1/ — all of them
- reasoning per tech choice: max 10 words
- complexity_estimate: "Low" | "Medium" | "High" — honest assessment
- If complexity is High: populate module_cut_suggestions with concrete cuts
- Return ONLY valid JSON matching this exact schema:

{{
  "architecture": {{
    "type": "monolithic",
    "reasoning": "",
    "diagram_description": ""
  }},
  "tech_stack": {{
    "frontend":  {{"tech": "", "version": "", "reasoning": ""}},
    "backend":   {{"tech": "", "version": "", "reasoning": ""}},
    "database":  {{"tech": "", "version": "", "reasoning": ""}},
    "auth":      {{"tech": "", "version": "", "reasoning": ""}},
    "ai":        {{"tech": "", "version": "", "reasoning": ""}},
    "deployment":{{"frontend": "", "backend": ""}}
  }},
  "modules": [
    {{"name": "", "description": "", "sub_components": [], "depends_on": []}}
  ],
  "database_schema": {{
    "tables": [
      {{
        "name": "",
        "fields": [
          {{"name": "", "type": "", "constraints": []}}
        ],
        "relationships": [],
        "indexes": []
      }}
    ]
  }},
  "api_endpoints": [
    {{"method": "", "route": "/api/v1/...", "description": "", "auth_required": true}}
  ],
  "folder_structure": "",
  "third_party_integrations": [],
  "anti_patterns": [],
  "module_cut_suggestions": [],
  "complexity_estimate": "",
  "estimated_modules_count": 0
}}"""

_SECTION_EDIT_SYSTEM: str = """You are a software architect editing one section of a technical blueprint.
Given the current section value and the requested changes, return ONLY the updated section value as valid JSON.
Maintain all existing fields. Apply only the requested changes precisely.
Return ONLY valid JSON matching the original section's structure. No markdown fences, no explanation."""

_CONTEXT_FILES_SYSTEM: str = """You are a senior software architect generating project documentation for an AI coding agent.
Based on the provided blueprint JSON, generate exactly 12 markdown documentation files.

Return ONLY a valid JSON object where each key is the exact filename and each value is the complete markdown file content as a string.

Generate these files with enough detail for an AI agent to build the entire project without ambiguity:

1. "PRODUCT.md"             — what is built, who it's for, why, core value proposition, success metrics
2. "STACK.md"               — exact tech stack, versions, reasoning per choice, no alternatives allowed
3. "ARCHITECTURE.md"        — system design, component relationships, data flow, request lifecycle
4. "FOLDER_STRUCTURE.md"    — complete directory tree with description for every folder and key file
5. "SCHEMA.md"              — complete database schema as SQL CREATE TABLE statements with all constraints
6. "API_SPEC.md"            — ALL endpoints: method, path, auth, request body, response shape
7. "BUSINESS_LOGIC.md"      — all business rules, validations, calculations, state machines, edge cases
8. "ENV.md"                 — every environment variable: name, description, example, which service provides it
9. "CONVENTIONS.md"         — naming rules, code patterns, file structure rules, do/don't examples
10. "ANTI_PATTERNS.md"      — specific things to NEVER do in this codebase, with reason for each
11. "DEPENDENCIES.md"       — all packages with exact versions and install commands (pip + npm)
12. "FILE_INJECTION_GUIDE.md" — prompt execution order, which files to inject with each prompt, prompt types

Return ONLY valid JSON. No markdown fences. No text outside the JSON object."""


# ── Mermaid generation (no Claude call) ───────────────────────────────────────

def _generate_mermaid(blueprint: dict[str, Any]) -> str:
    """Generate Mermaid architecture diagram from blueprint JSON. Zero Claude calls."""
    lines: list[str] = ["graph TB"]
    tech_stack = blueprint.get("tech_stack", {})
    modules = blueprint.get("modules", [])
    integrations = blueprint.get("third_party_integrations", [])

    # Node definitions
    lines.append('    User([" 👤 User "])')

    node_map: dict[str, str] = {}
    nid = 0

    layer_icons = {
        "frontend": "🖥️", "backend": "⚙️", "database": "🗄️",
        "auth": "🔐", "ai": "🤖", "cache": "⚡",
    }
    for layer, info in tech_stack.items():
        if layer == "deployment" or not isinstance(info, dict):
            continue
        tech = info.get("tech", layer.capitalize())
        ver = info.get("version", "")
        label = f"{tech} {ver}".strip() if ver else tech
        icon = layer_icons.get(layer, "📦")
        nid_str = f"N{nid}"
        node_map[layer] = nid_str
        nid += 1
        if layer == "database":
            lines.append(f'    {nid_str}[("{icon} {label}")]')
        else:
            lines.append(f'    {nid_str}["{icon} {label}"]')

    int_nodes: list[str] = []
    for integration in integrations[:3]:
        name = integration if isinstance(integration, str) else integration.get("name", "External API")
        int_id = f"INT{nid}"
        int_nodes.append(int_id)
        nid += 1
        lines.append(f'    {int_id}["🔌 {name}"]')

    lines.append("")

    # Edges
    fe = node_map.get("frontend")
    be = node_map.get("backend") or node_map.get("api")
    db = node_map.get("database")
    ai = node_map.get("ai")
    auth = node_map.get("auth")

    if fe:
        lines.append(f"    User -->|HTTPS| {fe}")
    if fe and be:
        lines.append(f"    {fe} -->|REST / WS| {be}")
    elif fe and not be:
        lines.append(f"    {fe} -->|API| DB")
    if be and db:
        lines.append(f"    {be} -->|SQL| {db}")
    if be and ai:
        lines.append(f"    {be} -->|HTTPS| {ai}")
    if be and auth:
        lines.append(f"    {be} -->|JWT| {auth}")
    for int_node in int_nodes:
        if be:
            lines.append(f"    {be} -->|API| {int_node}")

    # Modules subgraph
    if modules:
        lines.append("")
        lines.append("    subgraph Modules[Application Modules]")
        for mod in modules[:6]:
            if isinstance(mod, dict):
                mod_name = mod.get("name", "Module")
                safe_id = "".join(c if c.isalnum() else "_" for c in mod_name)[:12]
                lines.append(f'        {safe_id}["{mod_name}"]')
        lines.append("    end")
        if be:
            lines.append(f"    {be} --- Modules")

    return "\n".join(lines)


# ── JSON parse with retry ─────────────────────────────────────────────────────

def _parse_json(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        cleaned = "\n".join(lines[1:end]).strip()
    return json.loads(cleaned)


async def _get_user_keys(db: AsyncSession, user_id: UUID) -> dict[str, str]:
    keys: dict[str, str] = {}
    for provider in ("anthropic", "openai", "gemini"):
        key = await get_api_key(db, user_id, provider)
        if key:
            keys[provider] = key
    return keys


async def _ai_json(
    db: AsyncSession,
    user_id: UUID,
    user_prompt: str,
    system: str,
    max_tokens: int = 8000,
) -> dict[str, Any]:
    """Call AI, parse JSON, retry up to MAX_PARSE_RETRIES on parse failure."""
    user_keys = await _get_user_keys(db, user_id)
    raw = await ai_client.call_with_fallback(user_keys, system, user_prompt, max_tokens)
    for attempt in range(MAX_PARSE_RETRIES):
        try:
            return _parse_json(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            if attempt == MAX_PARSE_RETRIES - 1:
                raise HTTPException(
                    status_code=502,
                    detail={"detail": "AI returned invalid JSON after retries", "code": "AI_PARSE_FAILED"},
                )
            fix_prompt = f"Your previous response was not valid JSON. Error: {exc}. Return ONLY valid JSON, nothing else."
            raw = await ai_client.call_with_fallback(user_keys, system, fix_prompt, max_tokens)
    raise HTTPException(status_code=502, detail={"detail": "AI parse failed", "code": "AI_PARSE_FAILED"})


# ── Stage output helpers ──────────────────────────────────────────────────────

async def _get_idea_output(db: AsyncSession, project_id: UUID) -> dict[str, Any]:
    """Load approved idea_capture stage output or latest pending."""
    result = await db.execute(
        select(StageOutput)
        .where(StageOutput.project_id == project_id, StageOutput.stage == "idea_capture")
        .order_by(StageOutput.round_number.desc())
        .limit(1)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"detail": "No idea capture found. Complete Stage 1 first.", "code": "NO_IDEA_OUTPUT"},
        )
    return record.output_json


async def _upsert_blueprint_output(
    db: AsyncSession,
    project_id: UUID,
    output_json: dict[str, Any],
    status: str = "pending_review",
    round_number: int = 1,
) -> StageOutput:
    result = await db.execute(
        select(StageOutput).where(
            StageOutput.project_id == project_id,
            StageOutput.stage == "blueprint",
            StageOutput.round_number == round_number,
        )
    )
    record = result.scalar_one_or_none()
    if record:
        record.output_json = output_json
        record.status = status
    else:
        record = StageOutput(
            project_id=project_id,
            stage="blueprint",
            output_json=output_json,
            status=status,
            round_number=round_number,
        )
        db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def _get_blueprint_output(db: AsyncSession, project_id: UUID) -> StageOutput:
    result = await db.execute(
        select(StageOutput)
        .where(StageOutput.project_id == project_id, StageOutput.stage == "blueprint")
        .order_by(StageOutput.round_number.desc())
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=404,
            detail={"detail": "No blueprint found. Run /generate first.", "code": "NO_BLUEPRINT"},
        )
    return record


# ── Supabase Storage ──────────────────────────────────────────────────────────

async def _upload_to_supabase(project_id: UUID, filename: str, content: str) -> str:
    """Upload file to Supabase Storage bucket 'context-files'. Returns public URL."""
    path = f"{project_id}/{filename}"
    upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/context-files/{path}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            upload_url,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "Content-Type": "text/plain; charset=utf-8",
                "x-upsert": "true",
            },
            content=content.encode("utf-8"),
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail={
                "detail": f"Supabase Storage upload failed for {filename}: {resp.text[:200]}",
                "code": "STORAGE_UPLOAD_FAILED",
            },
        )
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/context-files/{path}"


# ── Project state helpers ─────────────────────────────────────────────────────

async def _get_project(db: AsyncSession, project_id: UUID, user_id: UUID) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Project not found", "code": "PROJECT_NOT_FOUND"},
        )
    return project


# ── Public service functions ──────────────────────────────────────────────────

async def generate_blueprint(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> dict[str, Any]:
    """
    1. Load structured idea from stage_outputs.
    2. Fetch verified versions from PyPI/npm.
    3. Build deprecation flags + compatibility warnings.
    4. Single Claude call with BLUEPRINT_PROMPT.
    5. Generate Mermaid from blueprint JSON (no extra Claude call).
    6. Save to stage_outputs, advance state if needed.
    7. Return {blueprint, mermaid_source, warnings}.
    """
    project = await _get_project(db, project_id, user_id)

    # Auto-advance IDEA_CONFIRMED → BLUEPRINT_DRAFT
    if project.current_state == "IDEA_CONFIRMED":
        advance_state(project, "BLUEPRINT_DRAFT")
        await db.commit()
    elif project.current_state not in ("BLUEPRINT_DRAFT",):
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"Cannot generate blueprint from state {project.current_state}",
                "code": "INVALID_STATE_FOR_BLUEPRINT",
            },
        )

    idea_output = await _get_idea_output(db, project_id)
    structured_idea = idea_output.get("structured_idea", idea_output)

    # Fetch live versions — never use Claude's memory
    versions = await version_service.get_verified_versions(structured_idea)
    deprecations = version_service.get_deprecation_flags(structured_idea, versions)
    compat_warnings = version_service.check_compatibility(structured_idea, versions)

    prompt_content = BLUEPRINT_PROMPT.format(
        idea_json=json.dumps(structured_idea, indent=2),
        versions_json=json.dumps(versions, indent=2),
        deprecations_json=json.dumps(deprecations, indent=2),
    )

    blueprint = await _ai_json(
        db=db,
        user_id=user_id,
        user_prompt=prompt_content,
        system="You are a senior software architect. Return ONLY valid JSON matching the requested schema.",
        max_tokens=8000,
    )

    # Inject deprecations into anti_patterns if not already present
    existing_ap = {ap if isinstance(ap, str) else ap.get("deprecated", "") for ap in blueprint.get("anti_patterns", [])}
    for dep in deprecations:
        if dep.get("deprecated") not in existing_ap:
            blueprint.setdefault("anti_patterns", []).append(dep)

    mermaid_source = _generate_mermaid(blueprint)

    raw_suggestions = blueprint.get("module_cut_suggestions", [])
    clean_suggestions = [
        s if isinstance(s, str) else s.get("message", s.get("suggestion", str(s)))
        for s in raw_suggestions
    ]
    all_warnings = compat_warnings + clean_suggestions

    saved_json = {
        "blueprint": blueprint,
        "mermaid_source": mermaid_source,
        "warnings": all_warnings,
    }
    await _upsert_blueprint_output(db, project_id, saved_json, status="pending_review", round_number=1)

    return saved_json


async def edit_blueprint_section(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    section: str,
    changes: dict[str, Any],
) -> dict[str, Any]:
    """
    Load current blueprint, regenerate only the specified section via single Claude call,
    merge back, save, return updated_blueprint.
    """
    await _get_project(db, project_id, user_id)
    record = await _get_blueprint_output(db, project_id)
    saved = record.output_json
    blueprint: dict[str, Any] = saved.get("blueprint", saved)

    current_section = blueprint.get(section)
    if current_section is None:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": f"Section '{section}' not found in blueprint",
                "code": "SECTION_NOT_FOUND",
            },
        )

    user_content = (
        f"CURRENT SECTION '{section}':\n{json.dumps(current_section, indent=2)}\n\n"
        f"REQUESTED CHANGES:\n{json.dumps(changes, indent=2)}\n\n"
        f"Return the updated '{section}' value as valid JSON."
    )

    updated_section = await _ai_json(
        db=db,
        user_id=user_id,
        user_prompt=user_content,
        system=_SECTION_EDIT_SYSTEM,
        max_tokens=4096,
    )

    blueprint[section] = updated_section
    saved["blueprint"] = blueprint
    saved["mermaid_source"] = _generate_mermaid(blueprint)

    record.output_json = saved
    await db.commit()

    return blueprint


async def confirm_blueprint(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> list[dict[str, str]]:
    """
    1. Approve blueprint stage_output.
    2. Generate 12 context files via Claude.
    3. Upload each to Supabase Storage.
    4. Store file URLs in stage_output.
    5. Advance state BLUEPRINT_DRAFT → BLUEPRINT_CONFIRMED.
    6. Return [{name, url}].
    """
    project = await _get_project(db, project_id, user_id)
    record = await _get_blueprint_output(db, project_id)
    blueprint = record.output_json.get("blueprint", record.output_json)

    from app.services import file_generator

    # 1. Generate all 12 context files via pure Python (Zero AI tokens)
    # Fetch original idea for better context mapping
    idea_json = await _get_idea_output(db, project_id)
    context_files = file_generator.generate_all_files(blueprint, project, idea_json)

    # 2. Upload to Supabase Storage
    uploaded_files = await file_generator.upload_to_storage(project_id, context_files)

    # 3. Persist approved output with file manifest
    record.output_json = {
        **record.output_json,
        "files": uploaded_files,
        "status": "approved",
    }
    record.status = "approved"

    # Advance state
    advance_state(project, "BLUEPRINT_CONFIRMED")
    await db.commit()

    return uploaded_files


async def get_blueprint_files(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> list[dict[str, str]]:
    """Return uploaded context file list from confirmed blueprint."""
    await _get_project(db, project_id, user_id)
    record = await _get_blueprint_output(db, project_id)
    files = record.output_json.get("files", [])
    return [{"filename": f.get("name", f.get("filename")), "download_url": f["url"]} for f in files]
