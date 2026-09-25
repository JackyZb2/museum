from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://museumai:museumai@db:5432/museumai"
    upload_dir: str = "uploads"
    max_upload_size: int = 20 * 1024 * 1024
    class Config:
        env_file = ".env"
settings = Settings()

