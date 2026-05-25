import httpx
import asyncio

async def check():
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get('https://pypi.org/pypi/fastapi/json')
            print('Latest FastAPI:', r.json()['info']['version'])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
