import httpx
import json

async def register():
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:8000/api/v1/auth/register",
            json={"email": "test@test.com", "password": "testpass123"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")

import asyncio
asyncio.run(register())
