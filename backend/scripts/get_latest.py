import asyncio
from app.database import _get_session_factory
from app.models.user import User
from sqlalchemy import select

async def main():
    async with _get_session_factory()() as s:
        res = await s.execute(select(User).order_by(User.created_at.desc()))
        user = res.scalars().first()
        print(user.email if user else "None")

if __name__ == "__main__":
    asyncio.run(main())
    asyncio.run(main())
