# backend/routes/playgrounds.py
from __future__ import annotations

import os
import uuid
import json
import datetime as dt
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
import httpx

# Root folder for all playground data inside the container
DATA_ROOT = os.getenv("DATA_ROOT", "/data")

router = APIRouter()

# ---------- Models ----------

class PlaygroundCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    tenant_id: str = Field(..., min_length=1, max_length=80)

class Playground(BaseModel):
    id: str
    name: str
    tenant_id: str
    created_at: str

class PlaygroundList(BaseModel):
    items: List[Playground]

class PlaygroundQuery(BaseModel):
    question: str = Field(..., min_length=3)
    top_k: int = Field(5, ge=1, le=20)

class PlaygroundQueryResult(BaseModel):
    # mirror your existing /query response shape (keep it permissive)
    answer_md: Optional[str] = None
    snippets: Optional[list] = None
    raw: Optional[dict] = None


# ---------- Helpers ----------

def _pg_dir(pg_id: str) -> str:
    return os.path.join(DATA_ROOT, "playgrounds", pg_id)

def _pg_meta_path(pg_id: str) -> str:
    return os.path.join(_pg_dir(pg_id), "meta.json")

def _pg_docs_dir(pg_id: str) -> str:
    return os.path.join(_pg_dir(pg_id), "docs")

def _scoped_tenant_id(tenant_id: str, pg_id: str) -> str:
    # This is the key trick: keep all vectors/ingestion scoped per playground
    return f"{tenant_id}__pg__{pg_id}"

def _load_meta(pg_id: str) -> dict:
    p = _pg_meta_path(pg_id)
    if not os.path.exists(p):
        raise FileNotFoundError("playground meta not found")
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_meta(pg_id: str, meta: dict) -> None:
    os.makedirs(_pg_dir(pg_id), exist_ok=True)
    with open(_pg_meta_path(pg_id), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

def _list_all_playgrounds() -> List[Playground]:
    base = os.path.join(DATA_ROOT, "playgrounds")
    items: List[Playground] = []
    if not os.path.exists(base):
        return items
    for pg_id in os.listdir(base):
        try:
            meta = _load_meta(pg_id)
            items.append(Playground(**meta))
        except Exception:
            # skip any broken entries
            continue
    # newest first
    items.sort(key=lambda x: x.created_at, reverse=True)
    return items


# ---------- Routes ----------

@router.post("", response_model=Playground)
def create_playground(body: PlaygroundCreate) -> Playground:
    """
    Create a new playground "container" for documents & Q&A scope.
    """
    pg_id = uuid.uuid4().hex[:12]
    now = dt.datetime.utcnow().isoformat() + "Z"
    meta = {
        "id": pg_id,
        "name": body.name.strip(),
        "tenant_id": body.tenant_id.strip(),
        "created_at": now,
    }
    os.makedirs(_pg_docs_dir(pg_id), exist_ok=True)
    _save_meta(pg_id, meta)
    return Playground(**meta)


@router.get("", response_model=PlaygroundList)
def list_playgrounds() -> PlaygroundList:
    """
    List all playgrounds (lightweight — reads meta.json for each).
    """
    return PlaygroundList(items=_list_all_playgrounds())


@router.delete("/{pg_id}", response_model=dict)
def delete_playground(pg_id: str):
    """
    Delete a playground (files only). Does not wipe vector DB entries.
    """
    d = _pg_dir(pg_id)
    if not os.path.exists(d):
        raise HTTPException(status_code=404, detail="playground_not_found")
    # Remove files on disk
    for root, _, files in os.walk(d, topdown=False):
        for name in files:
            try:
                os.remove(os.path.join(root, name))
            except Exception:
                pass
        try:
            os.rmdir(root)
        except Exception:
            pass
    return {"ok": True, "id": pg_id}


@router.post("/{pg_id}/documents", response_model=dict)
async def upload_document(
    pg_id: str,
    file: UploadFile = File(...),
):
    """
    Upload a PDF into this playground AND forward it to the existing /ingest
    endpoint using a *scoped* tenant_id so it’s searchable at query time.
    """
    # Verify playground exists
    try:
        meta = _load_meta(pg_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="playground_not_found")

    docs_dir = _pg_docs_dir(pg_id)
    os.makedirs(docs_dir, exist_ok=True)

    # Persist original file
    safe_name = file.filename or "upload.pdf"
    dest_path = os.path.join(docs_dir, safe_name)
    with open(dest_path, "wb") as out:
        out.write(await file.read())

    # Forward to your existing /ingest API so vectors are created
    scoped_tenant = _scoped_tenant_id(meta["tenant_id"], pg_id)
    ingest_url = os.getenv("SELF_BASE_URL", "http://localhost:8000") + "/ingest"
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            # re-open file stream for forward
            with open(dest_path, "rb") as fwd:
                form = {
                    "tenant_id": (None, scoped_tenant),
                    "file": (safe_name, fwd, "application/pdf"),
                }
                r = await client.post(ingest_url, files=form)
                r.raise_for_status()
                payload = r.json()
    except Exception as e:
        # keep file, but surface failure
        raise HTTPException(status_code=502, detail=f"forward_ingest_failed: {e}") from e

    return {"ok": True, "playground_id": pg_id, "tenant_id": scoped_tenant, "ingest": payload}


@router.get("/{pg_id}/documents", response_model=dict)
def list_documents(pg_id: str):
    """
    Show raw files stored for this playground (for sanity/audits).
    """
    _ = _load_meta(pg_id)  # validate
    docs = []
    for name in sorted(os.listdir(_pg_docs_dir(pg_id))):
        docs.append({"filename": name})
    return {"items": docs}


@router.post("/{pg_id}/query", response_model=PlaygroundQueryResult)
async def query_playground(pg_id: str, body: PlaygroundQuery):
    """
    Ask a question across EVERYTHING ingested into this playground.
    Internally proxies to your existing /query with the scoped tenant_id.
    """
    try:
        meta = _load_meta(pg_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="playground_not_found")

    scoped_tenant = _scoped_tenant_id(meta["tenant_id"], pg_id)
    query_url = os.getenv("SELF_BASE_URL", "http://localhost:8000") + "/query"

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                query_url,
                json={"tenant_id": scoped_tenant, "question": body.question, "top_k": body.top_k},
                headers={"Content-Type": "application/json"},
            )
            r.raise_for_status()
            data = r.json()
            # make it flexible to whatever /query returns
            return PlaygroundQueryResult(
                answer_md=data.get("answer_md"),
                snippets=data.get("snippets"),
                raw=data,
            )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"forward_query_failed: {e}") from e
