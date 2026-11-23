import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

db_url = settings.DATABASE_URL
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # If using relative sqlite path, always resolve relative to project root / database directory
    raw_path = db_url.replace("sqlite:///", "")
    if not os.path.isabs(raw_path):
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        # Strip leading dots and slashes
        clean_path = raw_path.replace("../", "").replace("./", "").replace("\\", "/")
        if not clean_path.startswith("database/"):
            clean_path = os.path.join("database", os.path.basename(clean_path))
        abs_db_path = os.path.abspath(os.path.join(root_dir, clean_path))
        # Ensure directory exists
        os.makedirs(os.path.dirname(abs_db_path), exist_ok=True)
        # Use forward slashes for sqlite url on Windows
        db_url = f"sqlite:///{abs_db_path.replace(os.sep, '/')}"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
