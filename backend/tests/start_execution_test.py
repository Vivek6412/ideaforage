import httpx
import json

async def start_execution():
    project_id = "849a5f47-9c6a-4638-baf5-e0407c48a6c2"
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDVlN2Q5YS1kYmVhLTRiOTItODgwZi03ZWMyOTRiNjVlM2UiLCJleHAiOjE3Nzk3MTkzMTB9.-yCX1tHUvigBpAS5aLhAGQyrTXA_0Cu1BFhnDhwgXXc"
    cookies = {"access_token": token}
    async with httpx.AsyncClient(cookies=cookies) as client:
        resp = await client.post(
            f"http://localhost:8000/api/v1/projects/{project_id}/execution/start"
        )
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")

import asyncio
asyncio.run(start_execution())
