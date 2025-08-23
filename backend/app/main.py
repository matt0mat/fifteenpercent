# backend/app/main.py
from __future__ import annotations

import os
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Core routers (already in your repo) ---
# Expect these modules to live under backend/app/routes/
from .routes import health, ingest, query, verify, synth

# --- Optional: Playgrounds service router ---
# You said you renamed the module to services/playgrounds_service.py
# This import is tolerant: if the service isn't present yet, the app still boots.
try:
    from .services.playgrounds_service import router as playgrounds_router  # type: ignore
except Exception:  # pragma: no cover
    playgrounds_router = None  # type: ignore

APP_NAME = os.getenv("APP_NAME", "FifteenPercent Core API")
APP_VERSION = os.getenv("APP_VERSION", "0.0.1")

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ----------------------- CORS -----------------------
# Local dev origins; extend via env if you need.
_default_origins: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
extra_origins = os.getenv("CORS_EXTRA_ORIGINS", "")
if extra_origins:
    _default_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    allow_credentials=True,
    allow_methods=["*"],                # GET, POST, PUT, DELETE, OPTIONS…
    allow_headers=["*"],                # Accept any custom headers from the UI
    expose_headers=["Content-Disposition"],  # for file downloads if you add them
)

# --------------- Router registration ---------------
# Use consistent prefixes so both `/x` and `/x/` behave (FastAPI handles 307 internally).
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
app.include_router(query.router, prefix="/query", tags=["query"])
app.include_router(verify.router, prefix="/verify", tags=["verify"])
app.include_router(synth.router, prefix="/synth", tags=["synth"])

# Playgrounds (only if module exists)
if playgrounds_router:
    app.include_router(playgrounds_router, prefix="/playgrounds", tags=["playgrounds"])

# ---------------- Convenience routes ----------------
@app.get("/")
def root():
    return {
        "ok": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "routers": [
            "/health",
            "/ingest",
            "/query",
            "/verify",
            "/synth",
            "/playgrounds" if playgrounds_router else None,
        ],
    }
