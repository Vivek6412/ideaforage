import asyncio
from app.database import AsyncSessionLocal
from app.models.project import Project

async def check():
    async with AsyncSessionLocal() as session:
        project = await session.get(Project, '2d17cb3d-a8e7-47db-862f-f0fb4a7ba683')
        if project:
            project.current_state = 'BLUEPRINT_CONFIRMED'
            await session.commit()
            print("Reset successful")
        else:
            print("Project not found")

asyncio.run(check())
