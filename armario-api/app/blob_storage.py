import uuid
from datetime import datetime, timedelta, timezone

from azure.storage.blob import BlobSasPermissions, BlobServiceClient, ContentSettings, generate_blob_sas

from app.config import settings

_client = BlobServiceClient(
    account_url=f"https://{settings.azure_storage_account_name}.blob.core.windows.net",
    credential=settings.azure_storage_account_key,
)
_container = _client.get_container_client(settings.azure_storage_container_name)


def upload_prenda_image(file_bytes: bytes, content_type: str, extension: str = "jpg") -> str:
    blob_name = f"{uuid.uuid4()}.{extension}"
    blob_client = _container.get_blob_client(blob_name)
    blob_client.upload_blob(file_bytes, content_settings=ContentSettings(content_type=content_type), overwrite=True)
    return blob_name


def download_blob_bytes(blob_name: str) -> bytes:
    blob_client = _container.get_blob_client(blob_name)
    return blob_client.download_blob().readall()


def get_signed_url(blob_name: str, expires_in_hours: int = 1) -> str:
    sas_token = generate_blob_sas(
        account_name=settings.azure_storage_account_name,
        container_name=settings.azure_storage_container_name,
        blob_name=blob_name,
        account_key=settings.azure_storage_account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
    )
    return (
        f"https://{settings.azure_storage_account_name}.blob.core.windows.net"
        f"/{settings.azure_storage_container_name}/{blob_name}?{sas_token}"
    )


def delete_blob(blob_name: str) -> None:
    _container.get_blob_client(blob_name).delete_blob(delete_snapshots="include")
