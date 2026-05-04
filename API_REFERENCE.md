# ArmarioDigital — API Reference para Frontend

## Base URL

```
http://localhost:8000
```

En producción, reemplazar por la URL del servidor Azure.

---

## Autenticación

Todos los endpoints protegidos requieren un **JWT Bearer Token** en la cabecera:

```http
Authorization: Bearer <access_token>
```

### Registro

```http
POST /auth/registro
Content-Type: application/json
```

```json
{
  "email": "usuario@email.com",
  "password": "MiPassword123!",
  "nombre": "Juan García"
}
```

**Respuesta 201:**
```json
{
  "id_usuario": 1,
  "email": "usuario@email.com",
  "nombre": "Juan García",
  "fecha_registro": "2026-04-28T10:00:00",
  "foto_cuerpo_url": null,
  "avatar_url": null,
  "tipo_usuario": "normal"
}
```

### Login

```http
POST /auth/login
Content-Type: application/x-www-form-urlencoded
```

```
username=usuario@email.com&password=MiPassword123!
```

**Respuesta 200:**
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

Guardar `access_token` y enviarlo en todas las peticiones como `Authorization: Bearer <token>`.

### Obtener perfil

```http
GET /auth/me
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "id_usuario": 1,
  "email": "usuario@email.com",
  "nombre": "Juan García",
  "fecha_registro": "2026-04-28T10:00:00",
  "foto_cuerpo_url": "uuid-archivo.jpg",
  "avatar_url": "uuid-avatar.jpg",
  "tipo_usuario": "normal"
}
```

> `foto_cuerpo_url` y `avatar_url` son **nombres de blob**, no URLs directas. Ver sección [URLs de imágenes](#urls-de-imágenes).

### Actualizar perfil

```http
PATCH /auth/me
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nombre": "Nuevo Nombre",
  "email": "nuevo@email.com",
  "tipo_usuario": "premium"
}
```

Todos los campos son opcionales. `tipo_usuario` acepta `"normal"` o `"premium"`.

---

## Foto de Cuerpo

Foto real de cuerpo completo. Usada para el virtual try-on al generar looks con IA.

### Subir foto de cuerpo

```http
POST /auth/me/foto-cuerpo
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Campo  | Tipo | Descripción                |
|--------|------|----------------------------|
| imagen | File | JPG, PNG o WebP. Máx 10 MB |

**Respuesta 200:** objeto `UsuarioOut` con `foto_cuerpo_url` actualizado.

### Obtener URL de la foto

```http
GET /auth/me/foto-cuerpo/url
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "url": "https://prendastorage.blob.core.windows.net/...?se=...&sig=..."
}
```

> Las URLs firmadas expiran en **1 hora**.

---

## Avatar

Imagen de perfil en estilo caricatura/ilustración generada por IA.

### Generar avatar

```http
POST /auth/me/avatar
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "descripcion": "hombre joven de cabello oscuro, piel morena, sonrisa amigable"
}
```

**Respuesta 200:** objeto `UsuarioOut` con `avatar_url` actualizado.

> La generación puede tardar **20–60 segundos**.

### Obtener URL del avatar

```http
GET /auth/me/avatar/url
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "url": "https://prendastorage.blob.core.windows.net/...?se=...&sig=..."
}
```

---

## Armarios

### Límites por plan

| Plan    | Máx. armarios |
|---------|---------------|
| normal  | 2             |
| premium | 25            |

### Crear armario

```http
POST /armarios
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nombre": "Ropa de verano",
  "descripcion": "Prendas para temporada cálida"
}
```

**Respuesta 201:**
```json
{
  "id_armario": 1,
  "id_usuario": 1,
  "nombre": "Ropa de verano",
  "descripcion": "Prendas para temporada cálida",
  "fecha_creacion": "2026-04-28T10:00:00"
}
```

**Error 403** si se alcanza el límite del plan.

### Listar armarios

```http
GET /armarios
Authorization: Bearer <token>
```

**Respuesta 200:** array de objetos `Armario`.

### Obtener armario

```http
GET /armarios/{id_armario}
Authorization: Bearer <token>
```

### Actualizar armario

```http
PATCH /armarios/{id_armario}
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nombre": "Nuevo nombre",
  "descripcion": "Nueva descripción"
}
```

### Eliminar armario

```http
DELETE /armarios/{id_armario}
Authorization: Bearer <token>
```

**Respuesta 204** (sin cuerpo).

---

## Prendas

### Límites por plan

| Plan    | Máx. prendas por armario |
|---------|--------------------------|
| normal  | 10                       |
| premium | 25                       |

### Subir prenda

```http
POST /prendas
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Campo            | Tipo   | Requerido | Descripción                       |
|------------------|--------|-----------|-----------------------------------|
| id_armario       | int    | ✅        | ID del armario destino            |
| nombre           | string | ✅        | Nombre de la prenda               |
| id_categoria     | int    | ✅        | ID de categoría                   |
| imagen           | File   | ✅        | JPG, PNG o WebP. Máx 10 MB        |
| color_principal  | string | ❌        | Si no se envía, lo detecta la IA  |
| color_secundario | string | ❌        |                                   |
| talla            | string | ❌        | "S", "M", "L", "XL", etc.        |
| marca            | string | ❌        |                                   |
| estilo           | string | ❌        |                                   |
| temporada        | string | ❌        |                                   |

