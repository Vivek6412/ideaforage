from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.websocket_manager import websocket_manager
from app.routers import auth, projects, idea, blueprint, prompts, execution, github, deploy

app = FastAPI(title="IdeaForge AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(projects.router, prefix="/api/v1", tags=["projects"])
app.include_router(idea.router, prefix="/api/v1", tags=["idea"])
app.include_router(blueprint.router, prefix="/api/v1", tags=["blueprint"])
app.include_router(prompts.router, prefix="/api/v1", tags=["prompts"])
app.include_router(execution.router, prefix="/api/v1", tags=["execution"])
app.include_router(github.router, prefix="/api/v1", tags=["github"])
app.include_router(deploy.router, prefix="/api/v1", tags=["deploy"])


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws/projects/{project_id}/execution")
async def websocket_execution(websocket: WebSocket, project_id: str):
    await websocket_manager.connect(websocket, project_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, project_id)
