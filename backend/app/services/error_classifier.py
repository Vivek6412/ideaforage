from __future__ import annotations

import re
from typing import Any

# ── Error pattern registry (from BUSINESS_LOGIC.md) ──────────────────────────

ERROR_PATTERNS: dict[str, str] = {
    r"ModuleNotFoundError|ImportError|Cannot find module":    "missing_dependency",
    r"pydantic.*validator|@validator":                        "pydantic_v1_syntax",
    r"greenlet_spawn|MissingGreenlet|sync.*async":            "sync_in_async",
    r"CORS|Access-Control":                                   "cors_config",
    r"401|Unauthorized|JWT|token":                            "auth_error",
    r"stripe.*signature|webhook.*signature":                  "stripe_webhook",
    r"alembic|migration|column.*exist":                       "migration_error",
    r"getServerSideProps|pages/.*page":                       "nextjs_legacy",
    r"\.dict\(\)|\.json\(\).*pydantic":                       "pydantic_v2_api",
    r"SyntaxError|IndentationError|unexpected token":         "syntax_error",
}

# ── Fix guidance per error type ───────────────────────────────────────────────

_FIX_GUIDANCE: dict[str, str] = {
    "missing_dependency":   "Add missing import. Check DEPENDENCIES.md for approved packages only.",
    "pydantic_v1_syntax":   "Replace @validator with @field_validator. Replace .dict() with .model_dump().",
    "sync_in_async":        "Convert sync DB/IO calls to async def. Use AsyncSession, await everywhere.",
    "cors_config":          "Fix CORS middleware. Ensure origins list includes frontend URL.",
    "auth_error":           "Check JWT cookie name 'access_token'. Verify JWT_SECRET matches.",
    "stripe_webhook":       "Use stripe.Webhook.construct_event with raw request body, not parsed JSON.",
    "migration_error":      "Run alembic upgrade head. Check column names match model definition.",
    "nextjs_legacy":        "Move to app/ directory. Replace getServerSideProps with Server Components.",
    "pydantic_v2_api":      "Replace .dict() with .model_dump(). Replace .json() with .model_dump_json().",
    "syntax_error":         "Fix indentation and syntax. Verify matching braces and parentheses.",
    "unknown":              "Review the full error traceback and fix the root cause.",
}


# ── Public API ────────────────────────────────────────────────────────────────

def classify_error(error_text: str) -> str:
    """
    Match error_text against ERROR_PATTERNS.
    Returns the matching error type key, or 'unknown'.
    """
    for pattern, error_type in ERROR_PATTERNS.items():
        if re.search(pattern, error_text, re.IGNORECASE):
            return error_type
    return "unknown"


def generate_surgical_prompt(
    error: str,
    file_content: str,
    error_type: str,
    context: dict[str, Any],
) -> str:
    """
    Build targeted fix prompt referencing ANTI_PATTERNS rules.
    Max 200 tokens output — imperative, no filler.
    """
    guidance = _FIX_GUIDANCE.get(error_type, _FIX_GUIDANCE["unknown"])
    file_snippet = file_content[:800] if file_content else "N/A"
    task_name = context.get("task_name", "unknown task")

    return (
        f"Fix this {error_type} error in {task_name}.\n"
        f"Error: {error[:300]}\n"
        f"Fix rule: {guidance}\n"
        f"Relevant file (truncated):\n{file_snippet}\n\n"
        "Return ONLY corrected files as JSON: "
        '{"files": [{"path": "...", "content": "..."}]}\n'
        "Complete files only. No placeholders. No explanation."
    )


def verify_no_drift(
    fixed_files: list[dict[str, str]],
    approved_stack: list[str],
    folder_structure: str,
) -> list[str]:
    """
    Check generated files for unapproved imports and wrong paths.
    Returns list of violations (empty list = clean).
    """
    violations: list[str] = []
    approved_lower = {pkg.lower() for pkg in approved_stack}

    for file_info in fixed_files:
        path = file_info.get("path", "")
        content = file_info.get("content", "")

        # Check for unapproved Python imports
        if path.endswith(".py"):
            for line in content.splitlines():
                stripped = line.strip()
                if not (stripped.startswith("import ") or stripped.startswith("from ")):
                    continue
                # Extract top-level module name
                parts = stripped.replace("import ", " ").replace("from ", " ").split()
                if not parts:
                    continue
                module_root = parts[0].split(".")[0].lower().replace("-", "_").replace("_", "-")
                # Allow stdlib and relative imports
                if module_root.startswith(".") or module_root in _STDLIB_MODULES:
                    continue
                if approved_lower and module_root not in approved_lower:
                    # Only flag if we actually have an approved list to check against
                    violations.append(
                        f"Unapproved import '{module_root}' in {path}"
                    )

        # Check path is within expected project structure
        if folder_structure and not _path_in_structure(path, folder_structure):
            violations.append(f"File path '{path}' not found in approved folder structure")

    return violations


# ── Internal helpers ──────────────────────────────────────────────────────────

_STDLIB_MODULES: frozenset[str] = frozenset({
    "os", "sys", "re", "json", "ast", "io", "abc", "copy", "math",
    "time", "uuid", "enum", "typing", "pathlib", "logging", "datetime",
    "hashlib", "functools", "itertools", "contextlib", "dataclasses",
    "collections", "asyncio", "inspect", "traceback", "warnings",
    "base64", "string", "struct", "random", "secrets", "tempfile",
    "subprocess", "shutil", "glob", "fnmatch", "textwrap",
    "__future__",
})


def _path_in_structure(path: str, folder_structure: str) -> bool:
    """Return True if path's top-level directory appears in folder_structure."""
    if not folder_structure:
        return True
    top_dir = path.split("/")[0] if "/" in path else path
    return top_dir in folder_structure