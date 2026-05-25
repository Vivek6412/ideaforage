import asyncio
from app.database import _get_session_factory
from app.models.project import Project
from sqlalchemy import select

async def main():
    try:
        session_factory = _get_session_factory()
        async with session_factory() as db:
            res = await db.execute(select(Project))
            projects = res.scalars().all()
            for p in projects:
                print(f"Project ID: {p.id} - Name: {p.name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
