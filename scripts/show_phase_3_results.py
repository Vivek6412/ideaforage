import asyncio
import json
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.execution_task import ExecutionTask
from app.models.stage_output import StageOutput

async def show_results():
    project_id = '4413d262-a998-4323-b950-7baa6f34ae41'
    session_factory = _get_session_factory()
    
    async with session_factory() as db:
        # 1. Fetch Prompts Output
        p_result = await db.execute(
            select(StageOutput).where(
                StageOutput.project_id == project_id,
                StageOutput.stage == 'prompts'
            )
        )
        prompts = p_result.scalars().first()
        
        # 2. Fetch Tasks
        t_result = await db.execute(
            select(ExecutionTask).where(
                ExecutionTask.project_id == project_id
            ).order_by(ExecutionTask.task_order)
        )
        tasks = t_result.scalars().all()
        
        print("\n" + "="*50)
        print("PHASE 3 RESULTS: PROMPT SET & EXECUTION QUEUE")
        print("="*50)
        
        if prompts:
            print(f"\n[MASTER PROMPT PREVIEW]:\n{prompts.output_json.get('master_prompt', '')[:500]}...")
        
        print(f"\n[EXECUTION QUEUE] ({len(tasks)} Tasks):")
        for t in tasks:
            print(f"\nOrder {t.task_order}: {t.task_name}")
            print(f"Prompt: {t.prompt_used[:150]}...")
        print("\n" + "="*50)

if __name__ == "__main__":
    asyncio.run(show_results())
