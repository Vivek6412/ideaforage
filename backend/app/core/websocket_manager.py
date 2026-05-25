from __future__ import annotations

import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections keyed by project_id.
    Thread-safe for single-process asyncio deployment.
    """

    def __init__(self) -> None:
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str) -> None:
        await websocket.accept()
        self._connections.setdefault(project_id, []).append(websocket)
        logger.debug("WS connected project=%s total=%d", project_id, len(self._connections[project_id]))

    def disconnect(self, websocket: WebSocket, project_id: str) -> None:
        conns = self._connections.get(project_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._connections.pop(project_id, None)
        logger.debug("WS disconnected project=%s", project_id)

    async def broadcast(self, project_id: str, event: dict[str, Any]) -> None:
        """Send event JSON to all connected clients for this project."""
        conns = self._connections.get(str(project_id), [])
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(event)
            except Exception as exc:
                logger.warning("WS send failed project=%s error=%s", project_id, exc)
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, str(project_id))


# Module-level singleton — import this everywhere
websocket_manager = ConnectionManager()