import pytest


def _crear(client, headers, nombre="Mi Armario", descripcion="Ropa de verano"):
    return client.post("/armarios", json={"nombre": nombre, "descripcion": descripcion}, headers=headers)


class TestArmarios:
    def test_crear_armario(self, client, auth_headers):
        resp = _crear(client, auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["nombre"] == "Mi Armario"
        assert "id_armario" in data

    def test_listar_armarios(self, client, auth_headers):
        _crear(client, auth_headers, nombre="Armario A")
        _crear(client, auth_headers, nombre="Armario B")
        resp = client.get("/armarios", headers=auth_headers)
        assert resp.status_code == 200
        nombres = [a["nombre"] for a in resp.json()]
        assert "Armario A" in nombres
        assert "Armario B" in nombres

    def test_obtener_armario(self, client, auth_headers):
        id_armario = _crear(client, auth_headers, nombre="Armario C").json()["id_armario"]
        resp = client.get(f"/armarios/{id_armario}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id_armario"] == id_armario

    def test_armario_no_encontrado(self, client, auth_headers):
        resp = client.get("/armarios/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_actualizar_armario(self, client, auth_headers):
        id_armario = _crear(client, auth_headers, nombre="Viejo").json()["id_armario"]
        resp = client.patch(f"/armarios/{id_armario}", json={"nombre": "Nuevo"}, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["nombre"] == "Nuevo"

    def test_eliminar_armario(self, client, auth_headers):
        id_armario = _crear(client, auth_headers).json()["id_armario"]
        resp = client.delete(f"/armarios/{id_armario}", headers=auth_headers)
        assert resp.status_code == 204
        resp2 = client.get(f"/armarios/{id_armario}", headers=auth_headers)
        assert resp2.status_code == 404

    def test_no_acceder_armario_ajeno(self, client):
        # Usuario 2 crea un armario
        client.post("/auth/registro", json={"email": "user2@x.com", "password": "Pass1234!", "nombre": "User2"})
        token2 = client.post("/auth/login", data={"username": "user2@x.com", "password": "Pass1234!"}).json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}
        id_armario = _crear(client, headers2, nombre="Armario Privado").json()["id_armario"]

        # Usuario 1 intenta accederlo
        client.post("/auth/registro", json={"email": "user1@x.com", "password": "Pass1234!", "nombre": "User1"})
        token1 = client.post("/auth/login", data={"username": "user1@x.com", "password": "Pass1234!"}).json()["access_token"]
        headers1 = {"Authorization": f"Bearer {token1}"}
        resp = client.get(f"/armarios/{id_armario}", headers=headers1)
        assert resp.status_code == 404

    def test_sin_autenticacion(self, client):
        resp = client.get("/armarios")
        assert resp.status_code == 401
