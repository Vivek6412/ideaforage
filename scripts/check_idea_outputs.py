
import asyncio
from uuid import UUID
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.stage_output import StageOutput
import json

async def check_outputs():
    factory = _get_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(StageOutput)
            .where(StageOutput.stage == "idea_capture")
            .order_by(StageOutput.created_at.desc())
            .limit(5)
        )
        outputs = result.scalars().all()
        for i, out in enumerate(outputs):
            print(f"--- Output {i} (Project: {out.project_id}, Round: {out.round_number}) ---")
            print(json.dumps(out.output_json, indent=2))
            print("\n")

if __name__ == "__main__":
    asyncio.run(check_outputs())
