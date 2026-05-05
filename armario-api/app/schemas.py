from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# ── Usuarios ──────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str
    nombre: str


class UsuarioOut(BaseModel):
    id_usuario: int
    email: EmailStr
    nombre: str
    fecha_registro: datetime
    foto_perfil_url: Optional[str] = None
    foto_cuerpo_url: Optional[str] = None
    avatar_url: Optional[str] = None
    avatar_estado: str = "listo"
    tipo_usuario: str = "normal"

    model_config = {"from_attributes": True}


class AvatarEstadoOut(BaseModel):
    avatar_estado: str
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    email: Optional[EmailStr] = None
    tipo_usuario: Optional[str] = None


class AvatarGenerarRequest(BaseModel):
    descripcion: str


class PasswordChangeRequest(BaseModel):
    password_actual: str
    password_nueva: str


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    id_usuario: int


# ── Armarios ──────────────────────────────────────────────────────────────────

class ArmarioCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class ArmarioOut(BaseModel):
    id_armario: int
    id_usuario: int
    nombre: str
    descripcion: Optional[str]
    fecha_creacion: datetime

    model_config = {"from_attributes": True}


class ArmarioUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None


# ── Categorias ────────────────────────────────────────────────────────────────

class CategoriaOut(BaseModel):
    id_categoria: int
    nombre: str
    tipo: str

    model_config = {"from_attributes": True}


# ── Prendas ───────────────────────────────────────────────────────────────────

class PrendaCreate(BaseModel):
    id_armario: int
    id_categoria: int
    nombre: str
    color_principal: Optional[str] = None
    color_secundario: Optional[str] = None
    talla: Optional[str] = None
    marca: Optional[str] = None
    estilo: Optional[str] = None
    temporada: Optional[str] = None


class PrendaOut(BaseModel):
    id_prenda: int
    id_armario: int
    id_categoria: int
    nombre: str
    color_principal: Optional[str]
    color_secundario: Optional[str]
    talla: Optional[str]
    marca: Optional[str]
    estilo: Optional[str]
    temporada: Optional[str]
    imagen_url: str
    imagen_thumbnail: Optional[str]
    descripcion_ia: Optional[str]
    fecha_subida: datetime

    model_config = {"from_attributes": True}


class PrendaUpdate(BaseModel):
    nombre: Optional[str] = None
    id_categoria: Optional[int] = None
    color_principal: Optional[str] = None
    color_secundario: Optional[str] = None
    talla: Optional[str] = None
    marca: Optional[str] = None
    estilo: Optional[str] = None
    temporada: Optional[str] = None


# ── Looks ─────────────────────────────────────────────────────────────────────

class LookCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    ocasion: Optional[str] = None
    id_prendas: list[int]


class LookGenerarRequest(BaseModel):
    prompt: str
    id_armario: int
    ocasion: Optional[str] = None
    id_prendas: Optional[list[int]] = None  # None = usar todas las del armario


class LookPrendaOut(BaseModel):
    id_prenda: int
    orden: int

    model_config = {"from_attributes": True}


class LookOut(BaseModel):
    id_look: int
    id_usuario: int
    nombre: str
    descripcion: Optional[str]
    ocasion: Optional[str]
    prompt_usuario: Optional[str]
    generado_ia: bool
    estado: str
    error_mensaje: Optional[str] = None
    imagen_generada_url: Optional[str] = None
    fecha_creacion: datetime
    prendas: list[LookPrendaOut] = []

    model_config = {"from_attributes": True}


class LookGenerarResponse(BaseModel):
    id_look: int
    estado: str
    mensaje: str


class LookEstadoOut(BaseModel):
    id_look: int
    estado: str
    nombre: Optional[str] = None
    imagen_generada_url: Optional[str] = None
    error_mensaje: Optional[str] = None

    model_config = {"from_attributes": True}
