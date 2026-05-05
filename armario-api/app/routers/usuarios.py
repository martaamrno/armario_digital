from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.ai_service import generate_avatar
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.blob_storage import delete_blob, get_signed_url, upload_prenda_image
from app.database import get_db
from app.models import Usuario
from app.schemas import (
    AvatarEstadoOut, AvatarGenerarRequest, Token, UsuarioCreate, UsuarioOut, UsuarioUpdate,
    PasswordChangeRequest
)

router = APIRouter(prefix="/auth", tags=["Usuarios"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("/registro", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def registro(body: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == body.email).first():
        raise HTTPException(status_code=409, detail="Email ya registrado")
    usuario = Usuario(
        email=body.email,
        password_hash=hash_password(body.password),
        nombre=body.nombre,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    
    # Enviar email de bienvenida (mock)
    send_welcome_email(usuario.email, usuario.nombre)
    
    return usuario


def send_welcome_email(email: str, nombre: str):
    print(f"\n[{email}] === EMAIL DE BIENVENIDA ENVIADO ===")
    print(f"Asunto: ¡Bienvenido/a a Armario Digital, {nombre}!")
    print(f"Cuerpo: Hola {nombre}, gracias por registrarte. ¡Esperamos que disfrutes organizando tu armario!")
    print("===========================================\n")


@router.post("/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == form.username).first()
    if not usuario or not verify_password(form.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    usuario.ultimo_login = datetime.now(timezone.utc)
    db.commit()
    token = create_access_token({"sub": str(usuario.id_usuario)})
    return {"access_token": token}


@router.get("/me", response_model=UsuarioOut)
def me(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.patch("/me", response_model=UsuarioOut)
def update_me(body: UsuarioUpdate, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    if body.nombre is not None:
        usuario.nombre = body.nombre
    if body.email is not None:
        if db.query(Usuario).filter(Usuario.email == body.email, Usuario.id_usuario != usuario.id_usuario).first():
            raise HTTPException(status_code=409, detail="Email ya en uso")
        usuario.email = body.email
    if body.tipo_usuario is not None:
        if body.tipo_usuario not in ("normal", "premium"):
            raise HTTPException(status_code=422, detail="tipo_usuario debe ser 'normal' o 'premium'")
        usuario.tipo_usuario = body.tipo_usuario
    db.commit()
    db.refresh(usuario)
    return usuario


# ── Foto de cuerpo completo ───────────────────────────────────────────────────

@router.post("/me/foto-cuerpo", response_model=UsuarioOut)
async def subir_foto_cuerpo(
    imagen: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if imagen.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Formato de imagen no soportado")

    image_bytes = await imagen.read()
    ext = imagen.filename.rsplit(".", 1)[-1] if imagen.filename else "jpg"

    if usuario.foto_cuerpo_url:
        try:
            delete_blob(usuario.foto_cuerpo_url)
        except Exception:
            pass

    blob_name = upload_prenda_image(image_bytes, imagen.content_type, ext)
    usuario.foto_cuerpo_url = blob_name
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/me/foto-cuerpo/url")
def url_foto_cuerpo(usuario: Usuario = Depends(get_current_user)):
    if not usuario.foto_cuerpo_url:
        raise HTTPException(status_code=404, detail="No tienes foto de cuerpo subida")
    return {"url": get_signed_url(usuario.foto_cuerpo_url)}


@router.post("/me/foto-perfil", response_model=UsuarioOut)
async def subir_foto_perfil(
    imagen: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if imagen.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Formato de imagen no soportado")

    image_bytes = await imagen.read()
    ext = imagen.filename.rsplit(".", 1)[-1] if imagen.filename else "jpg"

    if usuario.foto_perfil_url:
        try:
            delete_blob(usuario.foto_perfil_url)
        except Exception:
            pass

    blob_name = upload_prenda_image(image_bytes, imagen.content_type, ext)
    usuario.foto_perfil_url = blob_name
    db.commit()
    db.refresh(usuario)
    return usuario


@router.get("/me/foto-perfil/url")
def url_foto_perfil(usuario: Usuario = Depends(get_current_user)):
    if not usuario.foto_perfil_url:
        raise HTTPException(status_code=404, detail="No tienes foto de perfil subida")
    return {"url": get_signed_url(usuario.foto_perfil_url)}


@router.post("/me/password")
def cambiar_password(
    body: PasswordChangeRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user)
):
    if not verify_password(body.password_actual, usuario.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    
    if len(body.password_nueva) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    usuario.password_hash = hash_password(body.password_nueva)
    db.commit()
    return {"mensaje": "Contraseña actualizada exitosamente"}


# ── Avatar generado por IA ────────────────────────────────────────────────────

def _task_generar_avatar(id_usuario: int, descripcion: str):
    import app.database as _app_db

    db = _app_db.SessionLocal()
    try:
        usuario = db.get(Usuario, id_usuario)
        usuario.avatar_estado = "generando"
        db.commit()

        imagen_bytes = generate_avatar(descripcion)

        if usuario.avatar_url:
            try:
                delete_blob(usuario.avatar_url)
            except Exception:
                pass

        blob_name = upload_prenda_image(imagen_bytes, "image/jpeg", "jpg")
        usuario.avatar_url = blob_name
        usuario.avatar_estado = "listo"
        db.commit()

    except Exception as exc:
        try:
            db.rollback()
            usuario = db.get(Usuario, id_usuario)
            if usuario:
                usuario.avatar_estado = "error"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


@router.post("/me/avatar", status_code=status.HTTP_202_ACCEPTED)
def generar_avatar(
    body: AvatarGenerarRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    usuario.avatar_estado = "pendiente"
    db.commit()

    background_tasks.add_task(_task_generar_avatar, usuario.id_usuario, body.descripcion)

    return {"avatar_estado": "pendiente", "mensaje": "El avatar se está generando. Consulta el estado en GET /auth/me/avatar/estado"}


@router.get("/me/avatar/estado", response_model=AvatarEstadoOut)
def estado_avatar(usuario: Usuario = Depends(get_current_user)):
    return usuario


@router.get("/me/avatar/url")
def url_avatar(usuario: Usuario = Depends(get_current_user)):
    if not usuario.avatar_url:
        raise HTTPException(status_code=404, detail="No tienes avatar generado")
    return {"url": get_signed_url(usuario.avatar_url)}


@router.post("/me/avatar-como-perfil", response_model=UsuarioOut)
def avatar_como_perfil(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if not usuario.avatar_url:
        raise HTTPException(status_code=404, detail="No tienes avatar generado")
    if usuario.foto_perfil_url and usuario.foto_perfil_url != usuario.avatar_url:
        try:
            delete_blob(usuario.foto_perfil_url)
        except Exception:
            pass
    usuario.foto_perfil_url = usuario.avatar_url
    db.commit()
    db.refresh(usuario)
    return usuario
