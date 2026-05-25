from __future__ import annotations

import base64
import io
import json
import logging
import re
from typing import Any, Optional, Type, TypeVar
from uuid import UUID

from pydantic import BaseModel, ValidationError
from app.schemas.idea import IdeaProcessResponse, IdeaRefineResponse

import fitz  # PyMuPDF
from docx import Document
from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import ai_client
from app.core.state_machine import advance_state
from app.models.project import Project
from app.models.stage_output import StageOutput

logger = logging.getLogger(__name__)

MAX_ROUNDS: int = 3
MAX_PARSE_RETRIES: int = 2

# ── Schema + prompt constants ─────────────────────────────────────────────────

IDEA_EXTRACTION_SCHEMA: str = """{
  "title": "string — concise project name",
  "description": "string — one paragraph, clear and specific",
  "target_users": "string — who uses this and their primary pain point",
  "core_features": ["string — max 8, each concrete and buildable in one sprint"],
  "tech_preferences": ["string — any mentioned or inferred tech stack preferences"],
  "constraints": ["string — time, budget, or technical limitations"],
  "questions": [
    {
      "id": "string — q1, q2, ...",
      "question": "string — specific question about an unclear aspect",
      "field": "string — which schema field this answer will populate",
      "options": ["string — exactly 5 options when user answered idk, else []"]
    }
  ],
  "warnings": [
    {
      "type": "too_broad | infeasible | crowded_market",
      "message": "string — specific advisory, never blocking"
    }
  ],
  "ready_to_proceed": false
}"""

# FIX: XML-delimited output framing eliminates schema hallucination.
# Model must emit <output>...</output>; parser extracts only that region.
IDEA_EXTRACTION_PROMPT: str = """<task>
You are a product analyst. Extract a structured idea from the user input below.
</task>

<rules>
- Ask max {max_questions} clarifying questions this round
- Never re-ask fields already answered in previous rounds
- If user answered "idk" or equivalent: generate exactly 5 context-specific suggestions in that question's options array
- Warn if: core_features count > 8 → type=too_broad; ML/blockchain/hardware/IoT in core_features → type=infeasible; exact clone of major platform → type=crowded_market
- Warnings are advisory only — never block progression
- Set ready_to_proceed=true only when title, description, target_users, and core_features are all clear and specific
- Output MUST be wrapped in <output> and </output> tags
- Inside <output> tags: ONLY the raw JSON object — no markdown, no preamble, no trailing text
- NEVER output conversational text or a 'Product Analyst Report'. Even if the user's idea is excessively broad or complex, you MUST still output the exact JSON structure and place your feedback inside the warnings array.
</rules>

<output_schema>
{schema}
</output_schema>

<previous_context>
{previous_context}
</previous_context>

<user_input>
{USER_INPUT}
</user_input>

Respond now. Your entire response must be:
<output>
{{ valid JSON matching output_schema exactly }}
</output>"""


# ── Preprocessors ─────────────────────────────────────────────────────────────

def preprocess_text(text: str) -> str:
    return " ".join(text.split())


async def preprocess_voice(audio: bytes, openai_key: str) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=openai_key)
    response = await client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.mp3", io.BytesIO(audio), "audio/mpeg"),
    )
    return response.text


async def preprocess_file(file: UploadFile) -> str:
    content = await file.read()
    filename = (file.filename or "").lower()

    if filename.endswith((".md", ".txt")):
        return content.decode("utf-8", errors="ignore")

    if filename.endswith(".pdf"):
        doc = fitz.open(stream=content, filetype="pdf")
        return "\n".join(page.get_text() for page in doc)

    if filename.endswith(".docx"):
        word_doc = Document(io.BytesIO(content))
        return "\n".join(p.text for p in word_doc.paragraphs if p.text.strip())

    raise HTTPException(
        status_code=400,
        detail={
            "detail": "Unsupported file type. Allowed: .md, .txt, .pdf, .docx",
            "code": "UNSUPPORTED_FILE_TYPE",
        },
    )


