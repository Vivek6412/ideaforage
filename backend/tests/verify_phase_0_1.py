import httpx
import json
import asyncio

async def run_phase_0_1_test():
    base_url = "http://localhost:8000/api/v1"
    login_data = {"email": "test@test.com", "password": "testpass123"}
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Phase 0: Login
        print("--- Testing Phase 0: Login ---")
        login_resp = await client.post(f"{base_url}/auth/login", json=login_data)
        if login_resp.status_code == 200:
            token = login_resp.cookies.get("access_token")
            client.cookies.set("access_token", token)
            print(f"Login Successful. Token: {token[:15]}...")
        else:
            print(f"Login Failed: {login_resp.text}")
            return

        # Phase 1: Create Project and Process Idea
        print("\n--- Testing Phase 1: Idea Capture ---")
        proj_resp = await client.post(f"{base_url}/projects", json={"name": "Phase 1 Verify App"})
        if proj_resp.status_code == 201:
            project_id = proj_resp.json()["id"]
            print(f"Project Created: {project_id}")
            
            # Process a simple idea
            process_resp = await client.post(
                f"{base_url}/projects/{project_id}/idea/process",
                data={"text": "I want to build a simple habit tracker app."}
            )
            print(f"Idea Process Status: {process_resp.status_code}")
            try:
                data = process_resp.json()
                print(f"Structured Output: {json.dumps(data, indent=2)}")
            except:
                print(f"Raw Output: {process_resp.text}")
        else:
            print(f"Project Creation Failed: {proj_resp.text}")

if __name__ == "__main__":
    asyncio.run(run_phase_0_1_test())
