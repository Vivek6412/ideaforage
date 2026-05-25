from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ── Fixed package lists (spec-defined — never expand dynamically) ─────────────

_PYPI_PACKAGES: list[str] = [
    "fastapi", "pydantic", "sqlalchemy", "alembic", "uvicorn",
    "httpx", "PyGitHub", "PyMuPDF", "python-docx", "cryptography",
    "anthropic", "openai",
]

_NPM_PACKAGES: list[str] = [
    "next", "react", "typescript", "tailwindcss", "@supabase/supabase-js",
]

# ── Deprecation flags ─────────────────────────────────────────────────────────
# Keys: "package@version" or "package" when version-independent.
# Values: list of plain-English deprecation strings.

DEPRECATION_FLAGS: dict[str, list[str]] = {
    "next@14": [
        "getServerSideProps deprecated → use Server Components + fetch()",
        "pages/ directory legacy → use app/ directory",
    ],
    "sqlalchemy@2": [
        "Query() API removed → use select() statements",
        "sync session in async context forbidden → use AsyncSession",
    ],
    "pydantic@2": [
        "@validator deprecated → use @field_validator",
        ".dict() removed → use .model_dump()",
        ".json() removed → use .model_dump_json()",
    ],
    "fastapi": [
        "sync def for DB or external API operations → always use async def",
        "@app.on_event('startup'/'shutdown') deprecated → use lifespan context manager",
    ],
}


# ── Public API ────────────────────────────────────────────────────────────────

async def fetch_pypi_version(package: str) -> str:
    """GET https://pypi.org/pypi/{package}/json → info.version"""
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            resp = await client.get(f"https://pypi.org/pypi/{package}/json")
            if resp.status_code == 200:
                return resp.json()["info"]["version"]
        except Exception as exc:
            logger.debug("PyPI fetch failed package=%s error=%s", package, exc)
    return "latest"


async def fetch_npm_version(package: str) -> str:
    """GET https://registry.npmjs.org/{package}/latest → version"""
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            encoded = package.replace("/", "%2F")
            resp = await client.get(f"https://registry.npmjs.org/{encoded}/latest")
            if resp.status_code == 200:
                return resp.json().get("version", "latest")
        except Exception as exc:
            logger.debug("npm fetch failed package=%s error=%s", package, exc)
    return "latest"


async def get_verified_versions(stack: dict[str, Any]) -> dict[str, str]:
    """
    Fetch latest stable versions from live PyPI/npm registries.
    Package list is fixed per spec — stack param accepted for interface consistency.
    Returns {package_name: version_string}.
    """
    return await _fetch_all_concurrent(_PYPI_PACKAGES, _NPM_PACKAGES)


def get_deprecation_flags(
    stack: dict[str, Any],
    versions: dict[str, str],
) -> list[dict[str, str]]:
    """
    Return applicable deprecation flag dicts based on detected package versions.
    Each dict: {"key": "package@version", "message": "deprecation string"}.

    Triggers:
      next@14     → next version starts with "14."
      sqlalchemy@2 → sqlalchemy version starts with "2."
      pydantic@2  → pydantic version starts with "2."
      fastapi     → any fastapi version (async requirement is always mandatory)
    """
    flags: list[dict[str, str]] = []

    # next@14
    if versions.get("next", "").startswith("14."):
        for msg in DEPRECATION_FLAGS["next@14"]:
            flags.append({"key": "next@14", "message": msg})

    # sqlalchemy@2
    if versions.get("sqlalchemy", "").startswith("2."):
        for msg in DEPRECATION_FLAGS["sqlalchemy@2"]:
            flags.append({"key": "sqlalchemy@2", "message": msg})

    # pydantic@2
    if versions.get("pydantic", "").startswith("2."):
        for msg in DEPRECATION_FLAGS["pydantic@2"]:
            flags.append({"key": "pydantic@2", "message": msg})

    # fastapi — version-independent: async is always required
    if versions.get("fastapi"):
        for msg in DEPRECATION_FLAGS["fastapi"]:
            flags.append({"key": "fastapi", "message": msg})

    return flags


def check_compatibility(
    stack: dict[str, Any],
    versions: dict[str, str],
) -> list[str]:
    """Return list of cross-package compatibility warning strings."""
    warnings: list[str] = []

    # pydantic v2 requires fastapi >= 0.100.0
    pydantic_ver = versions.get("pydantic", "")
    fastapi_ver = versions.get("fastapi", "")
    if pydantic_ver.startswith("2.") and fastapi_ver:
        if _minor(fastapi_ver) < 100:
            warnings.append("pydantic v2 requires fastapi >= 0.100.0")

    # next@14 requires react@18+
    next_ver = versions.get("next", "")
    react_ver = versions.get("react", "")
    if next_ver.startswith("14.") and react_ver:
        try:
            if int(react_ver.split(".")[0]) < 18:
                warnings.append("next@14 requires react@18+")
        except (ValueError, IndexError):
            pass

    return warnings


# ── Internal helpers ──────────────────────────────────────────────────────────

def _minor(version_str: str) -> int:
    """Extract minor version number safely."""
    try:
        return int(version_str.split(".")[1])
    except (IndexError, ValueError):
        return 0


async def _fetch_pypi_with_client(
    client: httpx.AsyncClient,
    package: str,
) -> tuple[str, str]:
    try:
        resp = await client.get(f"https://pypi.org/pypi/{package}/json")
        if resp.status_code == 200:
            return package, resp.json()["info"]["version"]
    except Exception as exc:
        logger.debug("PyPI fetch failed package=%s error=%s", package, exc)
    return package, "latest"


async def _fetch_npm_with_client(
    client: httpx.AsyncClient,
    package: str,
) -> tuple[str, str]:
    try:
        encoded = package.replace("/", "%2F")
        resp = await client.get(f"https://registry.npmjs.org/{encoded}/latest")
        if resp.status_code == 200:
            return package, resp.json().get("version", "latest")
    except Exception as exc:
        logger.debug("npm fetch failed package=%s error=%s", package, exc)
    return package, "latest"


async def _fetch_all_concurrent(
    pypi_packages: list[str],
    npm_packages: list[str],
) -> dict[str, str]:
    """Fetch all package versions concurrently from live registries."""
    async with httpx.AsyncClient(timeout=8.0) as client:
        py_tasks = [_fetch_pypi_with_client(client, p) for p in pypi_packages]
        npm_tasks = [_fetch_npm_with_client(client, p) for p in npm_packages]
        results = await asyncio.gather(*py_tasks, *npm_tasks, return_exceptions=True)

    versions: dict[str, str] = {}
    for result in results:
        if isinstance(result, tuple):
            name, ver = result
            versions[name] = ver
    return versions