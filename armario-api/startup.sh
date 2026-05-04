#!/bin/bash
set -e

# Instalar ODBC Driver 18 + headers de compilación si no están
if ! dpkg -s msodbcsql18 &>/dev/null; then
    curl -sSL https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
    curl -sSL https://packages.microsoft.com/config/ubuntu/22.04/prod.list > /etc/apt/sources.list.d/mssql-release.list
    apt-get update -qq
    ACCEPT_EULA=Y apt-get install -y msodbcsql18 unixodbc-dev -qq
fi

cd /home/site/wwwroot

# Instalar dependencias (pip usa caché, solo reinstala si hay cambios)
pip install -r requirements.txt --quiet --no-warn-script-location

# Arrancar la API
uvicorn app.main:app --host 0.0.0.0 --port 8000
