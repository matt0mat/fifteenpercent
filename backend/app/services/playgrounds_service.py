# backend/services/playgrounds_service.py
from __future__ import annotations

import os
import shutil
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional

# NOTE: This is a minimal filesystem-based service so we don't
# have to touch your DB schema right now. Each playground gets
# a folder under /code/storage/{tenant_id}/playgrounds/{playground_id}

STORAGE_ROOT = os.getenv("STORAGE_ROOT", "/code/storage")


@dataclass
class Playground:
    id: str
    tenant_id: str
    name: str
    description: str = ""

    def to_dict(self):
        return asdict(self)


class PlaygroundsService:
    """
    Very lightweight in-memory index + filesystem folders.
    Persisted assets live on disk; the index is rebuilt
    from folders whenever list() is called.
    """

    def __init__(self, storage_root: str = STORAGE_ROOT):
        self.storage_root = storage_root
        os.makedirs(self.storage_root, exist_ok=True)

    def _tenant_dir(self, tenant_id: str) -> str:
        return os.path.join(self.storage_root, tenant_id)

    def _pg_dir(self, tenant_id: str, pg_id: str) -> str:
        return os.path.join(self._tenant_dir(tenant_id), "playgrounds", pg_id)

    def list(self, tenant_id: str) -> List[Playground]:
        base = os.path.join(self._tenant_dir(tenant_id), "playgrounds")
        if not os.path.isdir(base):
            return []
        items: List[Playground] = []
        for pg_id in sorted(os.listdir(base)):
            d = os.path.join(base, pg_id)
            if not os.path.isdir(d):
                continue
            meta_path = os.path.join(d, "_meta.txt")
            name, desc = pg_id, ""
            if os.path.isfile(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        name = f.readline().strip() or pg_id
                        desc = f.read().strip()
                except Exception:
                    pass
            items.append(Playground(id=pg_id, tenant_id=tenant_id, name=name, description=desc))
        return items

    def get(self, tenant_id: str, pg_id: str) -> Optional[Playground]:
        d = self._pg_dir(tenant_id, pg_id)
        if not os.path.isdir(d):
            return None
        meta_path = os.path.join(d, "_meta.txt")
        name, desc = pg_id, ""
        if os.path.isfile(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    name = f.readline().strip() or pg_id
                    desc = f.read().strip()
            except Exception:
                pass
        return Playground(id=pg_id, tenant_id=tenant_id, name=name, description=desc)

    def create(self, tenant_id: str, pg_id: str, name: str, description: str = "") -> Playground:
        d = self._pg_dir(tenant_id, pg_id)
        os.makedirs(d, exist_ok=True)
        meta_path = os.path.join(d, "_meta.txt")
        with open(meta_path, "w", encoding="utf-8") as f:
            f.write((name or pg_id).strip() + "\n")
            if description:
                f.write(description.strip())
        assets = os.path.join(d, "assets")
        os.makedirs(assets, exist_ok=True)
        chunks = os.path.join(d, "chunks")
        os.makedirs(chunks, exist_ok=True)
        return Playground(id=pg_id, tenant_id=tenant_id, name=name or pg_id, description=description or "")

    def delete(self, tenant_id: str, pg_id: str) -> bool:
        d = self._pg_dir(tenant_id, pg_id)
        if not os.path.isdir(d):
            return False
        shutil.rmtree(d, ignore_errors=True)
        return True

    def resolve_assets_dir(self, tenant_id: str, pg_id: str) -> str:
        d = self._pg_dir(tenant_id, pg_id)
        assets = os.path.join(d, "assets")
        os.makedirs(assets, exist_ok=True)
        return assets

    def resolve_chunks_dir(self, tenant_id: str, pg_id: str) -> str:
        d = self._pg_dir(tenant_id, pg_id)
        chunks = os.path.join(d, "chunks")
        os.makedirs(chunks, exist_ok=True)
        return chunks
