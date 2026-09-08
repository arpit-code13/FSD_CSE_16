from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode


class Settings(BaseSettings):
    APP_NAME: str = "BharatTrafficTwin"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: Annotated[list[str], NoDecode] = Field(default=["http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:5173"])
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/bharat_traffic_twin"
    SUMO_HOME: str = "/usr/share/sumo"

    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    WS_BROADCAST_INTERVAL: float = 3.0  # seconds between WebSocket broadcasts

    # HERE Maps API keys (traffic + routing)
    HERE_API_KEY: str = ""
    HERE_API_KEY_V8: str = ""  # routing v8 key (can be same as HERE_API_KEY)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def split_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
