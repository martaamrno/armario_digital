from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Armario, Usuario
from app.schemas import ArmarioCreate, ArmarioOut, ArmarioUpdate

router = APIRouter(prefix="/armarios", tags=["Armarios"])

_LIMITE_ARMARIOS = {"normal": 2, "premium": 25}


@router.post("", response_model=ArmarioOut, status_code=status.HTTP_201_CREATED)
def crear_armario(body: ArmarioCreate, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    limite = _LIMITE_ARMARIOS.get(usuario.tipo_usuario, 2)
    total = db.query(Armario).filter(Armario.id_usuario == usuario.id_usuario).count()
    if total >= limite:
        raise HTTPException(
            status_code=403,
            detail=f"Plan {usuario.tipo_usuario}: límite de {limite} armario(s) alcanzado",
        )
    armario = Armario(id_usuario=usuario.id_usuario, **body.model_dump())
    db.add(armario)
    db.commit()
    db.refresh(armario)
    return armario


@router.get("", response_model=list[ArmarioOut])
def listar_armarios(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return db.query(Armario).filter(Armario.id_usuario == usuario.id_usuario).all()


@router.get("/{id_armario}", response_model=ArmarioOut)
def obtener_armario(id_armario: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    armario = db.get(Armario, id_armario)
    if not armario or armario.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Armario no encontrado")
    return armario


@router.patch("/{id_armario}", response_model=ArmarioOut)
def actualizar_armario(
    id_armario: int,
    body: ArmarioUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    armario = db.get(Armario, id_armario)
    if not armario or armario.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Armario no encontrado")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(armario, field, value)
    db.commit()
    db.refresh(armario)
    return armario


@router.delete("/{id_armario}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_armario(id_armario: int, db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    armario = db.get(Armario, id_armario)
    if not armario or armario.id_usuario != usuario.id_usuario:
        raise HTTPException(status_code=404, detail="Armario no encontrado")
    db.delete(armario)
    db.commit()
