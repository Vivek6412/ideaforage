import asyncio
import os
from logging.config import fileConfig
from dotenv import load_dotenv

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Load .env file
load_dotenv()

# Must import Base BEFORE models so metadata is populated
from app.database import Base
import app.models  # noqa: F401 — registers all ORM models on Base.metadata

config = context.config

# Load logging config from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject DATABASE_URL into alembic config.
# Reads from environment directly so alembic works even when
# settings.DATABASE_URL would fail validation (e.g. empty string).
_db_url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
if not _db_url:
    raise RuntimeError("DATABASE_URL is not set. Fill in backend/.env before running migrations.")

# Alembic requires asyncpg driver for online async migrations.
# Ensure URL uses postgresql+asyncpg:// scheme.
if _db_url.startswith("postgresql://"):
    _async_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _async_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
else:
    _async_url = _db_url

# Sync URL for offline mode (no driver needed, just string rendering)
_sync_url = (
    _async_url
    .replace("postgresql+asyncpg://", "postgresql://", 1)
)

config.set_main_option("sqlalchemy.url", _async_url.replace("%", "%%"))

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run without live DB connection — generates SQL to stdout."""
    context.configure(
        url=_sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()