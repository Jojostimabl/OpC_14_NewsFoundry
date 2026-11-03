"""Base dédiée et création idempotente du compte de démonstration."""

from functools import lru_cache

import bcrypt
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine, select

from src.config import get_settings
from src.models import User


@lru_cache
def get_engine():
    url = make_url(get_settings().database_url)
    if url.drivername == "postgresql":
        url = url.set(drivername="postgresql+psycopg2")
    return create_engine(url, echo=False, pool_pre_ping=True)


def init_db() -> None:
    engine = get_engine()
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == "test@test.com")).first()
        if user is None:
            session.add(
                User(
                    email="test@test.com",
                    hashed_password=bcrypt.hashpw(b"test", bcrypt.gensalt()).decode(),
                )
            )
            session.commit()
