from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 horas

    azure_storage_account_name: str
    azure_storage_account_key: str
    azure_storage_container_name: str = "prendas"

    # Azure OpenAI — chat y visión (GPT-5.4-Pro)
    azure_openai_endpoint: str
    azure_openai_api_key: str
    azure_openai_api_version: str = "2024-12-01-preview"
    azure_openai_deployment_chat: str = "gpt-5.4-pro-1"
    azure_openai_deployment_vision: str = "gpt-5.4-pro-1"

    # Azure OpenAI — imagen (gpt-image-2, recurso separado)
    azure_image_endpoint: str
    azure_image_api_key: str
    azure_image_deployment: str = "gpt-image-2-1"

    # Stripe
    stripe_api_key: str

    # Email
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = "martamorenodominguezz@gmail.com"
    smtp_password: str = "" # Se debe configurar en .env


settings = Settings()
