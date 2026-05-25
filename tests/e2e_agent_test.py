
import asyncio
import json
import sys
import httpx

BASE = "http://localhost:8000/api/v1"
CREDS = {"email": "test@test.com", "password": "testpass123"}
TIMEOUT = 300.0

def _print(label: str, status: int, body: dict) -> None:
    ok = "✓" if status < 400 else "✗"
    print(f"\n{ok} [{status}] {label}")
    print(json.dumps(body, indent=2)[:1000])

async def run() -> None:
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as c:
        # 0. Login
        r = await c.post(f"{BASE}/auth/login", json=CREDS)
        token = r.cookies.get("access_token")
        c.cookies.set("access_token", token)

        # 1. Get latest project
        r = await c.get(f"{BASE}/projects")
        project_id = r.json()[0]["id"]
        print(f"Testing Project: {project_id}")

        # 2. Confirm Blueprint
        print("\n--- Confirming Blueprint ---")
        r = await c.post(f"{BASE}/projects/{project_id}/blueprint/confirm")
        _print("Blueprint Confirmed", r.status_code, r.json())

        # 3. Generate Prompts
        print("\n--- Generating Prompts ---")
        r = await c.post(f"{BASE}/projects/{project_id}/prompts/generate")
        _print("Prompts Generated", r.status_code, r.json())

        # 4. Confirm Prompts
        print("\n--- Confirming Prompts ---")
        r = await c.post(f"{BASE}/projects/{project_id}/prompts/confirm")
        _print("Prompts Confirmed", r.status_code, r.json())

        # 5. Start Execution
        print("\n--- Starting Execution ---")
        r = await c.post(f"{BASE}/projects/{project_id}/execution/start")
        _print("Execution Started", r.status_code, r.json())

        # 6. Monitor Status
        print("\n--- Monitoring Execution Status ---")
        for _ in range(5):
            await asyncio.sleep(5)
            r = await c.get(f"{BASE}/projects/{project_id}/execution/status")
            body = r.json()
            tasks = body.get("tasks", [])
            print(f"Tasks: {[ (t['task_name'], t['status']) for t in tasks ]}")
            if any(t['status'] == 'pending_review' for t in tasks):
                print("✓ Found task pending review!")
                break

if __name__ == "__main__":
    asyncio.run(run())
