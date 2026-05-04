import base64
import io
import json
import re

import httpx
from openai import AzureOpenAI, OpenAI

from app.config import settings


def _parse_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


_openai_client = OpenAI(
    api_key=settings.azure_openai_api_key,
    base_url=f"{settings.azure_openai_endpoint}/openai/v1",
)

# generate (POST /openai/v1/images/generations) — funciona con OpenAI SDK estándar
_image_client = OpenAI(
    api_key=settings.azure_image_api_key,
    base_url=f"{settings.azure_image_endpoint}/openai/v1",
)

# edit (POST /openai/deployments/{dep}/images/edits) — requiere AzureOpenAI SDK
_image_edit_client = AzureOpenAI(
    api_key=settings.azure_image_api_key,
    azure_endpoint=settings.azure_image_endpoint,
    azure_deployment=settings.azure_image_deployment,
    api_version="2025-04-01-preview",
)

# ── System prompts ────────────────────────────────────────────────────────────

_DESCRIBE_SYSTEM = """\
Eres un experto en moda y análisis visual de prendas de ropa.
Analiza la imagen y devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "descripcion": "descripción breve y precisa de la prenda (máx. 30 palabras)",
  "color_principal": "nombre del color dominante en español",
  "color_secundario": null,
  "estilo": "casual | formal | deportivo | elegante | otro",
  "temporada": "verano | invierno | entretiempo | todo_año"
}
Reglas:
- color_secundario es null si la prenda tiene un solo color o patrón uniforme.
- Si no puedes determinar un campo con certeza, usa null.
- No incluyas texto fuera del JSON.\
"""

_LOOK_SYSTEM = """\
Eres un estilista profesional. Tu trabajo es crear outfits armoniosos usando ÚNICAMENTE \
las prendas de la lista que recibes.
Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "nombre_look": "nombre creativo y corto del look",
  "descripcion": "por qué estas prendas combinan bien (máx. 40 palabras)",
  "ids_prendas": [id1, id2, ...]
}
Reglas estrictas:
- ids_prendas debe contener SOLO id_prenda que aparezcan en la lista recibida.
- Selecciona entre 2 y 5 prendas que formen un outfit completo y coherente.
- Prioriza la ocasión indicada por el usuario si se menciona.
- No repitas prendas del mismo tipo (ej. dos pantalones).
- No incluyas texto fuera del JSON.\
"""

_TRYON_PROMPT = """\
Virtual try-on: show the person in the first image wearing the clothing items from the other images.
Rules:
- Preserve the person's face, skin tone, body shape, height and pose EXACTLY.
- Replace only the clothing with the provided garments.
- Make the result photorealistic with natural lighting and shadows.
- Show the complete body from head to toe.\
"""

_AVATAR_PROMPT_TEMPLATE = """\
Create a cartoon-style profile avatar illustration of a person with this description: {descripcion}.
Style requirements:
- Flat design or semi-flat illustration style, similar to a modern app profile picture.
- Friendly, friendly caricature — stylized face, slightly exaggerated features, not photorealistic.
- Bust or head-and-shoulders framing (not full body).
- Clean solid-color or very simple gradient background (light pastel tone).
- Bright, cheerful colors. Suitable for a fashion app profile picture.
- No text, no watermarks.\
"""


# ── Chat y visión (Responses API) ────────────────────────────────────────────

def describe_prenda(image_bytes: bytes, content_type: str = "image/jpeg") -> dict:
    b64 = base64.b64encode(image_bytes).decode()
    data_url = f"data:{content_type};base64,{b64}"

    response = _openai_client.responses.create(
        model=settings.azure_openai_deployment_vision,
        instructions=_DESCRIBE_SYSTEM,
        input=[{
            "role": "user",
            "content": [{"type": "input_image", "image_url": data_url}],
        }],
        max_output_tokens=500,
    )
    raw = response.output_text or "{}"
    return _parse_json(raw)


def generate_look(prompt: str, prendas: list[dict]) -> dict:
    ids_validos = {p["id_prenda"] for p in prendas}
    prendas_text = json.dumps(prendas, ensure_ascii=False)
    user_msg = f"Petición del usuario: {prompt}\n\nPrendas disponibles:\n{prendas_text}"

    response = _openai_client.responses.create(
        model=settings.azure_openai_deployment_chat,
        instructions=_LOOK_SYSTEM,
        input=user_msg,
        max_output_tokens=800,
    )
    raw = response.output_text or "{}"
    resultado = _parse_json(raw)
    resultado["ids_prendas"] = [i for i in resultado.get("ids_prendas", []) if i in ids_validos]
    return resultado


# ── Generación de imágenes (gpt-image-2) ────────────────────────────────────

def virtual_tryon(person_bytes: bytes, prendas_bytes: list[bytes], descripcion_outfit: str) -> bytes:
    import time
    # Azure AI Foundry images/edits requiere deployment en la URL, no en el body
    url = (
        f"{settings.azure_image_endpoint}/openai/deployments/"
        f"{settings.azure_image_deployment}/images/edits"
        "?api-version=2025-04-01-preview"
    )
    files: list[tuple] = [("image[]", ("person.jpg", io.BytesIO(person_bytes), "image/jpeg"))]
    for i, pb in enumerate(prendas_bytes):
        files.append(("image[]", (f"prenda_{i}.jpg", io.BytesIO(pb), "image/jpeg")))

    for attempt in range(3):
        resp = httpx.post(
            url,
            headers={"api-key": settings.azure_image_api_key},
            files=files,
            data={"prompt": _TRYON_PROMPT, "n": "1", "size": "1024x1024"},
            timeout=httpx.Timeout(connect=30, read=600, write=120, pool=30),
        )
        if resp.status_code == 429:
            time.sleep(30 * (attempt + 1))
            # Reconstruir los ficheros tras leer los BytesIO
            files = [("image[]", ("person.jpg", io.BytesIO(person_bytes), "image/jpeg"))]
            for i, pb in enumerate(prendas_bytes):
                files.append(("image[]", (f"prenda_{i}.jpg", io.BytesIO(pb), "image/jpeg")))
            continue
        resp.raise_for_status()
        b64 = resp.json()["data"][0]["b64_json"]
        return base64.b64decode(b64)
    resp.raise_for_status()
    raise RuntimeError("virtual_tryon: demasiados reintentos por rate limit")


def generate_avatar(descripcion: str) -> bytes:
    prompt = _AVATAR_PROMPT_TEMPLATE.format(descripcion=descripcion)

    response = _image_client.images.generate(
        model=settings.azure_image_deployment,
        prompt=prompt,
        n=1,
        size="1024x1024",
    )
    b64 = response.data[0].b64_json
    return base64.b64decode(b64)
