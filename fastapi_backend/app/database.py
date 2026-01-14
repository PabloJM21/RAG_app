# app/database.py

from typing import AsyncGenerator
from fastapi import Depends
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import sqlite3
import sqlite_vec

from .config import settings
from .models import Base, User


# --- Create async engine ---
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,  # set True if you want SQL logs
)



# --- Load sqlite-vec on every connection ---
@event.listens_for(engine.sync_engine, "connect")
def load_sqlite_vec(dbapi_connection, connection_record):
    # unwrap aiosqlite → sqlite3.Connection
    raw_conn = dbapi_connection._connection._conn
    # load sqlite-vec via Python package
    sqlite_vec.load(raw_conn)

    #raw_conn.enable_load_extension(True)
    #raw_conn.load_extension(r"C:\Program Files\sqlite-vec\vec0.dll")



# --- Session maker ---
async_session_maker = async_sessionmaker(
    engine, expire_on_commit=settings.EXPIRE_ON_COMMIT
)


# --- Create tables ---
async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# --- Dependency for FastAPI ---
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)

