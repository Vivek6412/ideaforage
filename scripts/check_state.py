import asyncio
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.project import Project

async def check_state():
    session_factory = _get_session_factory()
    async with session_factory() as db:
        result = await db.execute(select(Project).where(Project.id == 'ef73f53a-bf50-4b7e-b065-9c906eb30726'))
        p = result.scalar_one_or_none()
        if p:
            print(f"Project State: {p.current_state}")
        else:
            print("Project not found")

if __name__ == "__main__":
    asyncio.run(check_state())
