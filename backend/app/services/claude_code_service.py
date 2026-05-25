from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Optional
from uuid import UUID

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

TASK_TIMEOUT: int = 300          # seconds per task before treating as error
READ_LINE_TIMEOUT: int = 30      # seconds between stdout lines before giving up
PROJECT_BASE_PATH: str = "/tmp/projects"


def _get_claude_code_path() -> str:
    """Read CLAUDE_CODE_PATH from settings with 'claude' fallback."""
    try:
        from app.config import settings
        return getattr(settings, "CLAUDE_CODE_PATH", "claude")
    except Exception:
        return "claude"


# ── JSON extraction ───────────────────────────────────────────────────────────

def _extract_json_with_files(text: str) -> Optional[dict[str, Any]]:
    """
    Scan text for a complete JSON object containing a 'files' key.
    Handles nested braces correctly, ignores braces inside strings.
    Returns parsed dict on first match, None if not found.
    """
    search_from = 0

    while True:
        start = text.find("{", search_from)
        if start == -1:
            return None

        depth = 0
        in_string = False
        escape_next = False

        for i in range(start, len(text)):
            ch = text[i]

            if escape_next:
                escape_next = False
                continue
            if ch == "\\" and in_string:
                escape_next = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue

            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    candidate = text[start : i + 1]
                    try:
                        parsed = json.loads(candidate)
                        if isinstance(parsed.get("files"), list):
                            return parsed
                    except (json.JSONDecodeError, ValueError):
                        pass
                    # This JSON didn't match — look for the next {
                    search_from = i + 1
                    break
        else:
            # Reached end of text without closing brace
            return None


# ── ClaudeCodeSession ─────────────────────────────────────────────────────────

class ClaudeCodeSession:
    """
    Manages a single Claude Code CLI subprocess session for one task.
    Uses asyncio.create_subprocess_exec for fully non-blocking I/O.
    """

    def __init__(
        self,
        project_id: UUID,
        project_path: str,
        context_files: list[dict[str, str]],
    ) -> None:
        self._project_id = project_id
        self._project_path = project_path
        self._context_files = context_files  # [{"name": "MASTER.md", "content": "..."}]
        self._process: Optional[asyncio.subprocess.Process] = None
        self._stderr_task: Optional[asyncio.Task] = None
        self._stderr_lines: list[str] = []

    async def start(self) -> None:
        """
        Write context files to project_path, then launch Claude Code subprocess.
        Raises RuntimeError if the CLI binary is not found.
        """
        os.makedirs(self._project_path, exist_ok=True)
        self._write_context_files()

        claude_path = _get_claude_code_path()
        logger.info(
            "Starting ClaudeCodeSession project=%s path=%s binary=%s",
            self._project_id,
            self._project_path,
            claude_path,
        )

        try:
            self._process = await asyncio.create_subprocess_exec(
                claude_path,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self._project_path,
            )
        except FileNotFoundError as exc:
            raise RuntimeError(
                f"Claude Code CLI not found at '{claude_path}'. "
                "Install it with: npm install -g @anthropic-ai/claude-code"
            ) from exc

        # Start stderr reader in background
        self._stderr_task = asyncio.create_task(self._consume_stderr())
        logger.info("ClaudeCodeSession started pid=%s", self._process.pid)

    def _write_context_files(self) -> None:
        """Write all context files to the project directory."""
        for file_info in self._context_files:
            name = file_info.get("name", "").strip()
            content = file_info.get("content", "")
            if not name:
                continue
            dest = os.path.join(self._project_path, name)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest, "w", encoding="utf-8") as fh:
                fh.write(content)
        logger.debug(
            "Wrote %d context files to %s",
            len(self._context_files),
            self._project_path,
        )

    async def inject(self, prompt: str) -> None:
        """Write a prompt to Claude Code's stdin."""
        if not self._process or not self._process.stdin:
            raise RuntimeError("Session not started or stdin unavailable")
        payload = (prompt.strip() + "\n").encode("utf-8")
        self._process.stdin.write(payload)
        await self._process.stdin.drain()
        logger.debug("Injected %d bytes to Claude Code stdin", len(payload))

    async def read_output(self, timeout: int = TASK_TIMEOUT) -> Optional[dict[str, Any]]:
        """
        Read stdout until a complete JSON object with a 'files' key is found,
        or until timeout seconds elapse.
        Returns parsed dict on success, None on timeout or no match.
        """
        try:
            return await asyncio.wait_for(
                self._read_until_json(),
                timeout=float(timeout),
            )
        except asyncio.TimeoutError:
            logger.warning(
                "ClaudeCodeSession read_output timed out after %ds project=%s",
                timeout,
                self._project_id,
            )
            return None

    async def stop(self) -> None:
        """Terminate the subprocess and cancel the stderr consumer."""
        if self._process:
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                logger.warning("Claude Code did not terminate gracefully — killing")
                self._process.kill()
            except Exception as exc:
                logger.debug("stop() cleanup error: %s", exc)
            finally:
                self._process = None

        if self._stderr_task:
            self._stderr_task.cancel()
            try:
                await self._stderr_task
            except asyncio.CancelledError:
                pass
            self._stderr_task = None

        logger.info("ClaudeCodeSession stopped project=%s", self._project_id)

    def is_alive(self) -> bool:
        """Return True if the subprocess is still running."""
        return self._process is not None and self._process.returncode is None

    def get_stderr_lines(self) -> list[str]:
        """Return accumulated stderr output for logging."""
        return list(self._stderr_lines)

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _read_until_json(self) -> Optional[dict[str, Any]]:
        """
        Read stdout line by line.
        After each line, attempt to extract a complete JSON with 'files' key.
        Returns as soon as a match is found.
        """
        buffer = ""
        if not self._process or not self._process.stdout:
            return None

        try:
            while not self._process.stdout.at_eof():
                try:
                    line_bytes = await asyncio.wait_for(
                        self._process.stdout.readline(),
                        timeout=float(READ_LINE_TIMEOUT),
                    )
                except asyncio.TimeoutError:
                    logger.warning(
                        "No stdout from Claude Code for %ds — checking buffer",
                        READ_LINE_TIMEOUT,
                    )
                    break

                if not line_bytes:
                    break

                line = line_bytes.decode("utf-8", errors="replace")
                buffer += line
                logger.debug("CLAUDE_STDOUT: %s", line.rstrip())

                result = _extract_json_with_files(buffer)
                if result:
                    logger.info(
                        "JSON output detected project=%s files=%d",
                        self._project_id,
                        len(result.get("files", [])),
                    )
                    return result

        except Exception as exc:
            logger.error("_read_until_json error: %s", exc)

        # Final attempt on full buffer
        return _extract_json_with_files(buffer)

    async def _consume_stderr(self) -> None:
        """Read stderr in background and accumulate lines for logging."""
        if not self._process or not self._process.stderr:
            return
        try:
            while not self._process.stderr.at_eof():
                line_bytes = await self._process.stderr.readline()
                if not line_bytes:
                    break
                line = line_bytes.decode("utf-8", errors="replace").rstrip()
                self._stderr_lines.append(line)
                logger.debug("CLAUDE_STDERR: %s", line)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.debug("_consume_stderr error: %s", exc)


