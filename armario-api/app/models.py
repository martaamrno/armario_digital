from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, DateTime, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Usuario(Base):
    __tablename__ = "Usuarios"

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.sysutcdatetime())
    ultimo_login: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    foto_perfil_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    foto_cuerpo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    avatar_estado: Mapped[str] = mapped_column(String(20), nullable=False, default="listo", server_default="listo")
    tipo_usuario: Mapped[str] = mapped_column(String(10), nullable=False, default="normal", server_default="normal")

    armarios: Mapped[list["Armario"]] = relationship("Armario", back_populates="usuario", cascade="all, delete-orphan")
    looks: Mapped[list["Look"]] = relationship("Look", back_populates="usuario", cascade="all, delete-orphan")


class Armario(Base):
    __tablename__ = "Armarios"

    id_armario: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(Integer, ForeignKey("Usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.sysutcdatetime())

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="armarios")
    prendas: Mapped[list["Prenda"]] = relationship("Prenda", back_populates="armario", cascade="all, delete-orphan")


class Categoria(Base):
    __tablename__ = "Categorias"

    id_categoria: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)

    prendas: Mapped[list["Prenda"]] = relationship("Prenda", back_populates="categoria")


class Prenda(Base):
    __tablename__ = "Prendas"

    id_prenda: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_armario: Mapped[int] = mapped_column(Integer, ForeignKey("Armarios.id_armario", ondelete="CASCADE"), nullable=False)
    id_categoria: Mapped[int] = mapped_column(Integer, ForeignKey("Categorias.id_categoria"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    color_principal: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    color_secundario: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    talla: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    marca: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    estilo: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    temporada: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    imagen_url: Mapped[str] = mapped_column(String(500), nullable=False)
    imagen_thumbnail: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    descripcion_ia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fecha_subida: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.sysutcdatetime())

    armario: Mapped["Armario"] = relationship("Armario", back_populates="prendas")
    categoria: Mapped["Categoria"] = relationship("Categoria", back_populates="prendas")
    looks: Mapped[list["LookPrenda"]] = relationship("LookPrenda", back_populates="prenda")


class Look(Base):
    __tablename__ = "Looks"

    id_look: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(Integer, ForeignKey("Usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ocasion: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    prompt_usuario: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generado_ia: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="listo", server_default="listo")
    error_mensaje: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    imagen_generada_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.sysutcdatetime())

    usuario: Mapped["Usuario"] = relationship("Usuario", back_populates="looks")
    prendas: Mapped[list["LookPrenda"]] = relationship("LookPrenda", back_populates="look", cascade="all, delete-orphan")


class LookPrenda(Base):
    __tablename__ = "Look_Prendas"

    id_look: Mapped[int] = mapped_column(Integer, ForeignKey("Looks.id_look", ondelete="CASCADE"), primary_key=True)
    id_prenda: Mapped[int] = mapped_column(Integer, ForeignKey("Prendas.id_prenda"), primary_key=True)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    look: Mapped["Look"] = relationship("Look", back_populates="prendas")
    prenda: Mapped["Prenda"] = relationship("Prenda", back_populates="looks")

class Pago(Base):
    __tablename__ = "Pagos"
    id_pago: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(Integer, ForeignKey("Usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    stripe_payment_id: Mapped[str] = mapped_column(String(100), nullable=False)
    monto: Mapped[int] = mapped_column(Integer, nullable=False) # centimos
    fecha: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, server_default=func.sysutcdatetime())

