import asyncio
import json
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.execution_log import ExecutionLog

async def show_logs():
    project_id = '4413d262-a998-4323-b950-7baa6f34ae41'
    session_factory = _get_session_factory()
    
    async with session_factory() as db:
        result = await db.execute(
            select(ExecutionLog).where(
                ExecutionLog.project_id == project_id
            ).order_by(ExecutionLog.created_at.desc()).limit(10)
        )
        logs = result.scalars().all()
        
        print("\n" + "="*50)
        print("LATEST EXECUTION LOGS")
        print("="*50)
        for log in logs:
            print(f"[{log.created_at}] Event: {log.event}")
            print(f"Detail: {json.dumps(log.detail, indent=2)}")
            print("-" * 20)
        print("\n" + "="*50)

if __name__ == "__main__":
    asyncio.run(show_logs())
