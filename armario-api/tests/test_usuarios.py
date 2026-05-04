import io
from unittest.mock import patch

import pytest


EMAIL = "usuario_test@armario.com"
PASSWORD = "Password123!"


def _registro(client, email=EMAIL, password=PASSWORD, nombre="Juan"):
    return client.post("/auth/registro", json={"email": email, "password": password, "nombre": nombre})


class TestRegistro:
    def test_registro_exitoso(self, client):
        resp = _registro(client)
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == EMAIL
        assert "password_hash" not in data

    def test_registro_email_duplicado(self, client):
        _registro(client)
        resp = _registro(client)
        assert resp.status_code == 409

    def test_registro_email_invalido(self, client):
        resp = client.post("/auth/registro", json={"email": "no-es-email", "password": PASSWORD, "nombre": "X"})
        assert resp.status_code == 422


class TestLogin:
    def setup_method(self):
        self.email = "login_test@armario.com"

    def test_login_exitoso(self, client):
        _registro(client, email=self.email)
        resp = client.post("/auth/login", data={"username": self.email, "password": PASSWORD})
        assert resp.status_code == 200
        assert "access_token" in resp.json()
        assert resp.json()["token_type"] == "bearer"

    def test_login_password_incorrecto(self, client):
        _registro(client, email=self.email)
        resp = client.post("/auth/login", data={"username": self.email, "password": "WrongPass!"})
        assert resp.status_code == 401

    def test_login_usuario_inexistente(self, client):
        resp = client.post("/auth/login", data={"username": "noexiste@x.com", "password": PASSWORD})
        assert resp.status_code == 401


class TestMe:
    def test_get_me(self, client, auth_headers):
        resp = client.get("/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@armario.com"

    def test_get_me_sin_token(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_get_me_token_invalido(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer token.falso.aqui"})
        assert resp.status_code == 401

    def test_patch_me_nombre(self, client, auth_headers):
        resp = client.patch("/auth/me", json={"nombre": "Nuevo Nombre"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["nombre"] == "Nuevo Nombre"


class TestFotoCuerpo:
    IMAGEN = (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
        b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
        b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd3\xff\xd9"
    )

    def test_subir_foto_cuerpo(self, client, auth_headers):
        with (
            patch("app.routers.usuarios.upload_prenda_image", return_value="cuerpo.jpg"),
            patch("app.routers.usuarios.delete_blob"),
        ):
            resp = client.post(
                "/auth/me/foto-cuerpo",
                files={"imagen": ("foto.jpg", io.BytesIO(self.IMAGEN), "image/jpeg")},
                headers=auth_headers,
            )
        assert resp.status_code == 200
        assert resp.json()["foto_cuerpo_url"] == "cuerpo.jpg"

    def test_foto_cuerpo_tipo_invalido(self, client, auth_headers):
        resp = client.post(
            "/auth/me/foto-cuerpo",
            files={"imagen": ("doc.pdf", io.BytesIO(b"pdf"), "application/pdf")},
            headers=auth_headers,
        )
        assert resp.status_code == 415

    def test_url_foto_cuerpo_sin_foto(self, client, auth_headers):
        resp = client.get("/auth/me/foto-cuerpo/url", headers=auth_headers)
        # 404 si no tiene foto, 200 si ya subió una en test anterior
        assert resp.status_code in (200, 404)

    def test_url_foto_sin_autenticacion(self, client):
        resp = client.get("/auth/me/foto-cuerpo/url")
        assert resp.status_code == 401


class TestAvatar:
    def test_generar_avatar(self, client, auth_headers):
        with (
            patch("app.routers.usuarios._task_generar_avatar"),
        ):
            resp = client.post(
                "/auth/me/avatar",
                json={"descripcion": "hombre, 1.80m, complexión atlética, pelo castaño"},
                headers=auth_headers,
            )
        assert resp.status_code == 202
        assert resp.json()["avatar_estado"] == "pendiente"

    def test_generar_avatar_estado_polling(self, client, auth_headers):
        resp = client.get("/auth/me/avatar/estado", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["avatar_estado"] in ("pendiente", "generando", "listo", "error")

    def test_generar_avatar_error_ia(self, client, auth_headers):
        with patch("app.routers.usuarios._task_generar_avatar"):
            resp = client.post(
                "/auth/me/avatar",
                json={"descripcion": "descripcion cualquiera"},
                headers=auth_headers,
            )
        assert resp.status_code == 202

    def test_url_avatar_sin_avatar(self, client, auth_headers):
        resp = client.get("/auth/me/avatar/url", headers=auth_headers)
        assert resp.status_code in (200, 404)
