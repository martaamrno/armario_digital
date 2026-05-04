from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.ai_service import describe_prenda
from app.auth import get_current_user
from app.blob_storage import delete_blob, get_signed_url, upload_prenda_image
from app.database import get_db, SessionLocal
from app.models import Armario, Prenda, Usuario
from app.schemas import PrendaOut, PrendaUpdate

router = APIRouter(prefix="/prendas", tags=["Prendas"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE_MB = 10

_LIMITE_PRENDAS = {"normal": 10, "premium": 25}


def _check_armario_owner(db: Session, id_armario: int, usuario: Usuario) -> Armario:
    armario = db.get(Armario, id_armario)
    if not armario or armario.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Armario no encontrado")
    return armario


def procesar_prenda_ia(id_prenda: int, image_bytes: bytes, content_type: str):
    db = SessionLocal()
    try:
        ia_data = describe_prenda(image_bytes, content_type)
        prenda = db.get(Prenda, id_prenda)
        if prenda:
            if not prenda.color_principal and ia_data.get("color_principal"): prenda.color_principal = ia_data.get("color_principal")
            if not prenda.color_secundario and ia_data.get("color_secundario"): prenda.color_secundario = ia_data.get("color_secundario")
            if not prenda.estilo and ia_data.get("estilo"): prenda.estilo = ia_data.get("estilo")
            if not prenda.temporada and ia_data.get("temporada"): prenda.temporada = ia_data.get("temporada")
            prenda.descripcion_ia = ia_data.get("descripcion")
            db.commit()
    except Exception as e:
        print(f"Error procesando prenda IA: {e}")
    finally:
        db.close()


@router.post("", response_model=PrendaOut, status_code=status.HTTP_201_CREATED)
async def crear_prenda(
    background_tasks: BackgroundTasks,
    id_armario: int = Form(...),
    id_categoria: int = Form(...),
    nombre: str = Form(...),
    color_principal: Optional[str] = Form(None),
    color_secundario: Optional[str] = Form(None),
    talla: Optional[str] = Form(None),
    marca: Optional[str] = Form(None),
    estilo: Optional[str] = Form(None),
    temporada: Optional[str] = Form(None),
    imagen: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    armario = _check_armario_owner(db, id_armario, usuario)

    limite = _LIMITE_PRENDAS.get(usuario.tipo_usuario, 10)
    total = db.query(Prenda).filter(Prenda.id_armario == id_armario).count()
    if total >= limite:
        raise HTTPException(
            status_code=403,
            detail=f"Plan {usuario.tipo_usuario}: capacidad máxima de {limite} prenda(s) por armario alcanzada",
        )

    if imagen.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Formato de imagen no soportado")

    image_bytes = await imagen.read()
    if len(image_bytes) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Imagen mayor a {MAX_SIZE_MB} MB")

    ext = imagen.filename.rsplit(".", 1)[-1] if imagen.filename else "jpg"
    blob_name = upload_prenda_image(image_bytes, imagen.content_type, ext)

    prenda = Prenda(
        id_armario=id_armario,
        id_categoria=id_categoria,
        nombre=nombre,
        color_principal=color_principal,
        color_secundario=color_secundario,
        talla=talla,
        marca=marca,
        estilo=estilo,
        temporada=temporada,
        imagen_url=blob_name,
        descripcion_ia="Procesando con IA...",
    )
    db.add(prenda)
    db.commit()
    db.refresh(prenda)
    
    background_tasks.add_task(procesar_prenda_ia, prenda.id_prenda, image_bytes, imagen.content_type)
    return prenda


@router.get("", response_model=list[PrendaOut])
def listar_prendas(
    id_armario: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    _check_armario_owner(db, id_armario, usuario)
    return db.query(Prenda).filter(Prenda.id_armario == id_armario).all()


@router.get("/{id_prenda}", response_model=PrendaOut)
def obtener_prenda(id_prenda: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    prenda = db.get(Prenda, id_prenda)
    if not prenda:
        raise HTTPException(status_code=404, detail="Prenda no encontrada")
    _check_armario_owner(db, prenda.id_armario, usuario)
    return prenda


@router.get("/{id_prenda}/url-imagen")
def url_imagen(id_prenda: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    prenda = db.get(Prenda, id_prenda)
    if not prenda:
        raise HTTPException(status_code=404, detail="Prenda no encontrada")
    _check_armario_owner(db, prenda.id_armario, usuario)
    return {"url": get_signed_url(prenda.imagen_url)}


@router.patch("/{id_prenda}", response_model=PrendaOut)
def actualizar_prenda(
    id_prenda: int,
    body: PrendaUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    prenda = db.get(Prenda, id_prenda)
    if not prenda:
        raise HTTPException(status_code=404, detail="Prenda no encontrada")
    _check_armario_owner(db, prenda.id_armario, usuario)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(prenda, field, value)
    db.commit()
    db.refresh(prenda)
    return prenda


@router.delete("/{id_prenda}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_prenda(id_prenda: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    prenda = db.get(Prenda, id_prenda)
    if not prenda:
        raise HTTPException(status_code=404, detail="Prenda no encontrada")
    _check_armario_owner(db, prenda.id_armario, usuario)
    try:
        delete_blob(prenda.imagen_url)
    except Exception:
        pass
    db.delete(prenda)
    db.commit()
