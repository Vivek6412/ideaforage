import httpx
import json

async def login():
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"email": "test@test.com", "password": "testpass123"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Headers: {json.dumps(dict(resp.headers), indent=2)}")
        print(f"Body: {resp.text}")
        if "access_token" in resp.cookies:
            print(f"Access Token: {resp.cookies['access_token']}")

import asyncio
asyncio.run(login())
