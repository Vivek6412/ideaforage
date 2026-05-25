import asyncio
import json
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.execution_task import ExecutionTask

async def show_generated_files():
    project_id = '4413d262-a998-4323-b950-7baa6f34ae41'
    session_factory = _get_session_factory()
    
    async with session_factory() as db:
        result = await db.execute(
            select(ExecutionTask).where(
                ExecutionTask.project_id == project_id,
                ExecutionTask.status == 'pending_review'
            )
        )
        task = result.scalars().first()
        
        if not task:
            # Maybe it's still running?
            result = await db.execute(
                select(ExecutionTask).where(
                    ExecutionTask.project_id == project_id,
                    ExecutionTask.status == 'running'
                )
            )
            task = result.scalars().first()
            if task:
                print(f"Task '{task.task_name}' is still RUNNING...")
            else:
                print("No active or pending_review tasks found.")
            return

        print("\n" + "="*50)
        print(f"GENERATED FILES FOR TASK: {task.task_name}")
        print("="*50)
        
        files = task.generated_files or []
        for f in files:
            print(f"\n[FILE]: {f.get('path')}")
            content = f.get('content', '')
            # Show first 500 chars
            print("-" * 20)
            print(content[:1000] + ("..." if len(content) > 1000 else ""))
            print("-" * 20)
        
        print("\n" + "="*50)

if __name__ == "__main__":
    asyncio.run(show_generated_files())
