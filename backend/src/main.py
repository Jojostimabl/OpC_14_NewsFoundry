"""Socle FastAPI : démarrage DB, CORS local et état de disponibilité."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session

from src.config import get_settings
from src.database import get_engine, init_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield
    get_engine().dispose()


app = FastAPI(title="NewsFoundry API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/")
def hello():
    return {"service": "NewsFoundry", "message": "API disponible"}


@app.get("/health")
def health():
    try:
        with Session(get_engine()) as session:
            session.exec(text("SELECT 1"))
    except SQLAlchemyError:
        raise HTTPException(status_code=503, detail="Database unavailable") from None
    return {"status": "ready", "database": "connected"}
