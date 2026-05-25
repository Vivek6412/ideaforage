import httpx
import json

async def create_project():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDVlN2Q5YS1kYmVhLTRiOTItODgwZi03ZWMyOTRiNjVlM2UiLCJleHAiOjE3Nzk3MTkzMTB9.-yCX1tHUvigBpAS5aLhAGQyrTXA_0Cu1BFhnDhwgXXc"
    cookies = {"access_token": token}
    async with httpx.AsyncClient(cookies=cookies) as client:
        resp = await client.post(
            "http://localhost:8000/api/v1/projects",
            json={"name": "Test Project"}
        )
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")

import asyncio
asyncio.run(create_project())
