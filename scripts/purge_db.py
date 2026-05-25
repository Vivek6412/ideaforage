import asyncio
from sqlalchemy import delete
from app.database import _get_session_factory
from app.models.project import Project
from app.models.user import User, UserApiKey
from app.models.stage_output import StageOutput

async def purge_db():
    factory = _get_session_factory()
    async with factory() as db:
        # Delete in order of dependencies
        await db.execute(delete(StageOutput))
        await db.execute(delete(UserApiKey))
        await db.execute(delete(Project))
        await db.execute(delete(User))
        await db.commit()
        print("Database purged: All StageOutputs, UserApiKeys, Projects, and Users deleted.")

if __name__ == "__main__":
    asyncio.run(purge_db())
