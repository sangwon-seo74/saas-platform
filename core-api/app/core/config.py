from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    supabase_jwt_secret: str
    supabase_url: str
    supabase_service_role_key: str
    allowed_origins: str = "http://localhost:3000"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    app_url: str = "http://localhost:3000"
    super_admin_emails: str = ""
    invite_token_secret: str
    super_admin_ip_whitelist: str = ""
    anthropic_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    @property
    def super_admin_emails_list(self) -> list[str]:
        return [e.strip() for e in self.super_admin_emails.split(",") if e.strip()]

    @property
    def super_admin_ip_whitelist_list(self) -> list[str]:
        return [ip.strip() for ip in self.super_admin_ip_whitelist.split(",") if ip.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
