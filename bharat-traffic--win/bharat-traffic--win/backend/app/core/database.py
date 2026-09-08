from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _build_database_url(url: str) -> str:
    """Ensure the URL uses the psycopg driver for SQLAlchemy, supporting postgres:// and postgresql://."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    
    prefix = "postgresql://"
    target = "postgresql+psycopg://"
    if url.startswith(prefix) and not url.startswith(target):
        return target + url[len(prefix):]
    return url


engine = create_engine(_build_database_url(settings.DATABASE_URL))
SessionLocal = sessionmaker(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