**Respuesta 201:**
```json
{
  "id_prenda": 1,
  "id_armario": 1,
  "id_categoria": 2,
  "nombre": "Camiseta blanca",
  "color_principal": "blanco",
  "color_secundario": null,
  "talla": "M",
  "marca": null,
  "estilo": "casual",
  "temporada": "todo_año",
  "imagen_url": "uuid-prenda.jpg",
  "imagen_thumbnail": null,
  "descripcion_ia": "Camiseta blanca de manga corta, estilo casual y minimalista",
  "fecha_subida": "2026-04-28T10:00:00"
}
```

> La IA analiza la imagen automáticamente y rellena los campos vacíos (color, estilo, temporada, descripción).
> **Error 403** si se alcanza la capacidad máxima del armario.

### Listar prendas de un armario

```http
GET /prendas?id_armario={id_armario}
Authorization: Bearer <token>
```

**Respuesta 200:** array de objetos `Prenda`.

### Obtener prenda

```http
GET /prendas/{id_prenda}
Authorization: Bearer <token>
```

### Actualizar prenda

```http
PATCH /prendas/{id_prenda}
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nombre": "Nuevo nombre",
  "id_categoria": 3,
  "color_principal": "azul",
  "talla": "L"
}
```

Todos los campos son opcionales.

### Eliminar prenda

```http
DELETE /prendas/{id_prenda}
Authorization: Bearer <token>
```

**Respuesta 204.**

### Obtener URL de imagen de prenda

```http
GET /prendas/{id_prenda}/url-imagen
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "url": "https://prendastorage.blob.core.windows.net/...?se=...&sig=..."
}
```

---

## Looks

Los looks se pueden crear manualmente o generarlos con IA. Cuando se generan con IA y el usuario tiene `foto_cuerpo_url` configurada, se ejecuta automáticamente un **virtual try-on** y la imagen resultante queda en `imagen_generada_url`.

### Crear look manual

```http
POST /looks
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "nombre": "Look de lunes",
  "descripcion": "Outfit casual para oficina",
  "ocasion": "trabajo",
  "id_prendas": [1, 3, 7]
}
```

**Respuesta 201:**
```json
{
  "id_look": 1,
  "id_usuario": 1,
  "nombre": "Look de lunes",
  "descripcion": "Outfit casual para oficina",
  "ocasion": "trabajo",
  "prompt_usuario": null,
  "generado_ia": false,
  "estado": "listo",
  "error_mensaje": null,
  "imagen_generada_url": null,
  "fecha_creacion": "2026-04-28T10:00:00",
  "prendas": [
    {"id_prenda": 1, "orden": 0},
    {"id_prenda": 3, "orden": 1},
    {"id_prenda": 7, "orden": 2}
  ]
}
```

### Generar look con IA (async)

```http
POST /looks/generar
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "id_armario": 1,
  "prompt": "look elegante para una cena",
  "ocasion": "formal"
}
```

**Respuesta 202:**
```json
{
  "id_look": 5,
  "estado": "pendiente",
  "mensaje": "El look se está generando. Consulta el estado en GET /looks/{id_look}/estado"
}
```

> La generación es **asíncrona**. El cliente debe hacer polling del estado.

### Consultar estado de generación (polling)

```http
GET /looks/{id_look}/estado
Authorization: Bearer <token>
```

**Respuesta 200:**
```json
{
  "id_look": 5,
  "estado": "generando",
  "nombre": null,
  "imagen_generada_url": null,
  "error_mensaje": null
}
```

**Estados posibles:**

| Estado      | Significado                         |
|-------------|-------------------------------------|
| `pendiente` | En cola, esperando inicio           |
| `generando` | IA procesando                       |
| `listo`     | Completado con éxito                |
| `error`     | Falló — ver `error_mensaje`         |

