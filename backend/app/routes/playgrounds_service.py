# backend/routes/playgrounds_service.py
from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

router = APIRouter()

# Where we persist playgrounds + their files (binds to container volume)
ROOT = Path(os.getenv("PLAYGROUNDS_ROOT", "/code/storage/playgrounds"))
ROOT.mkdir(parents=True, exist_ok=True)


# ---------- Models ----------

class PlaygroundCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = ""


class Playground(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""


class PlaygroundFile(BaseModel):
    filename: str
    size_bytes: int


# ---------- Helpers ----------

def _pg_dir(pg_id: str) -> Path:
    return ROOT / pg_id


def _slug(s: str) -> str:
    slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in s).strip("-")
    return "-".join([p for p in slug.split("-") if p]) or "pg"


# ---------- Routes ----------

@router.get("", response_model=List[Playground])
def list_playgrounds():
    out: List[Playground] = []
    for child in ROOT.glob("*"):
        if not child.is_dir():
            continue
        meta = child / "meta.txt"
        name = child.name
        desc = ""
        if meta.exists():
            try:
                txt = meta.read_text(encoding="utf-8").splitlines()
                if txt:
                    name = txt[0].strip() or name
                if len(txt) > 1:
                    desc = "\n".join(txt[1:]).strip()
            except Exception:
                pass
        out.append(Playground(id=child.name, name=name, description=desc))
    # Sort by name for stable UI
    out.sort(key=lambda p: p.name)
    return out


@router.post("", response_model=Playground, status_code=201)
def create_playground(body: PlaygroundCreate):
    # create id as slug + short uuid for uniqueness
    base = _slug(body.name)
    pg_id = f"{base}-{uuid.uuid4().hex[:6]}"
    d = _pg_dir(pg_id)
    d.mkdir(parents=True, exist_ok=False)
    (d / "files").mkdir(parents=True, exist_ok=True)

    # write simple meta
    (d / "meta.txt").write_text(
        f"{body.name}\n{body.description or ''}\n",
        encoding="utf-8"
    )

    return Playground(id=pg_id, name=body.name, description=body.description or "")


@router.delete("/{pg_id}", status_code=204)
def delete_playground(pg_id: str):
    d = _pg_dir(pg_id)
    if not d.exists():
        raise HTTPException(status_code=404, detail="playground_not_found")
    shutil.rmtree(d)
    return None


@router.get("/{pg_id}/files", response_model=List[PlaygroundFile])
def list_files(pg_id: str):
    d = _pg_dir(pg_id) / "files"
    if not d.exists():
        raise HTTPException(status_code=404, detail="playground_not_found")
    out: List[PlaygroundFile] = []
    for f in d.glob("*"):
        if f.is_file():
            out.append(PlaygroundFile(filename=f.name, size_bytes=f.stat().st_size))
    out.sort(key=lambda f: f.filename.lower())
    return out


@router.post("/{pg_id}/upload", response_model=PlaygroundFile)
async def upload_file(
    pg_id: str,
    file: UploadFile = File(...),                 # accepts *any* content-type
    label: Optional[str] = Form(default=None),    # optional extra form field
):
    d = _pg_dir(pg_id)
    files_dir = d / "files"
    if not d.exists() or not files_dir.exists():
        raise HTTPException(status_code=404, detail="playground_not_found")

    # Save the file as-is; name collisions receive a counter suffix
    target = files_dir / file.filename
    if target.exists():
        stem = target.stem
        suffix = target.suffix
        i = 2
        while True:
            alt = files_dir / f"{stem} ({i}){suffix}"
            if not alt.exists():
                target = alt
                break
            i += 1

    # stream to disk
    with target.open("wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    return PlaygroundFile(filename=target.name, size_bytes=target.stat().st_size)
