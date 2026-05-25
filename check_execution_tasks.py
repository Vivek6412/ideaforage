import asyncio
import json
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.execution_task import ExecutionTask

async def check_tasks():
    project_id = '4413d262-a998-4323-b950-7baa6f34ae41'
    session_factory = _get_session_factory()
    
    async with session_factory() as db:
        result = await db.execute(
            select(ExecutionTask).where(
                ExecutionTask.project_id == project_id
            ).order_by(ExecutionTask.task_order)
        )
        tasks = result.scalars().all()
        print(f"Total tasks: {len(tasks)}")
        for t in tasks:
            print(f"Task: {t.task_name}, Status: {t.status}, Order: {t.task_order}, Deps: {t.depends_on}")

if __name__ == "__main__":
    asyncio.run(check_tasks())
