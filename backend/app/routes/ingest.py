# backend/routes/ingest.py
from __future__ import annotations

import io
import os
import uuid
from typing import Optional, Tuple, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

# If you already had PDF libs, keep using them. We guard imports so we don't crash.
try:
    import PyPDF2  # type: ignore
except Exception:
    PyPDF2 = None  # noqa: N816

from ..services.playgrounds_service import PlaygroundsService

router = APIRouter()
pg_svc = PlaygroundsService()


class IngestResponse(BaseModel):
    tenant_id: str
    playground_id: Optional[str] = None
    filename: str
    chunks: int
    content_type: str


# ---------- simple chunking helpers (format-agnostic) ----------

def _normalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").strip()


def _split_into_chunks(text: str, max_chars: int = 1200, overlap: int = 100) -> List[str]:
    """
    Naive by-char chunker that works for any text. Keeps overlap for recall.
    """
    text = _normalize_text(text)
    if not text:
        return []

    if len(text) <= max_chars:
        return [text]

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunk = text[start:end]
        chunks.append(chunk)
        if end == len(text):
            break
        start = max(0, end - overlap)
    return chunks


def _read_pdf_bytes_to_text(data: bytes) -> str:
    if not PyPDF2:
        raise HTTPException(status_code=415, detail="pdf_support_missing: install PyPDF2")
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(data))
        pages = []
        for p in reader.pages:
            try:
                pages.append(p.extract_text() or "")
            except Exception:
                pages.append("")
        return "\n\n".join(pages).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"pdf_parse_failed: {e}")


# ---------- main endpoint ----------

@router.post("/", response_model=IngestResponse)
async def ingest(
    tenant_id: str = Form(...),
    file: UploadFile = File(...),
    playground_id: Optional[str] = Form(None),
):
    """
    Accepts PDF, TXT, MD, JSON (stringified), and generic text/*.
    Optional playground_id groups the asset under /storage/{tenant}/playgrounds/{pg}/assets.
    """
    # Read file bytes
    try:
        data = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"read_failed: {e}")

    content_type = (file.content_type or "").lower()
    fname = file.filename or f"upload-{uuid.uuid4().hex}"

    # Decide where to store the original asset (filesystem)
    if playground_id:
        assets_dir = pg_svc.resolve_assets_dir(tenant_id, playground_id)
    else:
        # fall back to a generic per-tenant bucket
        assets_dir = os.path.join(pg_svc._tenant_dir(tenant_id), "uploads")
        os.makedirs(assets_dir, exist_ok=True)

    # Save original
    safe_name = fname.replace("/", "_").replace("\\", "_")
    dest_path = os.path.join(assets_dir, safe_name)
    with open(dest_path, "wb") as f:
        f.write(data)

    # Extract text (format-aware)
    text = ""
    if content_type.startswith("text/") or safe_name.lower().endswith((".txt", ".md", ".csv", ".log")):
        try:
            text = data.decode("utf-8", errors="ignore")
        except Exception:
            text = data.decode("latin-1", errors="ignore")

    elif safe_name.lower().endswith(".json") or content_type.endswith("/json"):
        try:
            # keep raw json as text for now (you can pretty-print or flatten later)
            text = data.decode("utf-8", errors="ignore")
        except Exception:
            text = data.decode("latin-1", errors="ignore")

    elif safe_name.lower().endswith(".pdf") or content_type == "application/pdf":
        text = _read_pdf_bytes_to_text(data)

    else:
        # Unknown binary (docx, pptx, images, etc). We keep asset; you can extend later.
        # To expand: add python-docx, python-pptx, textract, tika, or Unstructured.
        raise HTTPException(
            status_code=415,
            detail="unsupported_type: try pdf/txt/md/json for now (we saved the raw asset)."
        )

    # Chunk
    chunks = _split_into_chunks(text, max_chars=1200, overlap=120)

    # OPTIONAL: If you already have a vector upsert pipeline, call it here.
    # Example (pseudo):
    #
    # from ..services.index_service import upsert_chunks
    # doc_id = uuid.uuid4().hex
    # upsert_chunks(
    #     tenant_id=tenant_id,
    #     playground_id=playground_id,
    #     doc_id=doc_id,
    #     source_filename=safe_name,
    #     chunks=chunks,   # list[str]
    # )

    # Also save chunks to filesystem for transparency/audit (one file per chunk)
    if playground_id:
        base = pg_svc.resolve_chunks_dir(tenant_id, playground_id)
    else:
        base = os.path.join(pg_svc._tenant_dir(tenant_id), "chunks")
        os.makedirs(base, exist_ok=True)

    doc_folder = os.path.join(base, uuid.uuid4().hex[:12])
    os.makedirs(doc_folder, exist_ok=True)
    for i, c in enumerate(chunks, start=1):
        with open(os.path.join(doc_folder, f"chunk_{i:04d}.txt"), "w", encoding="utf-8") as f:
            f.write(c)

    return IngestResponse(
        tenant_id=tenant_id,
        playground_id=playground_id,
        filename=safe_name,
        chunks=len(chunks),
        content_type=content_type or "unknown",
    )
