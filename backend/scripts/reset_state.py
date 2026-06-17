import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.project import Project
from app.models.stage_output import StageOutput
from app.models.execution_task import ExecutionTask
from app.models.execution_log import ExecutionLog
from app.config import settings

async def reset_state():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # Find UI Test Project
        result = await session.execute(
            select(Project)
            .where(Project.name == "UI Test Project")
            .order_by(Project.created_at.desc())
            .limit(1)
        )
        project = result.scalar_one_or_none()
        
        if project:
            print(f"Found project {project.id}, current state {project.current_state}")
            project.current_state = "BLUEPRINT_DRAFT"
            
            # Delete stage outputs for blueprint, prompts, execution
            await session.execute(
                StageOutput.__table__.delete().where(
                    StageOutput.project_id == project.id,
                    StageOutput.stage.in_(["blueprint", "prompts"])
                )
            )
            
            # Delete execution logs
            await session.execute(
                ExecutionLog.__table__.delete().where(ExecutionLog.project_id == project.id)
            )
            
            # Delete execution tasks
            await session.execute(
                ExecutionTask.__table__.delete().where(ExecutionTask.project_id == project.id)
            )
            
            await session.commit()
            print("Project state reset to IDEA_CAPTURED.")
        else:
            print("UI Test Project not found.")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(reset_state())
