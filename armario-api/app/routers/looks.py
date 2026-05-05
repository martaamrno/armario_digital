from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.ai_service import generate_look, virtual_tryon
from app.auth import get_current_user
from app.blob_storage import download_blob_bytes, upload_prenda_image, get_signed_url
from app.database import get_db
from app.models import Armario, Look, LookPrenda, Prenda, Usuario
from app.schemas import (
    LookCreate, LookEstadoOut, LookGenerarRequest, LookGenerarResponse, LookOut,
)

router = APIRouter(prefix="/looks", tags=["Looks"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_prenda_owned(db: Session, id_prenda: int, usuario: Usuario) -> Prenda:
    prenda = db.get(Prenda, id_prenda)
    if not prenda:
        raise HTTPException(status_code=404, detail=f"Prenda {id_prenda} no encontrada")
    armario = db.get(Armario, prenda.id_armario)
    if not armario or armario.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=403, detail=f"Prenda {id_prenda} no pertenece al usuario")
    return prenda


# ── Tarea background: selección IA + virtual try-on ──────────────────────────

def _task_generar_look(
    id_look: int,
    prompt: str,
    id_armario: int,
    id_usuario: int,
    id_prendas_filtro: list[int] | None = None,
):
    import app.database as _app_db

    db = _app_db.SessionLocal()
    try:
        look = db.get(Look, id_look)
        look.estado = "generando"
        db.commit()

        # 1. Cargar prendas del armario (o solo las seleccionadas)
        q = db.query(Prenda).filter(Prenda.id_armario == id_armario)
        if id_prendas_filtro:
            q = q.filter(Prenda.id_prenda.in_(id_prendas_filtro))
        prendas = q.all()
        prendas_payload = [
            {
                "id_prenda": p.id_prenda,
                "nombre": p.nombre,
                "descripcion_ia": p.descripcion_ia or p.nombre,
                "estilo": p.estilo,
                "temporada": p.temporada,
            }
            for p in prendas
        ]

        # 2. GPT-4o elige las prendas
        resultado = generate_look(prompt, prendas_payload)
        ids_seleccionados: list[int] = resultado.get("ids_prendas", [])
        if not ids_seleccionados:
            raise ValueError("La IA no seleccionó prendas válidas")

        look.nombre = resultado.get("nombre_look", "Look generado")
        look.descripcion = resultado.get("descripcion")

        ids_set = set(ids_seleccionados)
        for orden, id_prenda in enumerate(ids_seleccionados):
            db.add(LookPrenda(id_look=id_look, id_prenda=id_prenda, orden=orden))
        db.commit()

        # 3. Virtual try-on solo si el usuario subió foto de cuerpo real
        usuario = db.get(Usuario, id_usuario)
        foto_blob = usuario.foto_cuerpo_url

        if foto_blob:
            prendas_elegidas = [p for p in prendas if p.id_prenda in ids_set]
            person_bytes = download_blob_bytes(foto_blob)

            # Comprimir imágenes antes de enviar para reducir tiempo de subida
            def _compress(raw: bytes, max_px: int = 512) -> bytes:
                try:
                    from PIL import Image
                    import io as _io
                    img = Image.open(_io.BytesIO(raw)).convert("RGB")
                    img.thumbnail((max_px, max_px))
                    buf = _io.BytesIO()
                    img.save(buf, format="JPEG", quality=80)
                    return buf.getvalue()
                except Exception:
                    return raw  # fallback sin PIL

            person_bytes = _compress(person_bytes, max_px=768)

            # Enviar solo 1 prenda al try-on (la principal) para reducir tiempo de procesamiento
            prendas_bytes: list[bytes] = []
            for p in prendas_elegidas[:1]:
                try:
                    raw = download_blob_bytes(p.imagen_url)
                    prendas_bytes.append(_compress(raw, max_px=512))
                except Exception:
                    pass

            if prendas_bytes:
                descripcion_outfit = look.descripcion or "outfit seleccionado"
                imagen_bytes = virtual_tryon(person_bytes, prendas_bytes, descripcion_outfit)
                blob_name = upload_prenda_image(imagen_bytes, "image/jpeg", "jpg")
                look.imagen_generada_url = blob_name

        look.estado = "listo"
        db.commit()

    except Exception as exc:
        try:
            db.rollback()
            look = db.get(Look, id_look)
            if look:
                look.estado = "error"
                look.error_mensaje = str(exc)[:500]
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", response_model=LookOut, status_code=status.HTTP_201_CREATED)
def crear_look(body: LookCreate, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    look = Look(
        id_usuario=usuario.id_usuario,
        nombre=body.nombre,
        descripcion=body.descripcion,
        ocasion=body.ocasion,
        generado_ia=False,
        estado="listo",
    )
    db.add(look)
    db.flush()

    for orden, id_prenda in enumerate(body.id_prendas):
        _get_prenda_owned(db, id_prenda, usuario)
        db.add(LookPrenda(id_look=look.id_look, id_prenda=id_prenda, orden=orden))

    db.commit()
    db.refresh(look)
    return look


@router.post("/generar", response_model=LookGenerarResponse, status_code=status.HTTP_202_ACCEPTED)
def generar_look_ia(
    body: LookGenerarRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    armario = db.get(Armario, body.id_armario)
    if not armario or armario.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Armario no encontrado")

    prendas = db.query(Prenda).filter(Prenda.id_armario == body.id_armario).all()
    if not prendas:
        raise HTTPException(status_code=422, detail="El armario no tiene prendas")

    look = Look(
        id_usuario=usuario.id_usuario,
        nombre="Generando look…",
        ocasion=body.ocasion,
        prompt_usuario=body.prompt,
        generado_ia=True,
        estado="pendiente",
    )
    db.add(look)
    db.commit()
    db.refresh(look)

    background_tasks.add_task(
        _task_generar_look,
        look.id_look,
        body.prompt,
        body.id_armario,
        usuario.id_usuario,
        body.id_prendas,
    )

    return LookGenerarResponse(
        id_look=look.id_look,
        estado="pendiente",
        mensaje="El look se está generando. Consulta el estado en GET /looks/{id_look}/estado",
    )


@router.get("/{id_look}/url-imagen")
def url_imagen_look(id_look: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    look = db.get(Look, id_look)
    if not look or look.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Look no encontrado")
    if not look.imagen_generada_url:
        raise HTTPException(status_code=404, detail="Este look no tiene imagen generada")
    return {"url": get_signed_url(look.imagen_generada_url)}


@router.get("/{id_look}/estado", response_model=LookEstadoOut)
def estado_look(id_look: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    look = db.get(Look, id_look)
    if not look or look.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Look no encontrado")
    return look


@router.get("", response_model=list[LookOut])
def listar_looks(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return db.query(Look).filter(Look.id_usuario == usuario.id_usuario).all()


@router.get("/{id_look}", response_model=LookOut)
def obtener_look(id_look: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    look = db.get(Look, id_look)
    if not look or look.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Look no encontrado")
    return look


@router.delete("/{id_look}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_look(id_look: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    look = db.get(Look, id_look)
    if not look or look.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Look no encontrado")
    db.delete(look)
    db.commit()
