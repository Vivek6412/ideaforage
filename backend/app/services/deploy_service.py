from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.state_machine import advance_state
from app.core.websocket_manager import websocket_manager
from app.models.deployment import Deployment
from app.models.project import Project

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

VERCEL_API = "https://api.vercel.com"
RAILWAY_API = "https://backboard.railway.app/graphql/v2"

MAX_RETRIGGER_ATTEMPTS: int = 2
POLL_INTERVAL_SECONDS: int = 10
POLL_TIMEOUT_SECONDS: int = 300  # 5 min

# Common build errors → fix strategies
_BUILD_ERROR_MAP: dict[str, str] = {
    "missing environment variable": "inject_env",
    "command not found": "fix_start_command",
    "cannot find module": "fix_install_command",
    "port": "fix_port_binding",
}


# ── DB helpers ────────────────────────────────────────────────────────────────

async def _get_project(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
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


async def _upsert_deployment(
    db: AsyncSession,
    project_id: UUID,
    platform: str,
    service_type: str,
    platform_project_id: str,
    deploy_url: str,
    build_status: str,
) -> Deployment:
    result = await db.execute(
        select(Deployment).where(
            Deployment.project_id == project_id,
            Deployment.platform == platform,
            Deployment.service_type == service_type,
        )
    )
    record = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if record:
        record.platform_project_id = platform_project_id
        record.deploy_url = deploy_url
        record.build_status = build_status
        record.updated_at = now
    else:
        record = Deployment(
            project_id=project_id,
            platform=platform,
            service_type=service_type,
            platform_project_id=platform_project_id,
            deploy_url=deploy_url,
            build_status=build_status,
            deployed_at=now,
            updated_at=now,
        )
        db.add(record)

    await db.commit()
    await db.refresh(record)
    return record


async def _update_deployment_status(
    db: AsyncSession,
    project_id: UUID,
    platform: str,
    service_type: str,
    build_status: str,
    deploy_url: str | None = None,
    error_log: str | None = None,
) -> None:
    result = await db.execute(
        select(Deployment).where(
            Deployment.project_id == project_id,
            Deployment.platform == platform,
            Deployment.service_type == service_type,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        return
    record.build_status = build_status
    record.updated_at = datetime.now(timezone.utc)
    if deploy_url:
        record.deploy_url = deploy_url
    if error_log:
        record.error_log = error_log
    await db.commit()


# ── Vercel ────────────────────────────────────────────────────────────────────

def _vercel_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _parse_github_owner_repo(repo_url: str) -> tuple[str, str]:
    """Extract owner/repo from https://github.com/owner/repo URL."""
    parts = repo_url.rstrip("/").split("/")
    if len(parts) < 2:
        raise ValueError(f"Cannot parse GitHub URL: {repo_url}")
    return parts[-2], parts[-1]


async def deploy_frontend_vercel(
    project: Project,
    repo_url: str,
    vercel_token: str,
    env_vars: dict[str, str],
) -> dict[str, str]:
    """
    1. Create Vercel project linked to GitHub repo.
    2. Inject env vars.
    3. Trigger deployment.
    Returns { deploy_id, status_url, vercel_project_id }.
    """
    owner, repo_name = _parse_github_owner_repo(repo_url)
    project_name = f"ideaforge-{str(project.id)[:8]}-frontend"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1 — create project
        create_resp = await client.post(
            f"{VERCEL_API}/v10/projects",
            headers=_vercel_headers(vercel_token),
            json={
                "name": project_name,
                "framework": "nextjs",
                "gitRepository": {
                    "type": "github",
                    "repo": f"{owner}/{repo_name}",
                },
                "rootDirectory": "frontend",
                "buildCommand": "npm run build",
                "outputDirectory": ".next",
                "installCommand": "npm install",
            },
        )
        if create_resp.status_code not in (200, 201, 409):
            raise HTTPException(
                status_code=502,
                detail={
                    "detail": f"Vercel project creation failed: {create_resp.text[:300]}",
                    "code": "VERCEL_PROJECT_CREATE_FAILED",
                },
            )
        vercel_project_id = create_resp.json().get("id", project_name)

        # Step 2 — inject env vars (NEXT_PUBLIC_* + any provided)
        if env_vars:
            env_payload = [
                {
                    "key": k,
                    "value": v,
                    "type": "plain",
                    "target": ["production", "preview"],
                }
                for k, v in env_vars.items()
            ]
            await client.post(
                f"{VERCEL_API}/v10/projects/{vercel_project_id}/env",
                headers=_vercel_headers(vercel_token),
                json=env_payload,
            )

        # Step 3 — trigger deployment
        deploy_resp = await client.post(
            f"{VERCEL_API}/v13/deployments",
            headers=_vercel_headers(vercel_token),
            json={
                "name": project_name,
                "gitSource": {
                    "type": "github",
                    "repoId": f"{owner}/{repo_name}",
                    "ref": "main",
                },
                "projectId": vercel_project_id,
                "target": "production",
            },
        )
        if deploy_resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=502,
                detail={
                    "detail": f"Vercel deploy trigger failed: {deploy_resp.text[:300]}",
                    "code": "VERCEL_DEPLOY_FAILED",
                },
            )
        deploy_data = deploy_resp.json()
        deploy_id = deploy_data.get("id", "")
        deploy_url = deploy_data.get("url", "")
        if deploy_url and not deploy_url.startswith("http"):
            deploy_url = f"https://{deploy_url}"

    return {
        "deploy_id": deploy_id,
        "status_url": f"{VERCEL_API}/v13/deployments/{deploy_id}",
        "deploy_url": deploy_url,
        "vercel_project_id": vercel_project_id,
    }


async def get_vercel_deploy_status(deploy_id: str, vercel_token: str) -> str:
    """Return Vercel deployment state: READY | ERROR | BUILDING | QUEUED | CANCELED."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{VERCEL_API}/v13/deployments/{deploy_id}",
            headers=_vercel_headers(vercel_token),
        )
    if resp.status_code != 200:
        return "UNKNOWN"
    return resp.json().get("readyState", "UNKNOWN")


# ── Railway ───────────────────────────────────────────────────────────────────

def _railway_headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


async def _railway_gql(
    client: httpx.AsyncClient,
    token: str,
    query: str,
    variables: dict[str, Any],
) -> dict[str, Any]:
    """Execute a Railway GraphQL query; raise on errors."""
    resp = await client.post(
        RAILWAY_API,
        headers=_railway_headers(token),
        json={"query": query, "variables": variables},
    )
    resp.raise_for_status()
    body = resp.json()
    if "errors" in body:
        msg = body["errors"][0].get("message", "GraphQL error")
        raise HTTPException(
            status_code=502,
            detail={"detail": f"Railway API error: {msg}", "code": "RAILWAY_GQL_FAILED"},
        )
    return body.get("data", {})


async def deploy_backend_railway(
    project: Project,
    repo_url: str,
    railway_token: str,
    env_vars: dict[str, str],
) -> dict[str, str]:
    """
    1. projectCreate
    2. serviceCreate + link GitHub repo + set root dir to backend/
    3. Inject env vars via variableCollectionUpsert
    4. Trigger deploy via serviceInstanceRedeploy
    Returns { deploy_id, status_url, railway_project_id }.
    """
    owner, repo_name = _parse_github_owner_repo(repo_url)
    project_name = f"ideaforge-{str(project.id)[:8]}-backend"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1 — create project
        create_data = await _railway_gql(
            client,
            railway_token,
            """
            mutation ProjectCreate($input: ProjectCreateInput!) {
                projectCreate(input: $input) { id defaultEnvironmentId }
            }
            """,
            {"input": {"name": project_name}},
        )
        railway_project_id = create_data["projectCreate"]["id"]
        environment_id = create_data["projectCreate"]["defaultEnvironmentId"]

        # Step 2 — create service linked to GitHub repo with backend/ root
        service_data = await _railway_gql(
            client,
            railway_token,
            """
            mutation ServiceCreate($input: ServiceCreateInput!) {
                serviceCreate(input: $input) { id }
            }
            """,
            {
                "input": {
                    "projectId": railway_project_id,
                    "name": "backend",
                    "source": {
                        "repo": f"{owner}/{repo_name}",
                        "branch": "main",
                    },
                }
            },
        )
        service_id = service_data["serviceCreate"]["id"]

        # Set root directory + start command via serviceInstanceUpdate
        await _railway_gql(
            client,
            railway_token,
            """
            mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
                serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
            }
            """,
            {
                "serviceId": service_id,
                "environmentId": environment_id,
                "input": {
                    "rootDirectory": "backend",
                    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
                    "buildCommand": "pip install -r requirements.txt",
                },
            },
        )

        # Step 3 — inject env vars
        if env_vars:
            variables_input = {k: v for k, v in env_vars.items()}
            await _railway_gql(
                client,
                railway_token,
                """
                mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
                    variableCollectionUpsert(input: $input)
                }
                """,
                {
                    "input": {
                        "projectId": railway_project_id,
                        "environmentId": environment_id,
                        "serviceId": service_id,
                        "variables": variables_input,
                    }
                },
            )

        # Step 4 — trigger deploy
        deploy_data = await _railway_gql(
            client,
            railway_token,
            """
            mutation ServiceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
                serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
            }
            """,
            {"serviceId": service_id, "environmentId": environment_id},
        )

    deploy_id = service_id  # Railway uses serviceId to poll status

    return {
        "deploy_id": deploy_id,
        "status_url": f"https://railway.app/project/{railway_project_id}/service/{service_id}",
        "deploy_url": "",  # Railway assigns URL after deploy completes
        "railway_project_id": railway_project_id,
        "environment_id": environment_id,
    }


async def get_railway_deploy_status(
    service_id: str,
    environment_id: str,
    railway_token: str,
) -> tuple[str, str]:
    """Return (status, deploy_url). status: SUCCESS | FAILED | BUILDING | UNKNOWN."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        data = await _railway_gql(
            client,
            railway_token,
            """
            query ServiceInstance($serviceId: String!, $environmentId: String!) {
                serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
                    latestDeployment { status }
                    domains { serviceDomains { domain } }
                }
            }
            """,
            {"serviceId": service_id, "environmentId": environment_id},
        )
    instance = data.get("serviceInstance") or {}
    latest = instance.get("latestDeployment") or {}
    raw_status = latest.get("status", "UNKNOWN").upper()

    # Normalise Railway statuses → SUCCESS | FAILED | BUILDING
    status_map = {
        "SUCCESS": "SUCCESS",
        "COMPLETE": "SUCCESS",
        "FAILED": "FAILED",
        "CRASHED": "FAILED",
        "BUILDING": "BUILDING",
        "DEPLOYING": "BUILDING",
        "WAITING": "BUILDING",
    }
    status = status_map.get(raw_status, "BUILDING")

    domains = instance.get("domains", {}).get("serviceDomains", [])
    deploy_url = f"https://{domains[0]['domain']}" if domains else ""

    return status, deploy_url


