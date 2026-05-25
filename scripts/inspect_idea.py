import asyncio
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.stage_output import StageOutput
import json

async def inspect_idea():
    factory = _get_session_factory()
    async with factory() as db:
        res = await db.execute(
            select(StageOutput)
            .where(
                StageOutput.project_id == 'c4c4f518-0829-49a0-815c-d33ce3f5dc59',
                StageOutput.stage == 'idea_capture'
            )
            .order_by(StageOutput.round_number.desc())
            .limit(1)
        )
        record = res.scalar_one_or_none()
        if record:
            print(json.dumps(record.output_json, indent=2))
        else:
            print("No idea record found")

if __name__ == "__main__":
    asyncio.run(inspect_idea())
