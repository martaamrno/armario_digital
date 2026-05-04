from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine, get_db
from app.routers import armarios, looks, prendas, usuarios, stripe
from app.models import Categoria
from app.schemas import CategoriaOut
from fastapi import Depends
from sqlalchemy.orm import Session


def _run_migrations():
    with engine.connect() as conn:
        conn.execute(text("""
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns
                WHERE object_id = OBJECT_ID('Usuarios') AND name = 'avatar_estado'
            )
            BEGIN
                ALTER TABLE Usuarios ADD avatar_estado NVARCHAR(20) NOT NULL DEFAULT 'listo'
            END
        """))
        conn.commit()


app = FastAPI(
    title="Armario Digital API",
    version="1.0.0",
    description="API para gestionar tu armario virtual con IA",
)

@app.on_event("startup")
def startup():
    try:
        _run_migrations()
    except Exception:
        pass  # SQLite en tests no tiene sys.columns


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(armarios.router)
app.include_router(prendas.router)
app.include_router(looks.router)
app.include_router(stripe.router)


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "app": "Armario Digital API"}


@app.get("/categorias", response_model=list[CategoriaOut], tags=["Categorias"])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(Categoria).all()
