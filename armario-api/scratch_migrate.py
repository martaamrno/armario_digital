from sqlalchemy import create_engine, text
from app.config import settings

def migrate():
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        print("Añadiendo columna 'foto_perfil_url' a la tabla 'Usuarios'...")
        try:
            conn.execute(text("ALTER TABLE Usuarios ADD foto_perfil_url VARCHAR(500) NULL"))
            conn.commit()
            print("Migración completada con éxito.")
        except Exception as e:
            if "already exists" in str(e).lower() or "Duplicate column" in str(e) or "2705" in str(e):
                print("La columna ya existe. No se requiere acción.")
            else:
                print(f"Error en la migración: {e}")

if __name__ == "__main__":
    migrate()