async def preprocess_image(
    image_bytes: bytes,
    media_type: str,
    anthropic_key: str,
) -> str:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=anthropic_key)
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        system=(
            "Extract product idea from image. "
            "Return structured text only. Max 200 words."
        ),
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": base64.b64encode(image_bytes).decode("utf-8"),
                        },
                    },
                    {
                        "type": "text",
                        "text": "Describe the product idea shown in this image.",
                    },
                ],
            }
        ],
    )
    return response.content[0].text


def merge_inputs(
    text: Optional[str],
    voice_transcript: Optional[str],
    file_content: Optional[str],
    image_desc: Optional[str],
) -> str:
    parts: list[str] = []
    if text:
        parts.append(f"---USER TYPED---\n{text}")
    if voice_transcript:
        parts.append(f"---USER SAID (voice)---\n{voice_transcript}")
    if file_content:
        parts.append(f"---UPLOADED DOCUMENT---\n{file_content}")
    if image_desc:
        parts.append(f"---IMAGE DESCRIPTION---\n{image_desc}")
    if not parts:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "At least one input is required (text, voice, file, or image)",
                "code": "NO_INPUT_PROVIDED",
            },
        )
    return "\n\n".join(parts)


T = TypeVar('T', bound=BaseModel)

# ── JSON parse helpers ────────────────────────────────────────────────────────

# FIX: extract XML-bounded region first; fall back to fence-strip.
_XML_OUTPUT_RE = re.compile(r"<output>\s*(.*?)\s*</output>", re.DOTALL)


def _strip_fences(raw: str) -> str:
    """
    Extraction priority:
    1. Content inside <output>...</output> tags (and strip fences inside)
    2. Content inside ```...``` fences
    3. Raw string as-is
    """
    cleaned = raw.strip()
    
    # 1. XML tags
    m = _XML_OUTPUT_RE.search(cleaned)
    if m:
        cleaned = m.group(1).strip()

    # 2. Markdown fences (can be inside XML or bare)
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        cleaned = "\n".join(lines[1:end]).strip()

    return cleaned


async def _parse_with_retry(
    user_keys: dict[str, str],
    system: str,
    user_prompt: str,
    response_model: Type[T],
    max_tokens: int = 3000,
) -> T:
    raw = await ai_client.call_with_fallback(user_keys, system, user_prompt, max_tokens)
    print(f"DEBUG: RAW AI RESPONSE:\n{raw}")

    for attempt in range(MAX_PARSE_RETRIES):
        try:
            parsed_json = json.loads(_strip_fences(raw))
            return response_model.model_validate(parsed_json)
        except (json.JSONDecodeError, ValueError, ValidationError) as exc:
            if attempt == MAX_PARSE_RETRIES - 1:
                raise HTTPException(
                    status_code=502,
                    detail={
                        "detail": f"AI returned invalid format after retries: {str(exc)}",
                        "code": "AI_PARSE_FAILED",
                    },
                )
            fix_prompt = (
                f"Your previous response failed schema validation. Error: {exc}. "
                "Return ONLY the corrected valid JSON object wrapped in <output></output> tags, matching the exact required schema."
            )
            raw = await ai_client.call_with_fallback(user_keys, system, fix_prompt, max_tokens)

    raise HTTPException(status_code=502, detail={"detail": "AI parse failed", "code": "AI_PARSE_FAILED"})


# ── Stage output DB helpers ───────────────────────────────────────────────────