**Flujo completo en JavaScript:**

```javascript
async function generarLook(token, idArmario, prompt) {
  // 1. Disparar generación
  const res = await fetch('/looks/generar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id_armario: idArmario, prompt }),
  });
  const { id_look } = await res.json();

  // 2. Polling hasta que termine
  while (true) {
    await new Promise(r => setTimeout(r, 5000)); // esperar 5s
    const estado = await fetch(`/looks/${id_look}/estado`, {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(r => r.json());

    if (estado.estado === 'listo') return estado; // imagen_generada_url disponible
    if (estado.estado === 'error') throw new Error(estado.error_mensaje);
  }
}
```

### Listar looks del usuario

```http
GET /looks
Authorization: Bearer <token>
```

**Respuesta 200:** array de objetos `Look`.

### Obtener look

```http
GET /looks/{id_look}
Authorization: Bearer <token>
```

### Eliminar look

```http
DELETE /looks/{id_look}
Authorization: Bearer <token>
```

**Respuesta 204.**

---

## URLs de Imágenes

Los campos `imagen_url`, `foto_cuerpo_url`, `avatar_url` e `imagen_generada_url` son **nombres de blob** (UUID + extensión), **no URLs directas**. Para mostrarlas en el frontend debes obtener una URL firmada:

| Campo del objeto           | Endpoint para URL firmada             |
|----------------------------|---------------------------------------|
| `foto_cuerpo_url`          | `GET /auth/me/foto-cuerpo/url`        |
| `avatar_url`               | `GET /auth/me/avatar/url`             |
| `prendas[].imagen_url`     | `GET /prendas/{id_prenda}/url-imagen` |
| `look.imagen_generada_url` | `GET /looks/{id_look}/url-imagen`     |

> Las URLs firmadas **expiran en 1 hora**. No las cachees indefinidamente; vuelve a pedirlas antes de mostrar.

---

## Planes

| Plan    | Armarios máx. | Prendas por armario máx. |
|---------|---------------|--------------------------|
| normal  | 2             | 10                       |
| premium | 25            | 25                       |

Para cambiar el plan del usuario autenticado:

```http
PATCH /auth/me
Authorization: Bearer <token>
Content-Type: application/json

{ "tipo_usuario": "premium" }
```

---

## Códigos de Error

| Código | Significado                                             |
|--------|---------------------------------------------------------|
| 400    | Petición malformada                                     |
| 401    | Token ausente o inválido                                |
| 403    | Sin permisos o límite de plan alcanzado                 |
| 404    | Recurso no encontrado                                   |
| 409    | Conflicto (ej: email ya registrado)                     |
| 413    | Imagen demasiado grande (> 10 MB)                       |
| 415    | Formato de imagen no soportado (solo JPG, PNG, WebP)    |
| 422    | Error de validación (campos incorrectos o faltantes)    |
| 502    | Error del servicio de IA (Azure OpenAI no disponible)   |

Todos los errores devuelven:
```json
{
  "detail": "Mensaje descriptivo del error"
}
```

---

## Tipos TypeScript

### Usuario
```typescript
interface Usuario {
  id_usuario: number;
  email: string;
  nombre: string;
  fecha_registro: string;        // ISO 8601
  foto_cuerpo_url: string | null; // blob name, no URL directa
  avatar_url: string | null;      // blob name, no URL directa
  tipo_usuario: "normal" | "premium";
}
```

### Armario
```typescript
interface Armario {
  id_armario: number;
  id_usuario: number;
  nombre: string;
  descripcion: string | null;
  fecha_creacion: string;
}
```

### Prenda
```typescript
interface Prenda {
  id_prenda: number;
  id_armario: number;
  id_categoria: number;
  nombre: string;
  color_principal: string | null;
  color_secundario: string | null;
  talla: string | null;
  marca: string | null;
  estilo: string | null;
  temporada: string | null;
  imagen_url: string;             // blob name, no URL directa
  imagen_thumbnail: string | null;
  descripcion_ia: string | null;
  fecha_subida: string;
}
```

### Look
```typescript
interface Look {
  id_look: number;
  id_usuario: number;
  nombre: string;
  descripcion: string | null;
  ocasion: string | null;
  prompt_usuario: string | null;
  generado_ia: boolean;
  estado: "pendiente" | "generando" | "listo" | "error";
  error_mensaje: string | null;
  imagen_generada_url: string | null; // blob name, no URL directa
  fecha_creacion: string;
  prendas: Array<{ id_prenda: number; orden: number }>;
}
```
