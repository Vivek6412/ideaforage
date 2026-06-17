import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.models.user import User
from app.models.project import Project
from app.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        result = await session.execute(
            select(User).where(User.email == 'test_ui_1779791495007@example.com')
        )
        user = result.scalar_one_or_none()
        if not user:
            print("User not found")
            return
            
        result = await session.execute(
            select(Project).where(Project.user_id == user.id)
        )
        projects = result.scalars().all()
        for p in projects:
            print(f"Project: {p.name}, State: {p.current_state}")

if __name__ == '__main__':
    asyncio.run(main())
