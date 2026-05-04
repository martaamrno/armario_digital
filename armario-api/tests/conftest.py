"""
Fixtures compartidos para todos los tests.

- Base de datos: SQLite en memoria (StaticPool — misma BD para app y background tasks)
- Azure Blob Storage: mockeado
- Azure OpenAI (chat, visión, imágenes): mockeado
"""
import io
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── Variables de entorno de test ANTES de cualquier import de la app ──────────
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
os.environ.setdefault("AZURE_STORAGE_ACCOUNT_NAME", "testaccount")
os.environ.setdefault("AZURE_STORAGE_ACCOUNT_KEY", "dGVzdGtleQ==")
os.environ.setdefault("AZURE_STORAGE_CONTAINER_NAME", "testcontainer")
os.environ.setdefault("AZURE_OPENAI_ENDPOINT", "https://test.services.ai.azure.com/api/projects/test")
os.environ.setdefault("AZURE_OPENAI_API_KEY", "test-api-key")
os.environ.setdefault("AZURE_IMAGE_ENDPOINT", "https://test-image.services.ai.azure.com/api/projects/test")
os.environ.setdefault("AZURE_IMAGE_API_KEY", "test-image-api-key")

# ── Mockear clientes externos ANTES de que los módulos los instancien ─────────
# BlobServiceClient se mockea a nivel de clase Y las funciones individuales
# para evitar que los decoradores internos del SDK de Azure llamen a la API real.
_blob_patcher = patch("app.blob_storage.BlobServiceClient")
_blob_upload_patcher = patch("app.blob_storage.upload_prenda_image", return_value="test-blob.jpg")
_blob_download_patcher = patch("app.blob_storage.download_blob_bytes", return_value=b"\xff\xd8\xff\xd9")
_blob_delete_patcher = patch("app.blob_storage.delete_blob")
_blob_url_patcher = patch("app.blob_storage.get_signed_url", return_value="https://test.blob.core.windows.net/test.jpg")
_ai_chat_patcher = patch("app.ai_service.OpenAI", autospec=True)
_ai_edit_patcher = patch("app.ai_service.AzureOpenAI", autospec=True)
_blob_patcher.start()
_blob_upload_patcher.start()
_blob_download_patcher.start()
_blob_delete_patcher.start()
_blob_url_patcher.start()
_ai_chat_patcher.start()
_ai_edit_patcher.start()

# ── Imports de la app (después de env vars y mocks) ───────────────────────────
import app.database as _app_db          # noqa: E402
from app.database import Base, get_db   # noqa: E402
from app.main import app                # noqa: E402

# ── Motor SQLite con StaticPool (misma BD en todas las conexiones) ─────────────
_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

# Reemplazar el engine y SessionLocal de la app para que las background tasks
# usen la misma BD que los tests.
_app_db.engine = _engine
_app_db.SessionLocal = _TestingSession


def _override_get_db():
    db = _TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture()
def client():
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture()
def auth_headers(client):
    """Registra un usuario premium de test y devuelve el header Authorization."""
    client.post("/auth/registro", json={
        "email": "test@armario.com",
        "password": "Test1234!",
        "nombre": "Test User",
    })
    resp = client.post("/auth/login", data={
        "username": "test@armario.com",
        "password": "Test1234!",
    })
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    # Usuario premium para que los tests no choquen con los límites del plan normal
    client.patch("/auth/me", json={"tipo_usuario": "premium"}, headers=headers)
    return headers


@pytest.fixture()
def imagen_fake():
    """Bytes mínimos de un JPEG 1×1 para tests de subida."""
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
        b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
        b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd3\xff\xd9"
    )
