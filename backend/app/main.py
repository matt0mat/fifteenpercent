# backend/app/main.py
from __future__ import annotations

import os
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# --- Core routers ---
from .routes import health, synth, workspaces

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
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# --------------- Router registration ---------------
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(synth.router, prefix="/synth", tags=["synth"])
app.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])

# ---------------- Convenience routes ----------------
@app.get("/")
def root():
    return {
        "ok": True,
        "service": APP_NAME,
        "version": APP_VERSION,
        "routers": [
            "/health",
            "/synth",
            "/workspaces",
        ],
    }