# ── Task execution via Claude Code ────────────────────────────────────────────

async def run_task_via_claude_code(
    task: Any,           # ExecutionTask model instance
    project: Any,        # Project model instance
    context: dict[str, Any],
) -> dict[str, Any]:
    """
    Execute a single task through the Claude Code CLI subprocess.

    context dict expected keys:
      master_prompt:  str  — full master context prompt
      context_files:  list[{"name": str, "content": str}]  — files to write

    Returns {"files": [{"path": str, "content": str}]}.
    Raises RuntimeError on timeout or failure to parse output.
    """
    project_id: UUID = project.id
    project_path = os.path.join(PROJECT_BASE_PATH, str(project_id))

    master_prompt: str = context.get("master_prompt", "")
    context_files: list[dict[str, str]] = context.get("context_files", [])

    session = ClaudeCodeSession(
        project_id=project_id,
        project_path=project_path,
        context_files=context_files,
    )

    try:
        # 1. Start session (writes context files, launches subprocess)
        await session.start()

        # 2. Inject master prompt first to establish full project context
        if master_prompt:
            await session.inject(
                f"Project context (read carefully before proceeding):\n\n{master_prompt}"
            )
            # Give Claude Code a moment to process context
            await asyncio.sleep(1)

        # 3. Inject task-specific prompt
        task_prompt = _build_task_prompt(task)
        await session.inject(task_prompt)

        # 4. Read output — wait for JSON with 'files' key, 300s timeout
        result = await session.read_output(timeout=TASK_TIMEOUT)

        # 5. Log stderr to execution_logs (caller handles DB logging)
        stderr = session.get_stderr_lines()
        if stderr:
            logger.info(
                "Claude Code stderr project=%s lines=%d",
                project_id,
                len(stderr),
            )

        if result is None:
            raise RuntimeError(
                f"Claude Code produced no valid JSON output within {TASK_TIMEOUT}s "
                f"for task '{task.task_name}'"
            )

        files = result.get("files", [])
        if not isinstance(files, list):
            raise RuntimeError(
                f"Claude Code output 'files' is not a list: {type(files)}"
            )

        logger.info(
            "Claude Code task complete project=%s task=%s files=%d",
            project_id,
            task.task_name,
            len(files),
        )
        return {"files": files, "stderr": stderr}

    finally:
        await session.stop()


def _build_task_prompt(task: Any) -> str:
    """
    Build the full task prompt to inject into Claude Code.
    Instructs Claude Code to output ONLY JSON with a 'files' array.
    """
    task_prompt = task.prompt_used or ""
    task_name = getattr(task, "task_name", "unknown")

    return (
        f"TASK: {task_name}\n\n"
        f"{task_prompt}\n\n"
        "────────────────────────────────────────\n"
        "OUTPUT REQUIREMENTS:\n"
        "Generate all required files and return them as a single JSON object.\n"
        "Do NOT include any explanation or text outside the JSON.\n"
        "Format:\n"
        '{"files": [{"path": "relative/path/to/file.py", "content": "complete file content"}]}\n\n'
        "Rules:\n"
        "- All files must be complete (no TODOs, no placeholders)\n"
        "- Paths must be relative to the project root\n"
        "- Output ONLY the JSON object, nothing else\n"
    )


# ── Convenience: write context files without starting a full session ──────────

async def write_context_files_to_disk(
    project_id: UUID,
    context_files: list[dict[str, str]],
) -> str:
    """
    Write context files to the project temp directory.
    Returns the project path.
    Used by execution_service before launching tasks.
    """
    project_path = os.path.join(PROJECT_BASE_PATH, str(project_id))
    os.makedirs(project_path, exist_ok=True)

    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        None,
        _write_files_sync,
        project_path,
        context_files,
    )
    return project_path


def _write_files_sync(
    project_path: str,
    context_files: list[dict[str, str]],
) -> None:
    """Synchronous file writer — called via run_in_executor."""
    for file_info in context_files:
        name = file_info.get("name", "").strip()
        content = file_info.get("content", "")
        if not name:
            continue
        dest = os.path.join(project_path, name)
        os.makedirs(os.path.dirname(dest) or project_path, exist_ok=True)
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(content)