# ── Status polling ────────────────────────────────────────────────────────────

async def poll_deploy_status(
    platform: str,
    deploy_id: str,
    token: str,
    environment_id: str = "",
    project_id: str = "",
    db: AsyncSession | None = None,
    service_type: str = "",
) -> str:
    """
    Poll until success | failed | timeout (5 min).
    Returns final normalised status string.
    """
    elapsed = 0

    while elapsed < POLL_TIMEOUT_SECONDS:
        await asyncio.sleep(POLL_INTERVAL_SECONDS)
        elapsed += POLL_INTERVAL_SECONDS

        if platform == "vercel":
            raw = await get_vercel_deploy_status(deploy_id, token)
            # Vercel states: READY → success, ERROR → failed
            if raw == "READY":
                status = "success"
            elif raw == "ERROR":
                status = "failed"
            else:
                status = "building"
            deploy_url = None
        else:
            raw, deploy_url = await get_railway_deploy_status(deploy_id, environment_id, token)
            status = raw.lower()

        if db and project_id and service_type:
            from uuid import UUID as _UUID
            await _update_deployment_status(
                db,
                _UUID(project_id),
                platform,
                service_type,
                status,
                deploy_url=deploy_url,
            )
            await websocket_manager.broadcast(
                project_id,
                {
                    "event": "deploy_status_update",
                    "platform": platform,
                    "service_type": service_type,
                    "status": status,
                    "deploy_url": deploy_url or "",
                },
            )

        if status in ("success", "failed"):
            return status

    return "failed"  # timeout


