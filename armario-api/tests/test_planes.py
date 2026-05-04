"""
Tests de límites por plan (normal vs premium).
- Normal: máx 2 armarios, máx 10 prendas/armario
- Premium: máx 25 armarios, máx 25 prendas/armario
"""
import pytest


JPEG_MINIMO = (
    b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
    b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
    b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
    b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
    b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
    b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
    b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
    b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd3\xff\xd9"
)


def _registrar_usuario(client, email, password="Test1234!", nombre="User"):
    client.post("/auth/registro", json={"email": email, "password": password, "nombre": nombre})
    token = client.post("/auth/login", data={"username": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _crear_armario(client, headers, nombre="Armario"):
    return client.post("/armarios", json={"nombre": nombre}, headers=headers)


def _subir_prenda(client, headers, id_armario, nombre="Prenda"):
    return client.post(
        "/prendas",
        data={"id_armario": id_armario, "nombre": nombre, "id_categoria": 1},
        files={"imagen": ("test.jpg", JPEG_MINIMO, "image/jpeg")},
        headers=headers,
    )


class TestLimitesNormal:
    def test_normal_puede_crear_dos_armarios(self, client):
        h = _registrar_usuario(client, "normal_2arm@test.com")
        assert _crear_armario(client, h, "A1").status_code == 201
        assert _crear_armario(client, h, "A2").status_code == 201

    def test_normal_no_puede_crear_tercer_armario(self, client):
        h = _registrar_usuario(client, "normal_3arm@test.com")
        _crear_armario(client, h, "A1")
        _crear_armario(client, h, "A2")
        resp = _crear_armario(client, h, "A3")
        assert resp.status_code == 403
        assert "normal" in resp.json()["detail"]

    def test_normal_puede_subir_hasta_10_prendas(self, client, imagen_fake):
        h = _registrar_usuario(client, "normal_10p@test.com")
        id_armario = _crear_armario(client, h, "Armario").json()["id_armario"]
        for i in range(10):
            assert _subir_prenda(client, h, id_armario, f"Prenda {i}").status_code == 201

    def test_normal_no_puede_subir_undecima_prenda(self, client, imagen_fake):
        h = _registrar_usuario(client, "normal_11p@test.com")
        id_armario = _crear_armario(client, h, "Armario").json()["id_armario"]
        for i in range(10):
            _subir_prenda(client, h, id_armario, f"Prenda {i}")
        resp = _subir_prenda(client, h, id_armario, "Prenda 11")
        assert resp.status_code == 403
        assert "normal" in resp.json()["detail"]


class TestLimitesPremium:
    def test_premium_puede_crear_mas_de_dos_armarios(self, client):
        h = _registrar_usuario(client, "premium_arm@test.com")
        client.patch("/auth/me", json={"tipo_usuario": "premium"}, headers=h)
        for i in range(3):
            assert _crear_armario(client, h, f"Armario {i}").status_code == 201

    def test_premium_puede_subir_mas_de_10_prendas(self, client, imagen_fake):
        h = _registrar_usuario(client, "premium_prendas@test.com")
        client.patch("/auth/me", json={"tipo_usuario": "premium"}, headers=h)
        id_armario = _crear_armario(client, h, "Armario Premium").json()["id_armario"]
        for i in range(11):
            assert _subir_prenda(client, h, id_armario, f"Prenda {i}").status_code == 201


class TestTipoUsuario:
    def test_registro_default_normal(self, client):
        h = _registrar_usuario(client, "tipo_default@test.com")
        resp = client.get("/auth/me", headers=h)
        assert resp.json()["tipo_usuario"] == "normal"

    def test_actualizar_a_premium(self, client):
        h = _registrar_usuario(client, "upgrade@test.com")
        resp = client.patch("/auth/me", json={"tipo_usuario": "premium"}, headers=h)
        assert resp.status_code == 200
        assert resp.json()["tipo_usuario"] == "premium"

    def test_tipo_usuario_invalido(self, client):
        h = _registrar_usuario(client, "tipo_invalido@test.com")
        resp = client.patch("/auth/me", json={"tipo_usuario": "vip"}, headers=h)
        assert resp.status_code == 422
