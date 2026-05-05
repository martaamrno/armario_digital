# OutfitLab — Armario Digital con IA

OutfitLab es una aplicación web full-stack que te permite digitalizar tu armario, organizar tus prendas y generar outfits con inteligencia artificial. Incluye Virtual Try-On, avatar personalizado por IA y un sistema de suscripción Premium.

---

## Características principales

- **Gestión de armarios y prendas** — Crea múltiples armarios, sube fotos de tus prendas y clasifícalas por categoría.
- **Generación de outfits con IA** — Recibe sugerencias de looks combinando tus prendas mediante GPT-4o Vision.
- **Virtual Try-On** — Sube tu foto y mira cómo te quedaría cada outfit generado por IA (Premium).
- **Avatar personalizado** — Genera un avatar digital a tu imagen con gpt-image-2 (Premium).
- **Planes Normal y Premium** — Límites distintos por plan; pago integrado con Stripe.
- **Correo de bienvenida** — Email automático al registrarse vía SMTP/Gmail.
- **Autenticación JWT** — Registro, login, cambio de contraseña y gestión del perfil.

---

## Stack tecnológico

### Backend
| Tecnología | Uso |
|---|---|
| **FastAPI** | Framework REST |
| **SQLAlchemy** + Azure SQL | ORM y base de datos |
| **Azure Blob Storage** | Almacenamiento de imágenes |
| **Azure OpenAI (GPT-4o)** | Chat de outfits y visión |
| **Azure OpenAI (gpt-image-2)** | Virtual Try-On y avatar |
| **Stripe** | Pagos y suscripciones |
| **passlib / bcrypt** | Hash de contraseñas |
| **python-jose** | Tokens JWT |
| **SMTP / Gmail** | Correos transaccionales |

### Frontend
| Tecnología | Uso |
|---|---|
| **React 19** + Vite | SPA |
| **Tailwind CSS 3** | Estilos |
| **React Router v7** | Navegación |
| **Stripe.js** + React Stripe | Checkout de pago |
| **Lucide React** | Iconografía |

---

## Estructura del proyecto

```
armario_digital/
├── armario-api/          # Backend FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── ai_service.py
│   │   ├── blob_storage.py
│   │   ├── email_service.py
│   │   ├── config.py
│   │   └── routers/
│   │       ├── usuarios.py
│   │       ├── armarios.py
│   │       ├── prendas.py
│   │       ├── looks.py
│   │       └── stripe.py
│   ├── tests/
│   ├── requirements.txt
│   ├── requirements-test.txt
│   ├── .env.example
│   └── run.py
└── armario-frontend/     # Frontend React + Vite
    ├── src/
    │   ├── components/
    │   │   ├── Dashboard.jsx
    │   │   ├── Profile.jsx
    │   │   ├── OutfitGenerator.jsx
    │   │   ├── PremiumPlans.jsx
    │   │   ├── Register.jsx
    │   │   └── Toast.jsx
    │   ├── api.js
    │   ├── App.jsx
    │   └── index.css
    ├── tailwind.config.js
    └── vite.config.js
```

---

## Configuración local

### 1. Clonar el repositorio

```bash
git clone https://github.com/martaamrno/armario_digital.git
cd armario_digital
```

### 2. Backend

```bash
cd armario-api
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Rellena las variables con tus credenciales
uvicorn app.main:app --reload
```

La API estará disponible en `http://localhost:8000`.  
Documentación interactiva: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd armario-frontend
npm install
npm run dev
```

La app estará disponible en `http://localhost:5173`.

---

## Variables de entorno

Copia `armario-api/.env.example` a `armario-api/.env` y rellena los valores:

```env
# Base de datos
DATABASE_URL=mssql+pymssql://usuario:password@servidor.database.windows.net/nombre_db

# JWT
SECRET_KEY=tu_clave_secreta
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Azure Blob Storage
AZURE_STORAGE_ACCOUNT_NAME=...
AZURE_STORAGE_ACCOUNT_KEY=...
AZURE_STORAGE_CONTAINER_NAME=...

# Azure OpenAI (chat + visión)
AZURE_OPENAI_ENDPOINT=https://<recurso>.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_API_VERSION=2024-12-01-preview
AZURE_OPENAI_DEPLOYMENT_CHAT=...
AZURE_OPENAI_DEPLOYMENT_VISION=...

# Azure OpenAI (imágenes)
AZURE_IMAGE_ENDPOINT=https://<recurso-imagen>.openai.azure.com
AZURE_IMAGE_API_KEY=...
AZURE_IMAGE_DEPLOYMENT=...

# Stripe
STRIPE_API_KEY=sk_test_...

# Email (Gmail)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucorreo@gmail.com
SMTP_PASSWORD=tu_app_password
```

> **Nota:** El archivo `.env` está en `.gitignore` y nunca se sube al repositorio.

---

## Tests

```bash
cd armario-api
pip install -r requirements-test.txt
pytest tests/
```

Los tests usan SQLite en memoria y no requieren conexión a Azure.

---

## Planes disponibles

| | Normal | Premium |
|---|---|---|
| Armarios | Hasta 2 | Hasta 25 |
| Prendas por armario | Hasta 10 | Hasta 25 |
| Generación de looks (IA) | ✅ | ✅ |
| Virtual Try-On | ❌ | ✅ |
| Avatar personalizado IA | ❌ | ✅ |
| Precio | Gratis | 9.99 €/mes |

---

## Licencia

Este proyecto es de uso privado / académico.
