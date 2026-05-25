import asyncio
from sqlalchemy import select
from app.database import _get_session_factory
from app.models.user import User, UserApiKey
from app.core.encryption import encrypt

async def add_gemini_key():
    # THE KEY PROVIDED BY USER
    gemini_key = "REDACTED_GEMINI_KEY"
    
    session_factory = _get_session_factory()
    async with session_factory() as db:
        # Get test@test.com
        result = await db.execute(select(User).where(User.email == "test@test.com"))
        test_user = result.scalar_one_or_none()
        if not test_user:
            print("test@test.com not found")
            return
        
        # Check if test@test.com already has a gemini key
        result = await db.execute(select(UserApiKey).where(
            UserApiKey.user_id == test_user.id, 
            UserApiKey.provider == "gemini"
        ))
        existing = result.scalar_one_or_none()
        
        encrypted_key = encrypt(gemini_key)
        
        if existing:
            existing.encrypted_key = encrypted_key
            print(f"Updated Gemini key for {test_user.email}")
        else:
            new_key = UserApiKey(
                user_id=test_user.id,
                provider="gemini",
                encrypted_key=encrypted_key
            )
            db.add(new_key)
            print(f"Added Gemini key to {test_user.email}")
            
        await db.commit()

if __name__ == "__main__":
    asyncio.run(add_gemini_key())
