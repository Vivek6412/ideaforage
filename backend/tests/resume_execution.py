import httpx
import json
import asyncio

async def resume_execution():
    project_id = "4413d262-a998-4323-b950-7baa6f34ae41"
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDVlN2Q5YS1kYmVhLTRiOTItODgwZi03ZWMyOTRiNjVlM2UiLCJleHAiOjE3Nzk4ODE3Njh9._yaYO6aVDuWw8j4sG9C_NXVCjyc-vUam3hGoN0n-5JI"
    cookies = {"access_token": token}
    
    async with httpx.AsyncClient(timeout=300.0, cookies=cookies) as client:
        print("--- Resuming Execution ---")
        # First check status to see if it's paused
        r = await client.post(f"http://localhost:8000/api/v1/projects/{project_id}/execution/resume")
        print(f"Status: {r.status_code}")
        print(f"Body: {r.text}")

if __name__ == "__main__":
    asyncio.run(resume_execution())
