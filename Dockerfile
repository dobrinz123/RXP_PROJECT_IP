# Dockerfile single-container pentru deploy pe Render / cloud
# Combina backend (FastAPI) + frontend (static) + admin_ui (static) intr-un singur container.
# Pentru dezvoltare locala se foloseste backend/Dockerfile + nginx (vezi docker-compose.yml).

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ /app/

# Copy static assets (served by FastAPI when SERVE_STATIC=true)
COPY frontend/  /app/frontend/
COPY admin_ui/  /app/admin_ui/

RUN mkdir -p /app/uploads /app/invoices

# Render injects PORT env var; default 8000 for local testing
ENV PORT=8000
EXPOSE 8000

# Render single-container settings
ENV API_PREFIX=/api
ENV SERVE_STATIC=true
ENV APP_ROOT=/app

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