# ── Health check ──────────────────────────────────────────────────────────────

async def health_check(
    frontend_url: str,
    backend_url: str,
) -> dict[str, bool]:
    """
    Ping 4 services:
      - frontend:  GET {frontend_url} → 200
      - backend:   GET {backend_url}/health → 200
      - db:        GET {backend_url}/health → response includes db=true
      - auth:      GET {backend_url}/api/v1/auth/me → 401 (alive, no token)
    """
    results: dict[str, bool] = {
        "frontend": False,
        "backend": False,
        "db": False,
        "auth": False,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Frontend
        try:
            resp = await client.get(frontend_url)
            results["frontend"] = resp.status_code == 200
        except Exception as exc:
            logger.warning("Frontend health check failed: %s", exc)

        # Backend + DB (health endpoint expected to return {"status":"ok","db":true})
        try:
            resp = await client.get(f"{backend_url.rstrip('/')}/health")
            if resp.status_code == 200:
                results["backend"] = True
                body = resp.json()
                results["db"] = bool(body.get("db", False))
        except Exception as exc:
            logger.warning("Backend health check failed: %s", exc)

        # Auth (401 = alive, no token = expected)
        try:
            resp = await client.get(f"{backend_url.rstrip('/')}/api/v1/auth/me")
            results["auth"] = resp.status_code == 401
        except Exception as exc:
            logger.warning("Auth health check failed: %s", exc)

    return results


# ── Build failure auto-fix ────────────────────────────────────────────────────

async def handle_build_failure(
    platform: str,
    error_log: str,
    project: Project,
    token: str,
    platform_project_id: str,
    environment_id: str = "",
    service_id: str = "",
    attempt: int = 0,
) -> bool:
    """
    Classify build error → attempt auto-fix → retrigger.
    Returns True if fix applied + retriggered, False if needs user.
    Max attempts: MAX_RETRIGGER_ATTEMPTS (2).
    """
    if attempt >= MAX_RETRIGGER_ATTEMPTS:
        logger.warning("Max retrigger attempts reached for project=%s platform=%s", project.id, platform)
        return False

    error_lower = error_log.lower()
    fix_strategy: str | None = None
    for pattern, strategy in _BUILD_ERROR_MAP.items():
        if pattern in error_lower:
            fix_strategy = strategy
            break

    if fix_strategy is None:
        return False  # Unknown error — needs user

    logger.info("Build failure fix strategy=%s platform=%s attempt=%d", fix_strategy, platform, attempt)

    try:
        if platform == "vercel":
            return await _fix_vercel(fix_strategy, platform_project_id, token, error_log)
        elif platform == "railway":
            return await _fix_railway(
                fix_strategy, platform_project_id, environment_id, service_id, token, error_log
            )
    except Exception as exc:
        logger.error("Auto-fix failed: %s", exc)

    return False


async def _fix_vercel(
    strategy: str,
    vercel_project_id: str,
    token: str,
    error_log: str,
) -> bool:
    async with httpx.AsyncClient(timeout=20.0) as client:
        if strategy == "fix_start_command":
            await client.patch(
                f"{VERCEL_API}/v10/projects/{vercel_project_id}",
                headers=_vercel_headers(token),
                json={"buildCommand": "npm run build", "outputDirectory": ".next"},
            )
        # Retrigger
        resp = await client.post(
            f"{VERCEL_API}/v13/deployments",
            headers=_vercel_headers(token),
            json={"projectId": vercel_project_id, "target": "production"},
        )
        return resp.status_code in (200, 201)


async def _fix_railway(
    strategy: str,
    railway_project_id: str,
    environment_id: str,
    service_id: str,
    token: str,
    error_log: str,
) -> bool:
    async with httpx.AsyncClient(timeout=20.0) as client:
        if strategy == "fix_start_command":
            await _railway_gql(
                client,
                token,
                """
                mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
                    serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
                }
                """,
                {
                    "serviceId": service_id,
                    "environmentId": environment_id,
                    "input": {"startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT"},
                },
            )
        # Retrigger
        await _railway_gql(
            client,
            token,
            """
            mutation ServiceInstanceRedeploy($serviceId: String!, $environmentId: String!) {
                serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
            }
            """,
            {"serviceId": service_id, "environmentId": environment_id},
        )
    return True


# ── State transition ──────────────────────────────────────────────────────────

async def advance_state_to_deployed(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> None:
    project = await _get_project(db, project_id, user_id)
    advance_state(project, "DEPLOYED")
    await db.commit()


# ── Deployment status query ───────────────────────────────────────────────────

async def get_deploy_status(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> dict[str, Any]:
    """Return latest deployment records for frontend + backend."""
    await _get_project(db, project_id, user_id)
    result = await db.execute(
        select(Deployment).where(Deployment.project_id == project_id)
    )
    deployments = list(result.scalars().all())

    def _find(service_type: str) -> dict[str, Any]:
        for d in deployments:
            if d.service_type == service_type:
                return {"url": d.deploy_url, "status": d.build_status, "platform": d.platform}
        return {"url": None, "status": "not_started", "platform": None}

    return {
        "frontend": _find("frontend"),
        "backend": _find("backend"),
    }