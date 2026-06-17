import asyncio
import json
from uuid import UUID
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.stage_output import StageOutput
from app.config import settings

async def patch_blueprint():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as session:
        # Get all blueprints
        result = await session.execute(select(StageOutput).where(StageOutput.stage == "blueprint"))
        blueprints = result.scalars().all()
        
        for bp in blueprints:
            # Get corresponding idea
            idea_res = await session.execute(
                select(StageOutput).where(StageOutput.project_id == bp.project_id, StageOutput.stage == "idea_capture")
                .order_by(StageOutput.round_number.desc()).limit(1)
            )
            idea = idea_res.scalar_one_or_none()
            
            if idea and idea.output_json:
                idea_json = idea.output_json.get("structured_idea", idea.output_json)
                bp_json = bp.output_json.get("blueprint", bp.output_json)
                
                changed = False
                for k in ["product_summary", "problem_statement", "target_users", "key_features", "key_flows"]:
                    if k in idea_json and k not in bp_json:
                        bp_json[k] = idea_json[k]
                        changed = True
                
                if changed:
                    if "blueprint" in bp.output_json:
                        bp.output_json["blueprint"] = bp_json
                    else:
                        bp.output_json = bp_json
                    
                    # SQLAlchemy requires re-assigning JSONB fields to detect changes
                    from copy import deepcopy
                    bp.output_json = deepcopy(bp.output_json)
                    print(f"Patched blueprint for project {bp.project_id}")
        
        await session.commit()
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(patch_blueprint())
