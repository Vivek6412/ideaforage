import asyncio, json
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine('postgresql+asyncpg://postgres:postgres@localhost:5432/ideaforge')
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT output_json FROM stage_outputs WHERE stage='blueprint'"))
        for r in res:
            files = r[0].get('files', [])
            print('FILES:', json.dumps(files))

asyncio.run(check())
