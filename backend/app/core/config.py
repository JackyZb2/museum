from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    # Local development uses SQLite so the demo can run without Docker.
    # Set DATABASE_URL to PostgreSQL for the full deployment profile.
    database_url: str = "sqlite:///./museumai.db"
    upload_dir: str = "uploads"
    max_upload_size: int = 20 * 1024 * 1024
settings = Settings()
