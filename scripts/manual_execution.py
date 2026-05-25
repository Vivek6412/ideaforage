import asyncio
from uuid import UUID
from app.database import _get_session_factory
from app.services.execution_service import _run_next_eligible_task
from app.services.auth_service import get_api_key

async def manual_run():
    project_id = UUID('4413d262-a998-4323-b950-7baa6f34ae41')
    user_id = UUID('045e7d9a-dbea-4b92-880f-7ec294b65e3e')
    
    session_factory = _get_session_factory()
    async with session_factory() as db:
        user_keys = {}
        for p in ("anthropic", "openai", "gemini"):
            k = await get_api_key(db, user_id, p)
            if k: user_keys[p] = k
        
        print(f"Starting manual task execution for project {project_id}...")
        await _run_next_eligible_task(db, project_id, user_keys)
        print("Manual task execution finished.")

if __name__ == "__main__":
    asyncio.run(manual_run())
