from __future__ import annotations

import asyncio
from typing import Any
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.auth import get_current_user
from app.core.websocket_manager import websocket_manager
from app.database import get_db
from app.models.user import User
from app.services import deploy_service
from app.services.github_service import get_decrypted_token

router = APIRouter(prefix="/projects/{project_id}/deploy", tags=["deploy"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DeployFrontendRequest(BaseModel):
    platform: str = Field(default="vercel", pattern="^vercel$")
    env_vars: dict[str, str] = Field(default_factory=dict)
    repo_url: str = Field(..., min_length=1)


class DeployBackendRequest(BaseModel):
    platform: str = Field(default="railway", pattern="^railway$")
    env_vars: dict[str, str] = Field(default_factory=dict)
    repo_url: str = Field(..., min_length=1)


class DeployStartResponse(BaseModel):
    deploy_id: str
    status: str
    status_url: str


class ServiceStatus(BaseModel):
    url: str | None
    status: str
    platform: str | None


class DeployStatusResponse(BaseModel):
    frontend: ServiceStatus
    backend: ServiceStatus


class HealthResponse(BaseModel):
    frontend: bool
    backend: bool
    db: bool
    auth: bool


# ── Background deploy runner ──────────────────────────────────────────────────

async def _run_frontend_deploy(
    project_id: str,
    user_id: str,
    repo_url: str,
    env_vars: dict[str, str],
    vercel_token: str,
    db_factory: Any,
) -> None:
    """Background task: deploy → poll → health → advance state on success."""
    from app.database import AsyncSessionLocal
    from uuid import UUID as _UUID

    async with AsyncSessionLocal() as db:
        try:
            project = await deploy_service._get_project(db, _UUID(project_id), _UUID(user_id))

            await websocket_manager.broadcast(project_id, {
                "event": "deploy_started",
                "platform": "vercel",
                "service_type": "frontend",
            })

            result = await deploy_service.deploy_frontend_vercel(
                project, repo_url, vercel_token, env_vars
            )

            await deploy_service._upsert_deployment(
                db,
                _UUID(project_id),
                platform="vercel",
                service_type="frontend",
                platform_project_id=result["vercel_project_id"],
                deploy_url=result["deploy_url"],
                build_status="building",
            )

            final_status = await deploy_service.poll_deploy_status(
                platform="vercel",
                deploy_id=result["deploy_id"],
                token=vercel_token,
                project_id=project_id,
                db=db,
                service_type="frontend",
            )

            await websocket_manager.broadcast(project_id, {
                "event": "deploy_complete",
                "platform": "vercel",
                "service_type": "frontend",
                "status": final_status,
                "deploy_url": result.get("deploy_url", ""),
            })

        except Exception as exc:
            await websocket_manager.broadcast(project_id, {
                "event": "deploy_error",
                "platform": "vercel",
                "service_type": "frontend",
                "error": str(exc)[:300],
            })
            await deploy_service._update_deployment_status(
                db, _UUID(project_id), "vercel", "frontend", "failed", error_log=str(exc)[:500]
            )


async def _run_backend_deploy(
    project_id: str,
    user_id: str,
    repo_url: str,
    env_vars: dict[str, str],
    railway_token: str,
    db_factory: Any,
) -> None:
    """Background task: deploy → poll → advance state on success."""
    from app.database import AsyncSessionLocal
    from uuid import UUID as _UUID

    async with AsyncSessionLocal() as db:
        try:
            project = await deploy_service._get_project(db, _UUID(project_id), _UUID(user_id))

            await websocket_manager.broadcast(project_id, {
                "event": "deploy_started",
                "platform": "railway",
                "service_type": "backend",
            })

            result = await deploy_service.deploy_backend_railway(
                project, repo_url, railway_token, env_vars
            )

            await deploy_service._upsert_deployment(
                db,
                _UUID(project_id),
                platform="railway",
                service_type="backend",
                platform_project_id=result["railway_project_id"],
                deploy_url=result.get("deploy_url", ""),
                build_status="building",
            )

            final_status = await deploy_service.poll_deploy_status(
                platform="railway",
                deploy_id=result["deploy_id"],
                token=railway_token,
                environment_id=result["environment_id"],
                project_id=project_id,
                db=db,
                service_type="backend",
            )

            await websocket_manager.broadcast(project_id, {
                "event": "deploy_complete",
                "platform": "railway",
                "service_type": "backend",
                "status": final_status,
                "deploy_url": result.get("deploy_url", ""),
            })

        except Exception as exc:
            await websocket_manager.broadcast(project_id, {
                "event": "deploy_error",
                "platform": "railway",
                "service_type": "backend",
                "error": str(exc)[:300],
            })
            await deploy_service._update_deployment_status(
                db, _UUID(project_id), "railway", "backend", "failed", error_log=str(exc)[:500]
            )


# ── Route helpers ─────────────────────────────────────────────────────────────

async def _require_token(
    db: AsyncSession,
    user_id: UUID,
    provider: str,
) -> str:
    token = await get_decrypted_token(db, user_id, provider)
    if not token:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": f"{provider.capitalize()} integration not connected",
                "code": f"{provider.upper()}_NOT_CONNECTED",
            },
        )
    return token


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/frontend",
    response_model=DeployStartResponse,
    status_code=202,
    summary="Deploy frontend to Vercel",
)
async def deploy_frontend(
    project_id: UUID,
    body: DeployFrontendRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeployStartResponse:
    vercel_token = await _require_token(db, current_user.id, "vercel")
    project = await deploy_service._get_project(db, project_id, current_user.id)

    # Kick off in background; return immediately
    background_tasks.add_task(
        _run_frontend_deploy,
        str(project_id),
        str(current_user.id),
        body.repo_url,
        body.env_vars,
        vercel_token,
        None,
    )

    return DeployStartResponse(
        deploy_id=f"vercel-{project_id}",
        status="building",
        status_url=f"/api/v1/projects/{project_id}/deploy/status",
    )


@router.post(
    "/backend",
    response_model=DeployStartResponse,
    status_code=202,
    summary="Deploy backend to Railway",
)
async def deploy_backend(
    project_id: UUID,
    body: DeployBackendRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeployStartResponse:
    railway_token = await _require_token(db, current_user.id, "railway")
    project = await deploy_service._get_project(db, project_id, current_user.id)

    background_tasks.add_task(
        _run_backend_deploy,
        str(project_id),
        str(current_user.id),
        body.repo_url,
        body.env_vars,
        railway_token,
        None,
    )

    return DeployStartResponse(
        deploy_id=f"railway-{project_id}",
        status="building",
        status_url=f"/api/v1/projects/{project_id}/deploy/status",
    )


@router.get(
    "/status",
    response_model=DeployStatusResponse,
    summary="Get live build status from both platforms",
)
async def get_deploy_status(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeployStatusResponse:
    data = await deploy_service.get_deploy_status(db, project_id, current_user.id)
    return DeployStatusResponse(
        frontend=ServiceStatus(**data["frontend"]),
        backend=ServiceStatus(**data["backend"]),
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Ping frontend, backend, DB, and auth; advance state on full success",
)
async def get_deploy_health(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> HealthResponse:
    status_data = await deploy_service.get_deploy_status(db, project_id, current_user.id)

    frontend_url = status_data["frontend"].get("url") or ""
    backend_url = status_data["backend"].get("url") or ""

    if not frontend_url or not backend_url:
        raise HTTPException(
            status_code=400,
            detail={
                "detail": "Deploy URLs not yet available; wait for build to complete",
                "code": "DEPLOY_URLS_UNAVAILABLE",
            },
        )

    health = await deploy_service.health_check(frontend_url, backend_url)

    # All 4 green → advance state
    if all(health.values()):
        await deploy_service.advance_state_to_deployed(db, project_id, current_user.id)
        await websocket_manager.broadcast(str(project_id), {
            "event": "deployment_healthy",
            "health": health,
        })

    return HealthResponse(**health)
