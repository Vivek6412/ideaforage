from __future__ import annotations

import ast
import asyncio
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai_client import ai_client
from app.core.state_machine import advance_state
from app.core.websocket_manager import websocket_manager
from app.models.execution_log import ExecutionLog
from app.models.execution_task import ExecutionTask
from app.models.project import Project
from app.models.stage_output import StageOutput
from app.services import error_classifier

logger = logging.getLogger(__name__)

MAX_AUTO_RETRIES: int = 3       # agent fix attempts before PAUSED
PARSE_RETRIES: int = 2
VALIDATION_RETRIES: int = 2
API_RETRIES: int = 3
PROJECT_BASE_PATH: str = "/tmp/projects"

_EXECUTION_SYSTEM: str = (
    "You are a senior software engineer implementing a software module. "
    "Generate production-ready code files. No TODOs, no placeholders, no incomplete functions. "
    'Return ONLY valid JSON: {"files": [{"path": "relative/path", "content": "complete content"}]} '
    "No markdown fences, no explanation."
)


# ── ValidationResult ──────────────────────────────────────────────────────────

@dataclass
class ValidationResult:
    is_valid: bool
    missing_files: list[str] = field(default_factory=list)
    placeholder_violations: list[str] = field(default_factory=list)
    syntax_errors: list[str] = field(default_factory=list)
    path_violations: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "missing_files": self.missing_files,
            "placeholder_violations": self.placeholder_violations,
            "syntax_errors": self.syntax_errors,
            "path_violations": self.path_violations,
        }


# ── DB helpers ────────────────────────────────────────────────────────────────

async def log_event(
    db: AsyncSession,
    project_id: UUID,
    task_id: Optional[UUID],
    event: str,
    detail: dict[str, Any],
) -> None:
    """Insert execution_log row. Always commits immediately to preserve audit trail."""
    record = ExecutionLog(
        project_id=project_id,
        task_id=task_id,
        event=event,
        detail=detail,
    )
    db.add(record)
    await db.commit()


async def _get_project(
    db: AsyncSession, project_id: UUID, user_id: UUID
) -> Project:
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
            detail={"detail": "Project not found", "code": "PROJECT_NOT_FOUND"},
        )
    return project


