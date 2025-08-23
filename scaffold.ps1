# scaffold.ps1
$ErrorActionPreference = "Stop"

# Folders
$dirs = @(
  "backend/app/routes",
  "backend/app/services",
  "backend/app/db",
  "backend/tests",
  "infra/postgres",
  "docs"
)
$dirs | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

# Files (path -> content)
$files = @{
  ".gitignore" = @"
# python
__pycache__/
*.pyc
.venv/
# docker
*.log
# misc
.env
"@
  "requirements.txt" = @"
fastapi==0.112.0
uvicorn[standard]==0.30.0
pydantic==2.8.2
psycopg[binary]==3.2.1
sqlalchemy==2.0.32
pgvector==0.3.5
python-multipart==0.0.9
"@
  "Dockerfile" = @"
FROM python:3.11-slim
WORKDIR /code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
ENV PYTHONPATH=/code
"@
  "infra/docker-compose.yml" = @"
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: fifteen
      POSTGRES_PASSWORD: fifteen
      POSTGRES_DB: fp_core
    ports: ["5432:5432"]
    volumes:
      - dbdata:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
  backend:
    build:
      context: ..
      dockerfile: Dockerfile
    env_file: ../.env
    depends_on: [db]
    ports: ["8000:8000"]
    command: uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
volumes:
  dbdata:
"@
  "infra/postgres/init.sql" = @"
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
  doc_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  page_count INT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  tags JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE chunks (
  chunk_id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  page_start INT,
  page_end INT,
  char_span int4range,
  token_len INT,
  text TEXT NOT NULL
);

-- adjust dim later to your embedding model
CREATE TABLE chunk_vectors (
  chunk_id TEXT PRIMARY KEY REFERENCES chunks(chunk_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  page INT,
  vec vector(3072)
);

CREATE INDEX IF NOT EXISTS idx_chunk_vectors_hnsw
ON chunk_vectors USING hnsw (vec vector_cosine_ops);
"@
  ".env.example" = @"
APP_ENV=dev
DATABASE_URL=postgresql+psycopg://fifteen:fifteen@db:5432/fp_core
EMBED_PROVIDER=openai
OPENAI_API_KEY=sk-REPLACE
"@
  "backend/app/main.py" = @"
from fastapi import FastAPI
from .routes import health

app = FastAPI(title="FifteenPercent Core API", version="0.0.1")
app.include_router(health.router, prefix="/health", tags=["health"])
"@
  "backend/app/routes/health.py" = @"
from fastapi import APIRouter
router = APIRouter()

@router.get('/')
def health():
    return {'status': 'ok'}
"@
  "docs/design-notes.md" = @"
# FifteenPercent — RAG Engine MVP (Design Notes)
(Placeholder) Paste the full design doc here.
"@
  "README.md" = @"
# FifteenPercent Core

## Quick start
1) `cp .env.example .env` and fill OPENAI_API_KEY
2) `docker compose -f infra/docker-compose.yml up --build`
3) Open http://localhost:8000/health

## Next
Implement ingestion → chunking → embedding → indexing.
"@
  "Makefile" = @"
up:
	docker compose -f infra/docker-compose.yml up --build
down:
	docker compose -f infra/docker-compose.yml down -v
logs:
	docker compose -f infra/docker-compose.yml logs -f backend
"@
}

$files.GetEnumerator() | ForEach-Object {
  $path = $_.Key
  $content = $_.Value -replace "`r?`n", "`r`n"
  Set-Content -Path $path -Value $content -NoNewline -Encoding UTF8
}

# Git init (optional)
if (-not (Test-Path ".git")) {
  git init | Out-Null
  git add .
  git commit -m "init scaffold" | Out-Null
}

Write-Host "Scaffold complete."
