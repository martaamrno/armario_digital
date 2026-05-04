import io
from unittest.mock import patch

import pytest

from tests.conftest import _TestingSession
from app.models import Categoria


# ── Helpers ──────────────────────────────────────────────────────────────────

def _seed_categoria(db):
    cat = db.query(Categoria).filter_by(nombre="Pantalon_looks").first()
    if not cat:
        cat = Categoria(nombre="Pantalon_looks", tipo="inferior")
        db.add(cat)
        db.commit()
        db.refresh(cat)
    return cat.id_categoria


def _crear_armario(client, headers):
    return client.post("/armarios", json={"nombre": "Armario Looks"}, headers=headers).json()["id_armario"]


def _subir_prenda(client, headers, id_armario, id_categoria, nombre, imagen_fake):
    with (
        patch("app.routers.prendas.upload_prenda_image", return_value=f"{nombre}.jpg"),
        patch("app.routers.prendas.describe_prenda", return_value={
            "descripcion": f"descripcion de {nombre}",
            "color_principal": "negro",
            "color_secundario": None,
            "estilo": "casual",
            "temporada": "todo_año",
        }),
    ):
        return client.post(
            "/prendas",
            data={"id_armario": id_armario, "id_categoria": id_categoria, "nombre": nombre},
            files={"imagen": (f"{nombre}.jpg", io.BytesIO(imagen_fake), "image/jpeg")},
            headers=headers,
        ).json()["id_prenda"]


_IA_RESPONSE = {
    "nombre_look": "Casual Monday",
    "descripcion": "Combinación fresca y cómoda para el trabajo",
    "ids_prendas": [],  # se rellena en el test con IDs reales
}


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestLooks:
    @pytest.fixture(autouse=True)
    def setup(self, client, auth_headers, imagen_fake):
        db = _TestingSession()
        id_cat = _seed_categoria(db)
        db.close()
        id_armario = _crear_armario(client, auth_headers)
        self.id_prenda_1 = _subir_prenda(client, auth_headers, id_armario, id_cat, "Camiseta", imagen_fake)
        self.id_prenda_2 = _subir_prenda(client, auth_headers, id_armario, id_cat, "Pantalon", imagen_fake)
        self.id_armario = id_armario
        self.client = client
        self.headers = auth_headers

    def test_crear_look_manual(self):
        resp = self.client.post("/looks", json={
            "nombre": "Look Casual",
            "ocasion": "trabajo",
            "id_prendas": [self.id_prenda_1, self.id_prenda_2],
        }, headers=self.headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["nombre"] == "Look Casual"
        assert data["generado_ia"] is False
        assert data["estado"] == "listo"
        assert len(data["prendas"]) == 2

    def test_listar_looks(self):
        self.client.post("/looks", json={
            "nombre": "Look 1", "id_prendas": [self.id_prenda_1],
        }, headers=self.headers)
        resp = self.client.get("/looks", headers=self.headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_obtener_look(self):
        id_look = self.client.post("/looks", json={
            "nombre": "Look 2", "id_prendas": [self.id_prenda_1],
        }, headers=self.headers).json()["id_look"]
        resp = self.client.get(f"/looks/{id_look}", headers=self.headers)
        assert resp.status_code == 200
        assert resp.json()["id_look"] == id_look

    def test_eliminar_look(self):
        id_look = self.client.post("/looks", json={
            "nombre": "Look 3", "id_prendas": [self.id_prenda_1],
        }, headers=self.headers).json()["id_look"]
        resp = self.client.delete(f"/looks/{id_look}", headers=self.headers)
        assert resp.status_code == 204
        resp2 = self.client.get(f"/looks/{id_look}", headers=self.headers)
        assert resp2.status_code == 404

    def test_generar_look_ia_devuelve_202(self):
        ia_response = {
            "nombre_look": "Casual Monday",
            "descripcion": "Combinación fresca y cómoda",
            "ids_prendas": [self.id_prenda_1, self.id_prenda_2],
        }
        with (
            patch("app.routers.looks.generate_look", return_value=ia_response),
            patch("app.routers.looks.download_blob_bytes", return_value=b"fake-img"),
            patch("app.routers.looks.virtual_tryon", return_value=b"fake-result"),
            patch("app.routers.looks.upload_prenda_image", return_value="tryon-result.jpg"),
        ):
            resp = self.client.post("/looks/generar", json={
                "prompt": "look para el trabajo cómodo",
                "id_armario": self.id_armario,
                "ocasion": "trabajo",
            }, headers=self.headers)

        assert resp.status_code == 202
        data = resp.json()
        assert "id_look" in data
        assert data["estado"] == "pendiente"

    def test_generar_look_ia_estado_polling(self):
        ia_response = {
            "nombre_look": "Look Final",
            "descripcion": "Look de prueba",
            "ids_prendas": [self.id_prenda_1],
        }
        with (
            patch("app.routers.looks.generate_look", return_value=ia_response),
            patch("app.routers.looks.download_blob_bytes", return_value=b"fake-img"),
            patch("app.routers.looks.virtual_tryon", return_value=b"fake-result"),
            patch("app.routers.looks.upload_prenda_image", return_value="tryon.jpg"),
        ):
            id_look = self.client.post("/looks/generar", json={
                "prompt": "look casual",
                "id_armario": self.id_armario,
            }, headers=self.headers).json()["id_look"]

            estado_resp = self.client.get(f"/looks/{id_look}/estado", headers=self.headers)

        assert estado_resp.status_code == 200
        data = estado_resp.json()
        assert data["id_look"] == id_look
        assert data["estado"] in ("pendiente", "generando", "listo", "error")

    def test_generar_look_ia_sin_prendas(self):
        id_armario_vacio = self.client.post(
            "/armarios", json={"nombre": "Armario Vacío"}, headers=self.headers
        ).json()["id_armario"]
        resp = self.client.post("/looks/generar", json={
            "prompt": "cualquier cosa",
            "id_armario": id_armario_vacio,
        }, headers=self.headers)
        assert resp.status_code == 422

    def test_look_con_prenda_inexistente(self):
        resp = self.client.post("/looks", json={
            "nombre": "Look Roto",
            "id_prendas": [99999],
        }, headers=self.headers)
        assert resp.status_code == 404

    def test_estado_look_no_encontrado(self):
        resp = self.client.get("/looks/99999/estado", headers=self.headers)
        assert resp.status_code == 404
