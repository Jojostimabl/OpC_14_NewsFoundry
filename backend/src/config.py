"""Configuration serveur ; aucune clé fournisseur n'est exposée au navigateur."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )
    database_url: str = Field(validation_alias="DATABASE_URL")
    cors_origins: str = "http://127.0.0.1:3014,http://localhost:3014"
    jwt_secret: str = ""
    llm_model: str = ""
    openrouter_api_key: str = ""
    world_news_api_key: str = ""

    @property
    def allowed_origins(self) -> list[str]:
        return [
            value.strip() for value in self.cors_origins.split(",") if value.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
