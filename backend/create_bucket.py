import httpx
import asyncio
import os
from dotenv import load_dotenv

async def create_bucket():
    load_dotenv()
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    bucket_name = "project-files"

    if not supabase_url or not service_key:
        print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env")
        return

    url = f"{supabase_url}/storage/v1/bucket"
    headers = {
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "id": bucket_name,
        "name": bucket_name,
        "public": True
    }

    async with httpx.AsyncClient() as client:
        # Check if bucket exists
        check_resp = await client.get(f"{url}/{bucket_name}", headers=headers)
        if check_resp.status_code == 200:
            print(f"Bucket '{bucket_name}' already exists.")
            return

        # Create bucket
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code == 200:
            print(f"Bucket '{bucket_name}' created successfully.")
        else:
            print(f"Failed to create bucket: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    asyncio.run(create_bucket())
