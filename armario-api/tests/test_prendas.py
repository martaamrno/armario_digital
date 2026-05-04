import io
from unittest.mock import patch

import pytest

from tests.conftest import _TestingSession
from app.models import Categoria


# ── Helpers ──────────────────────────────────────────────────────────────────

def _seed_categoria(db, nombre="Camiseta", tipo="superior"):
    cat = db.query(Categoria).filter_by(nombre=nombre).first()
    if not cat:
        cat = Categoria(nombre=nombre, tipo=tipo)
        db.add(cat)
        db.commit()
        db.refresh(cat)
    return cat.id_categoria


def _crear_armario(client, headers, nombre="Armario Prendas"):
    return client.post("/armarios", json={"nombre": nombre}, headers=headers).json()["id_armario"]


def _subir_prenda(client, headers, id_armario, id_categoria, imagen_fake, nombre="Camiseta Azul"):
    with (
        patch("app.routers.prendas.upload_prenda_image", return_value="fake-blob.jpg"),
        patch("app.routers.prendas.describe_prenda", return_value={
            "descripcion": "camiseta azul casual",
            "color_principal": "azul",
            "color_secundario": None,
            "estilo": "casual",
            "temporada": "todo_año",
        }),
    ):
        return client.post(
            "/prendas",
            data={"id_armario": id_armario, "id_categoria": id_categoria, "nombre": nombre},
            files={"imagen": ("test.jpg", io.BytesIO(imagen_fake), "image/jpeg")},
            headers=headers,
        )


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestPrendas:
    @pytest.fixture(autouse=True)
    def setup(self, client, auth_headers, imagen_fake):
        db = _TestingSession()
        self.id_categoria = _seed_categoria(db)
        db.close()
        self.id_armario = _crear_armario(client, auth_headers)
        self.client = client
        self.headers = auth_headers
        self.imagen = imagen_fake

    def test_subir_prenda(self):
        resp = _subir_prenda(self.client, self.headers, self.id_armario, self.id_categoria, self.imagen)
        assert resp.status_code == 201
        data = resp.json()
        assert data["nombre"] == "Camiseta Azul"
        assert data["descripcion_ia"] == "camiseta azul casual"
        assert data["color_principal"] == "azul"
        assert data["imagen_url"] == "fake-blob.jpg"

    def test_listar_prendas(self):
        _subir_prenda(self.client, self.headers, self.id_armario, self.id_categoria, self.imagen, "Prenda 1")
        _subir_prenda(self.client, self.headers, self.id_armario, self.id_categoria, self.imagen, "Prenda 2")
        resp = self.client.get(f"/prendas?id_armario={self.id_armario}", headers=self.headers)
        assert resp.status_code == 200
        nombres = [p["nombre"] for p in resp.json()]
        assert "Prenda 1" in nombres
        assert "Prenda 2" in nombres

    def test_obtener_prenda(self):
        id_prenda = _subir_prenda(
            self.client, self.headers, self.id_armario, self.id_categoria, self.imagen
        ).json()["id_prenda"]
        resp = self.client.get(f"/prendas/{id_prenda}", headers=self.headers)
        assert resp.status_code == 200

    def test_actualizar_prenda(self):
        id_prenda = _subir_prenda(
            self.client, self.headers, self.id_armario, self.id_categoria, self.imagen
        ).json()["id_prenda"]
        resp = self.client.patch(f"/prendas/{id_prenda}", json={"marca": "Zara"}, headers=self.headers)
        assert resp.status_code == 200
        assert resp.json()["marca"] == "Zara"

    def test_eliminar_prenda(self):
        id_prenda = _subir_prenda(
            self.client, self.headers, self.id_armario, self.id_categoria, self.imagen
        ).json()["id_prenda"]
        with patch("app.routers.prendas.delete_blob"):
            resp = self.client.delete(f"/prendas/{id_prenda}", headers=self.headers)
        assert resp.status_code == 204

    def test_url_firmada(self):
        id_prenda = _subir_prenda(
            self.client, self.headers, self.id_armario, self.id_categoria, self.imagen
        ).json()["id_prenda"]
        with patch("app.routers.prendas.get_signed_url", return_value="https://signed-url.example.com/foto.jpg"):
            resp = self.client.get(f"/prendas/{id_prenda}/url-imagen", headers=self.headers)
        assert resp.status_code == 200
        assert "url" in resp.json()

    def test_imagen_tipo_invalido(self):
        resp = self.client.post(
            "/prendas",
            data={"id_armario": self.id_armario, "id_categoria": self.id_categoria, "nombre": "X"},
            files={"imagen": ("doc.pdf", io.BytesIO(b"pdf"), "application/pdf")},
            headers=self.headers,
        )
        assert resp.status_code == 415