async def _get_task(
    db: AsyncSession, task_id: UUID, project_id: UUID
) -> ExecutionTask:
    result = await db.execute(
        select(ExecutionTask).where(
            ExecutionTask.id == task_id,
            ExecutionTask.project_id == project_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(
            status_code=404,
            detail={"detail": "Task not found", "code": "TASK_NOT_FOUND"},
        )
    return task


async def _load_master_prompt(db: AsyncSession, project_id: UUID) -> str:
    """Load master_prompt from approved prompts stage_output."""
    result = await db.execute(
        select(StageOutput).where(
            StageOutput.project_id == project_id,
            StageOutput.stage == "prompts",
        )
    )
    record = result.scalar_one_or_none()
    if record:
        return record.output_json.get("master_prompt", "")
    return ""


async def _load_all_tasks(
    db: AsyncSession, project_id: UUID
) -> list[ExecutionTask]:
    result = await db.execute(
        select(ExecutionTask)
        .where(ExecutionTask.project_id == project_id)
        .order_by(ExecutionTask.task_order)
    )
    return list(result.scalars().all())


async def _fetch_context_files(db: AsyncSession, project_id: UUID, user_id: UUID) -> list[dict[str, str]]:
    """Download context files from Supabase storage URLs."""
    from app.services.blueprint_service import get_blueprint_files
    import httpx
    files_info = await get_blueprint_files(db, project_id, user_id)
    context_files = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        for f in files_info:
            try:
                resp = await client.get(f["download_url"])
                if resp.status_code == 200:
                    context_files.append({"name": f["filename"], "content": resp.text})
            except Exception as e:
                logger.warning("Failed to fetch context file %s: %s", f["filename"], e)
    return context_files


# ── Validation ────────────────────────────────────────────────────────────────

_PLACEHOLDER_PATTERNS: list[str] = [
    "TODO", "FIXME", "PLACEHOLDER", "YOUR_", "XXX",
    "pass  #", "raise NotImplementedError",
    "# implement", "# add implementation",
]


async def validate_task_output(
    files: list[dict[str, str]],
    task: ExecutionTask,
) -> ValidationResult:
    """
    Check: files present, no placeholders, valid syntax.
    Extracts expected file paths from task prompt heuristically.
    """
    if not files:
        return ValidationResult(
            is_valid=False,
            missing_files=["No files generated"],
        )

    placeholder_hits: list[str] = []
    syntax_errs: list[str] = []

    for f in files:
        path = f.get("path", "")
        content = f.get("content", "")

        # Placeholder check
        for pat in _PLACEHOLDER_PATTERNS:
            if pat in content:
                placeholder_hits.append(f"{path}: contains '{pat}'")
                break

        # Python syntax check
        if path.endswith(".py"):
            try:
                ast.parse(content)
            except SyntaxError as exc:
                syntax_errs.append(f"{path}: {exc}")

        # TypeScript basic syntax check (balanced braces)
        if path.endswith((".ts", ".tsx")):
            opens = content.count("{")
            closes = content.count("}")
            if abs(opens - closes) > 2:
                syntax_errs.append(f"{path}: unbalanced braces ({opens} open, {closes} close)")

    is_valid = not placeholder_hits and not syntax_errs
    return ValidationResult(
        is_valid=is_valid,
        placeholder_violations=placeholder_hits,
        syntax_errors=syntax_errs,
    )


# ── AI execution ──────────────────────────────────────────────────────────────

def _strip_fences(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        end = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        cleaned = "\n".join(lines[1:end]).strip()
    return cleaned


async def execute_task_via_api(
    db: AsyncSession,
    task: ExecutionTask,
    user_keys: dict[str, str],
    master_prompt: str = "",
) -> dict[str, Any]:
    """
    Call Claude API (with fallback chain) to generate task files.
    Returns {"files": [{"path": str, "content": str}]}.
    Raises HTTPException on total failure.
    """
    context = f"MASTER CONTEXT:\n{master_prompt}\n\n" if master_prompt else ""
    user_prompt = (
        f"{context}"
        f"TASK: {task.task_name}\n\n"
        f"TASK PROMPT:\n{task.prompt_used or ''}\n\n"
        "Generate all required files. Return ONLY valid JSON matching the schema."
    )

    raw = await ai_client.call_with_fallback(
        user_keys, _EXECUTION_SYSTEM, user_prompt, max_tokens=6000
    )

    for attempt in range(PARSE_RETRIES):
        try:
            parsed = json.loads(_strip_fences(raw))
            files = parsed.get("files", [])
            if not isinstance(files, list):
                raise ValueError("'files' must be a list")
            return {"files": files}
        except (json.JSONDecodeError, ValueError) as exc:
            if attempt == PARSE_RETRIES - 1:
                raise HTTPException(
                    status_code=502,
                    detail={
                        "detail": f"AI parse failed after retries: {exc}",
                        "code": "AI_PARSE_FAILED",
                    },
                )
            fix_prompt = (
                f"Invalid JSON response. Error: {exc}. "
                'Return ONLY valid JSON: {"files": [{"path": "...", "content": "..."}]}'
            )
            raw = await ai_client.call_with_fallback(
                user_keys, _EXECUTION_SYSTEM, fix_prompt, max_tokens=6000
            )

    raise HTTPException(status_code=502, detail={"detail": "AI parse failed", "code": "AI_PARSE_FAILED"})


# ── Error handling / self-fix ─────────────────────────────────────────────────

async def handle_error(
    db: AsyncSession,
    task: ExecutionTask,
    error: str,
    user_keys: dict[str, str],
    master_prompt: str = "",
) -> None:
    """
    Retry sequence:
      retry_count == 0: Claude self-fix (1 attempt)
      retry_count == 1: classify → surgical prompt → execute
      retry_count == 2: different root-cause surgical prompt → execute
      retry_count >= 3: status=failed, project=PAUSED
    Broadcasts events throughout.
    """
    project_id = task.project_id

    if task.retry_count >= MAX_AUTO_RETRIES:
        # All auto-fix attempts exhausted → PAUSED
        task.status = "failed"
        task.error_log = f"Auto-fix exhausted after {MAX_AUTO_RETRIES} attempts. Last: {error[:500]}"
        task.updated_at = datetime.now(timezone.utc)

        proj_result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = proj_result.scalar_one_or_none()
        if project and project.current_state != "PAUSED":
            project.paused_reason = json.dumps({
                "reason": f"Task '{task.task_name}' failed after {MAX_AUTO_RETRIES} retries",
                "previous_state": project.current_state,
            })
            project.current_state = "PAUSED"

        await db.commit()
        await log_event(db, project_id, task.id, "task_failed", {"error": error[:500]})
        await websocket_manager.broadcast(str(project_id), {
            "event": "task_failed",
            "task_id": str(task.id),
            "error": error[:500],
        })
        await websocket_manager.broadcast(str(project_id), {
            "event": "task_paused",
            "task_id": str(task.id),
            "reason": "max_retries_exceeded",
        })
        return

    attempt_num = task.retry_count + 1

    if task.retry_count == 0:
        # Attempt 1: self-fix
        previous_files = json.dumps(task.generated_files or [])
        fix_prompt = (
            f"Your previous output contained an error.\n"
            f"Error: {error[:400]}\n"
            f"Previous files:\n{previous_files[:1000]}\n\n"
            "Fix the error. Return corrected files as JSON: "
            '{"files": [{"path": "...", "content": "..."}]}'
        )
    else:
        # Attempts 2-3: classify → surgical
        error_type = error_classifier.classify_error(error)
        prev_content = ""
        if task.generated_files:
            first_file = task.generated_files[0] if isinstance(task.generated_files, list) else {}
            prev_content = first_file.get("content", "")
        fix_prompt = error_classifier.generate_surgical_prompt(
            error=error,
            file_content=prev_content,
            error_type=error_type,
            context={"task_name": task.task_name, "attempt": attempt_num},
        )

    task.retry_count += 1
    task.status = "running"
    task.updated_at = datetime.now(timezone.utc)
    await db.commit()

    await log_event(db, project_id, task.id, "retry", {
        "attempt": attempt_num,
        "error": error[:300],
    })
    await websocket_manager.broadcast(str(project_id), {
        "event": "task_retrying",
        "task_id": str(task.id),
        "attempt": attempt_num,
        "reason": error[:200],
    })

    try:
        raw = await ai_client.call_with_fallback(
            user_keys, _EXECUTION_SYSTEM, fix_prompt, max_tokens=6000
        )
        parsed = json.loads(_strip_fences(raw))
        files = parsed.get("files", [])

        # Drift check
        drift = error_classifier.verify_no_drift(files, [], "")
        if drift:
            await log_event(db, project_id, task.id, "drift_detected", {"violations": drift})

        validation = await validate_task_output(files, task)

        task.generated_files = files
        task.tool_used = _detect_provider(user_keys)
        task.updated_at = datetime.now(timezone.utc)

        if validation.is_valid:
            task.status = "pending_review"
            await db.commit()
            await log_event(db, project_id, task.id, "fix_injected", {
                "fix_type": "self_fix" if attempt_num == 1 else "surgical",
                "attempt": attempt_num,
            })
            await websocket_manager.broadcast(str(project_id), {
                "event": "task_pending_review",
                "task_id": str(task.id),
                "files": [f["path"] for f in files],
            })
        else:
            task.error_log = str(validation.as_dict())
            await db.commit()
            # Recurse for next fix attempt
            await handle_error(db, task, str(validation.as_dict()), user_keys, master_prompt)

    except Exception as exc:
        error_msg = str(exc)
        task.error_log = error_msg
        task.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await handle_error(db, task, error_msg, user_keys, master_prompt)


# ── Execution orchestration ───────────────────────────────────────────────────

def _get_eligible_task(
    tasks: list[ExecutionTask],
) -> Optional[ExecutionTask]:
    """Find first pending task where all depends_on are approved."""
    # depends_on stored as JSON strings; normalise to str for comparison
    approved_ids: set[str] = {str(t.id) for t in tasks if t.status == "approved"}
    for task in tasks:
        if task.status != "pending":
            continue
        deps = task.depends_on or []
        if all(str(dep) in approved_ids for dep in deps):
            return task
    return None


def _detect_provider(user_keys: dict[str, str]) -> str:
    """Return which AI provider will be used (first available)."""
    for provider in ("anthropic", "openai", "gemini"):
        if user_keys.get(provider):
            return provider
    return "openai"


async def _run_next_eligible_task(
    db: AsyncSession,
    project_id: UUID,
    user_keys: dict[str, str],
) -> None:
    """
    Find and execute the next eligible pending task.
    Sets status to pending_review on success, or handles errors.
    Checks for execution completion.
    """
    tasks = await _load_all_tasks(db, project_id)

    # Load project (needed for state updates and claude_code branch)
    proj_result = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        logger.error("Project not found in execution loop project=%s", project_id)
        return

    # Check if all done
    if tasks and all(t.status in ("approved", "skipped") for t in tasks):
        if project.current_state == "EXECUTION_RUNNING":
            advance_state(project, "EXECUTION_COMPLETE")
            await db.commit()
        await websocket_manager.broadcast(str(project_id), {"event": "execution_complete"})
        return

    task = _get_eligible_task(tasks)
    if not task:
        return  # All eligible tasks are already running/pending_review

    master_prompt = await _load_master_prompt(db, project_id)

    # Mark as running
    task.status = "running"
    task.updated_at = datetime.now(timezone.utc)
    await db.commit()

    await log_event(db, project_id, task.id, "task_started", {"task_name": task.task_name})
    await websocket_manager.broadcast(str(project_id), {
        "event": "task_started",
        "task_id": str(task.id),
        "task_name": task.task_name,
    })
    await websocket_manager.broadcast(str(project_id), {
        "event": "task_generating",
        "task_id": str(task.id),
    })

    try:
        from app.config import settings

        if getattr(settings, "USE_CLAUDE_CODE", False):
            from app.services.claude_code_service import run_task_via_claude_code
            blueprint_files = await _fetch_context_files(db, project_id, project.user_id)
            context = {
                "master_prompt": master_prompt,
                "context_files": [
                    {"name": f["name"], "content": f.get("content", "")}
                    for f in blueprint_files
                ],
            }
            try:
                result = await run_task_via_claude_code(task, project, context, user_keys)
            except RuntimeError as exc:
                error_msg = str(exc)
                if "there is no claude cli" in error_msg.lower():
                    task.status = "failed"
                    task.error_log = error_msg
                    task.updated_at = datetime.now(timezone.utc)
                    advance_state(project, "PAUSED")
                    project.paused_reason = json.dumps({"reason": error_msg})
                    await db.commit()
                    await websocket_manager.broadcast(str(project_id), {
                        "event": "task_failed",
                        "task_id": str(task.id),
                        "error": error_msg,
                    })
                    return
                await handle_error(db, task, error_msg, user_keys, master_prompt)
                return
        else:
            result = await execute_task_via_api(db, task, user_keys, master_prompt)

        files = result.get("files", [])

        drift = error_classifier.verify_no_drift(files, [], "")
        if drift:
            await log_event(db, project_id, task.id, "drift_detected", {"violations": drift})

        validation = await validate_task_output(files, task)

        task.generated_files = files
        task.tool_used = _detect_provider(user_keys)
        task.updated_at = datetime.now(timezone.utc)

        if validation.is_valid:
            task.status = "pending_review"
            await db.commit()
            await log_event(db, project_id, task.id, "api_call", {
                "provider": task.tool_used,
                "files_count": len(files),
            })
            await websocket_manager.broadcast(str(project_id), {
                "event": "task_pending_review",
                "task_id": str(task.id),
                "files": [f["path"] for f in files],
            })
        else:
            error_str = json.dumps(validation.as_dict())
            task.error_log = error_str
            await db.commit()
            await log_event(db, project_id, task.id, "validation_error", validation.as_dict())
            await handle_error(db, task, error_str, user_keys, master_prompt)

    except Exception as exc:
        error_str = str(exc)
        task.error_log = error_str
        task.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await log_event(db, project_id, task.id, "parse_error", {"error": error_str[:500]})
        await handle_error(db, task, error_str, user_keys, master_prompt)


async def run_execution_loop(
    project_id: UUID,
    user_keys: dict[str, str],
) -> None:
    """Background coroutine — creates its own DB session."""
    from app.database import _get_session_factory
    session_factory = _get_session_factory()

    try:
        async with session_factory() as db:
            await _run_next_eligible_task(db, project_id, user_keys)
    except Exception as exc:
        logger.error("Execution loop crashed project=%s error=%s", project_id, exc)


# ── Public service functions ──────────────────────────────────────────────────

async def start_execution(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    user_keys: dict[str, str],
) -> dict[str, str]:
    project = await _get_project(db, project_id, user_id)
    advance_state(project, "EXECUTION_RUNNING")
    await db.commit()

    asyncio.create_task(run_execution_loop(project_id, user_keys))

    return {
        "message": "Execution started",
        "websocket_url": f"/ws/projects/{project_id}/execution",
    }


async def get_execution_status(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> dict[str, Any]:
    project = await _get_project(db, project_id, user_id)
    tasks = await _load_all_tasks(db, project_id)
    return {
        "tasks": tasks,
        "project_state": project.current_state,
    }


async def get_task_detail(
    db: AsyncSession,
    task_id: UUID,
    project_id: UUID,
    user_id: UUID,
) -> dict[str, Any]:
    await _get_project(db, project_id, user_id)
    task = await _get_task(db, task_id, project_id)
    return {
        "task": task,
        "generated_files": task.generated_files or [],
        "validation_result": None,
        "error_log": task.error_log,
    }


async def approve_task(
    db: AsyncSession,
    task_id: UUID,
    project_id: UUID,
    user_id: UUID,
    user_keys: dict[str, str],
) -> dict[str, Any]:
    """Write generated files to disk, mark approved, start next eligible task."""
    await _get_project(db, project_id, user_id)
    task = await _get_task(db, task_id, project_id)

    if task.status != "pending_review":
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"Task status is '{task.status}', must be 'pending_review'",
                "code": "INVALID_TASK_STATUS",
            },
        )

    # Write files to disk (non-blocking)
    files = task.generated_files or []
    project_dir = os.path.join(PROJECT_BASE_PATH, str(project_id))

    def _write_files() -> None:
        os.makedirs(project_dir, exist_ok=True)
        for file_info in files:
            rel_path = file_info.get("path", "")
            content = file_info.get("content", "")
            abs_path = os.path.join(project_dir, rel_path)
            os.makedirs(os.path.dirname(abs_path), exist_ok=True)
            with open(abs_path, "w", encoding="utf-8") as fh:
                fh.write(content)

    await asyncio.to_thread(_write_files)

    task.status = "approved"
    task.updated_at = datetime.now(timezone.utc)
    await db.commit()

    await log_event(db, project_id, task.id, "task_approved", {
        "files_written": [f.get("path") for f in files],
    })
    await websocket_manager.broadcast(str(project_id), {
        "event": "task_approved",
        "task_id": str(task.id),
    })

    # Start next task in background
    asyncio.create_task(run_execution_loop(project_id, user_keys))

    # Determine next pending task name for response
    tasks = await _load_all_tasks(db, project_id)
    next_task = _get_eligible_task(tasks)
    return {
        "message": f"Task '{task.task_name}' approved. Files written to disk.",
        "next_task": next_task.task_name if next_task else None,
    }


async def fix_task(
    db: AsyncSession,
    task_id: UUID,
    project_id: UUID,
    user_id: UUID,
    feedback: str,
    user_keys: dict[str, str],
) -> dict[str, str]:
    """User-provided fix — no retry limit. Injects feedback + previous output."""
    await _get_project(db, project_id, user_id)
    task = await _get_task(db, task_id, project_id)

    master_prompt = await _load_master_prompt(db, project_id)
    previous_files = json.dumps(task.generated_files or [])

    fix_prompt = (
        f"TASK: {task.task_name}\n\n"
        f"USER FEEDBACK: {feedback}\n\n"
        f"PREVIOUS OUTPUT:\n{previous_files[:2000]}\n\n"
        "Apply the feedback and fix all issues. "
        'Return ONLY valid JSON: {"files": [{"path": "...", "content": "..."}]}'
    )

    task.status = "running"
    task.updated_at = datetime.now(timezone.utc)
    await db.commit()

    await log_event(db, project_id, task.id, "user_fix_requested", {"feedback": feedback[:300]})
    await websocket_manager.broadcast(str(project_id), {
        "event": "fix_injected",
        "task_id": str(task.id),
        "fix_type": "user_feedback",
    })
    await websocket_manager.broadcast(str(project_id), {
        "event": "task_generating",
        "task_id": str(task.id),
    })

    try:
        raw = await ai_client.call_with_fallback(
            user_keys, _EXECUTION_SYSTEM, fix_prompt, max_tokens=6000
        )
        parsed = json.loads(_strip_fences(raw))
        files = parsed.get("files", [])

        validation = await validate_task_output(files, task)
        task.generated_files = files
        task.tool_used = _detect_provider(user_keys)
        task.updated_at = datetime.now(timezone.utc)

        if validation.is_valid:
            task.status = "pending_review"
            await db.commit()
            await websocket_manager.broadcast(str(project_id), {
                "event": "task_pending_review",
                "task_id": str(task.id),
                "files": [f["path"] for f in files],
            })
            return {"message": "Fix applied. Task ready for review."}
        else:
            task.status = "pending_review"  # Let user see result and fix again
            task.error_log = str(validation.as_dict())
            await db.commit()
            return {"message": f"Fix applied but validation issues remain: {validation.as_dict()}"}

    except Exception as exc:
        task.status = "failed"
        task.error_log = str(exc)
        task.updated_at = datetime.now(timezone.utc)
        await db.commit()
        raise HTTPException(
            status_code=502,
            detail={"detail": f"Fix execution failed: {exc}", "code": "FIX_FAILED"},
        )


async def pause_execution(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> dict[str, str]:
    project = await _get_project(db, project_id, user_id)
    if project.current_state == "PAUSED":
        return {"message": "Already paused"}
    previous_state = project.current_state
    project.paused_reason = json.dumps({
        "reason": "User requested pause",
        "previous_state": previous_state,
    })
    advance_state(project, "PAUSED")
    await db.commit()
    await websocket_manager.broadcast(str(project_id), {
        "event": "task_paused",
        "task_id": None,
        "reason": "user_requested",
    })
    return {"message": "Execution paused"}


async def resume_execution(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    user_keys: dict[str, str],
) -> dict[str, str]:
    project = await _get_project(db, project_id, user_id)
    if project.current_state != "PAUSED":
        raise HTTPException(
            status_code=400,
            detail={"detail": "Project is not paused", "code": "NOT_PAUSED"},
        )
    try:
        paused_data = json.loads(project.paused_reason or "{}")
        previous_state = paused_data.get("previous_state", "EXECUTION_RUNNING")
    except (json.JSONDecodeError, AttributeError):
        previous_state = "EXECUTION_RUNNING"

    project.current_state = previous_state
    project.paused_reason = None
    await db.commit()

    asyncio.create_task(run_execution_loop(project_id, user_keys))
    return {"message": "Execution resumed"}