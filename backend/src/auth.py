"""Connexion bcrypt et contrôle des JWT pour les routes privées."""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, SecretStr, field_validator
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import Session, select

from src.config import get_settings
from src.database import get_session
from src.models import User

router = APIRouter(tags=["Authentification"])
bearer = HTTPBearer(auto_error=False)
ALGORITHM = "HS256"
ISSUER = "newsfoundry-api"
AUDIENCE = "newsfoundry-frontend"
# Un utilisateur inconnu suit aussi une vérification bcrypt.
DUMMY_HASH = bcrypt.hashpw(b"unused-demo-password", bcrypt.gensalt())


class LoginRequest(BaseModel):
    email: str = Field(
        min_length=3, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )
    password: SecretStr

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value


class UserRead(BaseModel):
    id: int
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    expires_at: datetime
    user: UserRead


def unauthorized() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail="Session invalide ou expirée. Reconnectez-vous.",
        headers={"WWW-Authenticate": "Bearer", "Cache-Control": "no-store"},
    )


def verify_password(password: str, hashed_password: bytes) -> bool:
    encoded = password.encode("utf-8")
    # bcrypt 5 rejette les mots de passe dépassant 72 octets.
    if not encoded or len(encoded) > 72:
        return False
    try:
        return bcrypt.checkpw(encoded, hashed_password)
    except ValueError:
        return False


def create_access_token(user: User) -> tuple[str, datetime]:
    settings = get_settings()
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=settings.jwt_access_token_minutes)
    token = jwt.encode(
        {
            "sub": str(user.id),
            "iat": now,
            "exp": expires_at,
            "iss": ISSUER,
            "aud": AUDIENCE,
        },
        settings.jwt_secret,
        algorithm=ALGORITHM,
    )
    return token, expires_at


SessionDependency = Annotated[Session, Depends(get_session)]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    session: SessionDependency,
) -> User:
    if credentials is None:
        raise unauthorized()
    try:
        claims = jwt.decode(
            credentials.credentials,
            get_settings().jwt_secret,
            algorithms=[ALGORITHM],
            issuer=ISSUER,
            audience=AUDIENCE,
            options={"require": ["sub", "iat", "exp", "iss", "aud"]},
        )
        user_id = int(claims["sub"])
        if user_id <= 0:
            raise ValueError("Invalid subject")
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise unauthorized() from None
    try:
        user = session.get(User, user_id)
    except SQLAlchemyError:
        raise HTTPException(503, "Service temporairement indisponible.") from None
    if user is None:
        raise unauthorized()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response, session: SessionDependency):
    try:
        user = session.exec(
            select(User).where(User.email == payload.email.strip().lower())
        ).first()
    except SQLAlchemyError:
        raise HTTPException(503, "Service temporairement indisponible.") from None
    password_hash = user.hashed_password.encode() if user else DUMMY_HASH
    valid_password = verify_password(payload.password.get_secret_value(), password_hash)
    if user is None or not valid_password:
        raise HTTPException(
            401,
            "Adresse e-mail ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer", "Cache-Control": "no-store"},
        )
    token, expires_at = create_access_token(user)
    response.headers["Cache-Control"] = "no-store"
    return TokenResponse(
        access_token=token,
        expires_at=expires_at,
        expires_in=get_settings().jwt_access_token_minutes * 60,
        user=UserRead(id=user.id, email=user.email),
    )


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser, response: Response):
    response.headers["Cache-Control"] = "no-store"
    return UserRead(id=user.id, email=user.email)
