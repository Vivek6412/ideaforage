import asyncio
from sqlalchemy import update
from app.database import _get_session_factory
from app.models.project import Project

async def reset_state():
    factory = _get_session_factory()
    async with factory() as db:
        await db.execute(
            update(Project)
            .where(Project.id == 'c4c4f518-0829-49a0-815c-d33ce3f5dc59')
            .values(current_state='BLUEPRINT_DRAFT')
        )
        await db.commit()
        print("Project c4c4f518-0829-49a0-815c-d33ce3f5dc59 reset to BLUEPRINT_DRAFT")

if __name__ == "__main__":
    asyncio.run(reset_state())