async def _get_latest_idea_output(
    db: AsyncSession, project_id: UUID
) -> Optional[StageOutput]:
    result = await db.execute(
        select(StageOutput)
        .where(
            StageOutput.project_id == project_id,
            StageOutput.stage == "idea_capture",
        )
        .order_by(StageOutput.round_number.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _save_idea_output(
    db: AsyncSession,
    project_id: UUID,
    output_json: dict[str, Any],
    round_number: int,
    status: str = "pending_review",
) -> StageOutput:
    result = await db.execute(
        select(StageOutput).where(
            StageOutput.project_id == project_id,
            StageOutput.stage == "idea_capture",
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
            stage="idea_capture",
            output_json=output_json,
            status=status,
            round_number=round_number,
        )
        db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


def _force_confirm_response(previous_json: dict[str, Any]) -> dict[str, Any]:
    result = dict(previous_json)
    result["questions"] = []
    result["ready_to_proceed"] = True
    result["warnings"] = previous_json.get("warnings", []) + [
        {
            "type": "max_rounds",
            "message": "Maximum clarification rounds reached. Proceeding with current information.",
        }
    ]
    return result


# ── Service functions ─────────────────────────────────────────────────────────

async def process_idea(
    db: AsyncSession,
    project_id: UUID,
    merged_input: str,
    user_keys: dict[str, str],
    round_num: int = 1,
) -> IdeaProcessResponse:
    if round_num > MAX_ROUNDS:
        previous = await _get_latest_idea_output(db, project_id)
        existing = previous.output_json if previous else {}
        forced = _force_confirm_response(existing)
        await _save_idea_output(db, project_id, forced, round_number=round_num)
        return IdeaProcessResponse.model_validate(forced)

    max_questions = max(1, MAX_ROUNDS - round_num + 1)
    print(f"DEBUG: MERGED INPUT FOR PROJECT {project_id}: {merged_input}")

    # FIX: Use single .format call to avoid double-brace escaping issues
    user_prompt = IDEA_EXTRACTION_PROMPT.format(
        max_questions=max_questions,
        previous_context="None — this is the first round.",
        schema=IDEA_EXTRACTION_SCHEMA,
        USER_INPUT=merged_input
    )

    system = (
        "You are a senior product analyst. "
        "Your response must contain ONLY an <output> XML block with valid JSON inside. "
        "No text before or after the <output> block."
    )

    parsed = await _parse_with_retry(user_keys, system, user_prompt, IdeaProcessResponse, max_tokens=1500)
    await _save_idea_output(db, project_id, parsed.model_dump(), round_number=round_num)
    return parsed


async def refine_idea(
    db: AsyncSession,
    project_id: UUID,
    answers: dict[str, Any],
    corrections: dict[str, Any],
    round_num: int,
    user_keys: dict[str, str],
) -> IdeaRefineResponse:
    previous = await _get_latest_idea_output(db, project_id)
    if not previous:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": "No idea capture found. Call /process first.",
                "code": "NO_PREVIOUS_IDEA",
            },
        )

    if round_num > MAX_ROUNDS:
        forced = _force_confirm_response(previous.output_json)
        await _save_idea_output(db, project_id, forced, round_number=round_num)
        return IdeaRefineResponse.model_validate(forced)

    max_questions = max(1, MAX_ROUNDS - round_num + 1)

    previous_context = (
        f"Current understood idea:\n{json.dumps(previous.output_json, indent=2)}\n\n"
        f"User answers to previous questions:\n{json.dumps(answers, indent=2)}\n\n"
        f"User corrections:\n{json.dumps(corrections, indent=2)}\n\n"
        "Rules: update only fields where corrections given; keep all other fields unchanged; "
        "never re-ask already answered questions."
    )

    # FIX: Use single .format call
    user_prompt = IDEA_EXTRACTION_PROMPT.format(
        max_questions=max_questions,
        previous_context=previous_context,
        schema=IDEA_EXTRACTION_SCHEMA,
        USER_INPUT="N/A — use previous context above."
    )

    system = (
        "You are a senior product analyst refining a product idea. "
        "Your response must contain ONLY an <output> XML block with valid JSON inside. "
        "No text before or after the <output> block."
    )

    parsed = await _parse_with_retry(user_keys, system, user_prompt, IdeaRefineResponse)
    await _save_idea_output(db, project_id, parsed.model_dump(), round_number=round_num)
    return parsed


async def confirm_idea(db: AsyncSession, project_id: UUID) -> None:
    latest = await _get_latest_idea_output(db, project_id)
    if not latest:
        raise HTTPException(
            status_code=404,
            detail={
                "detail": "No idea capture found. Call /process first.",
                "code": "NO_IDEA_TO_CONFIRM",
            },
        )

    latest.status = "approved"

    proj_result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Project not found", "code": "PROJECT_NOT_FOUND"},
        )

    advance_state(project, "IDEA_CONFIRMED")
    db.add(project)
    await db.commit()
