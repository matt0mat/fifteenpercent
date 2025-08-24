# backend/app/routes/__init__.py
from . import health, ingest, query, verify, synth, playgrounds
__all__ = ["health", "ingest", "query", "verify", "synth", "playgrounds"]