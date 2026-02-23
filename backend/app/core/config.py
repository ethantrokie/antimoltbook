from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./data/antimoltbook.db"
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    captcha_token_expire_minutes: int = 5
    upload_dir: str = "./uploads"
    max_gif_size: int = 5 * 1024 * 1024  # 5MB
    max_video_size: int = 10 * 1024 * 1024  # 10MB
    allowed_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
