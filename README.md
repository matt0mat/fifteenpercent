# FifteenPercent Core

## Quick start
1) cp .env.example .env and fill OPENAI_API_KEY
2) docker compose -f infra/docker-compose.yml up --build
3) Open http://localhost:8000/health

## Next
Implement ingestion â†’ chunking â†’ embedding â†’ indexing.