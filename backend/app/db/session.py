import re
from urllib.parse import quote

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


def _fix_database_url(url: str) -> str:
    """Fix DATABASE_URL when password contains @ (common with Render)."""
    if "+psycopg2" in url:
        return url
    # Ensure explicit driver for SQLAlchemy
    url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    # Find last @ before / (separates credentials from host)
    match = list(re.finditer(r"@([a-zA-Z0-9.-]+)/", url))
    if not match:
        return url
    pos = match[-1].start()
    creds_part = url[:pos]  # postgresql+psycopg2://user:password
    host_part = url[pos + 1 :]  # host/db?params
    scheme = "postgresql+psycopg2://"
    if not creds_part.startswith(scheme):
        return url
    rest = creds_part[len(scheme) :]
    if ":" not in rest:
        return url
    user, password = rest.split(":", 1)
    if "@" in password:
        password = quote(password, safe="")
        url = f"{scheme}{user}:{password}@{host_part}"
    return url


_db_url = _fix_database_url(settings.DATABASE_URL)


def get_database_url() -> str:
    """URL usada por SQLAlchemy e Alembic (password com @ já escapado)."""
    return _db_url


engine = create_engine(_db_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
