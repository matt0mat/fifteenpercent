# backend/app/services/documents_service.py
from __future__ import annotations

import logging
import uuid
import hashlib
import os
import fitz # PyMuPDF

from typing import Dict, Any, List, Optional
from psycopg.rows import dict_row

from backend.app.db.connection import get_conn

log = logging.getLogger("documents_service")

# --- Helpers ---

def _sha256_bytes(data: bytes) -> str:
    """
    Computes the SHA256 hash of a byte string.
    """
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()

# --- Public API ---

def create_document_and_version(
    workspace_id: uuid.UUID,
    title: str,
    file_bytes: bytes,
    file_kind: str,
) -> Optional[Dict[str, Any]]:
    """
    Creates a new document record and an initial version.
    """
    doc_id = str(uuid.uuid4())
    version_id = str(uuid.uuid4())
    file_hash = _sha256_bytes(file_bytes)

    # TODO: Implement file storage to disk (e.g., S3/local)
    # This is a placeholder for saving the file, we can discuss the path later
    file_path = os.path.join("/tmp", f"{version_id}__{doc_id}")
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    
    # Extract text and page count using PyMuPDF (fitz)
    try:
        pdf = fitz.open(stream=file_bytes, filetype="pdf")
        pages_json = [{"page_no": i, "text": page.get_text("text")} for i, page in enumerate(pdf, 1)]
        page_count = len(pages_json)
        pdf.close()
    except Exception as e:
        log.error("Failed to extract text from PDF: %s", e)
        pages_json = []
        page_count = 0

    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Insert into documents table
                doc_sql = """
                INSERT INTO documents (id, playground_id, title, kind, latest_version_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, title, created_at
                """
                cur.execute(doc_sql, (doc_id, str(workspace_id), title, file_kind, version_id))
                document = cur.fetchone()

                # Insert into document_versions table
                version_sql = """
                INSERT INTO document_versions (id, document_id, sha256, bytes_url, pages_json)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id, document_id, created_at
                """
                cur.execute(version_sql, (version_id, doc_id, file_hash, file_path, pages_json))
                version = cur.fetchone()
                
                # Update latest_version_id
                update_sql = "UPDATE documents SET latest_version_id = %s WHERE id = %s"
                cur.execute(update_sql, (version_id, doc_id))

                log.info("Document %s created with version %s", doc_id, version_id)
                return {"document": document, "version": version}

    except Exception as e:
        log.error("Failed to insert document and version into DB: %s", e)
        # TODO: Handle cleanup of the saved file if DB insert fails
        return None

def find_document_by_id(doc_id: uuid.UUID) -> Optional[Dict[str, Any]]:
    """
    Finds a document by its ID.
    """
    sql = """
    SELECT id, playground_id, title, kind, created_at
    FROM documents
    WHERE id = %s
    """
    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, (str(doc_id),))
                return cur.fetchone()
    except Exception as e:
        log.error("Failed to find document %s: %s", doc_id, e)
        return None


def rechunk_document_version(
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    chunk_size: int,
    overlap: int,
) -> Optional[Dict[str, Any]]:
    """
    Re-chunks a specific document version.
    """
    log.info("Rechunking document %s version %s", document_id, version_id)

    try:
        with get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # TODO: Retrieve pages_json from document_versions table
                # TODO: Implement logic to chunk the text and create embeddings
                # TODO: Insert new chunks into the chunks table
                # TODO: Delete old chunks for this document version
                pass
        return {"status": "ok", "message": "Rechunking job enqueued."}
    except Exception as e:
        log.error("Failed to rechunk document %s: %s", document_id, e)
        return None

def add_event(
    workspace_id: uuid.UUID,
    event_kind: str,
    actor: str,
    payload: Optional[Dict] = None,
) -> None:
    """
    Adds an event to the audit trail.
    """
    sql = """
    INSERT INTO events (playground_id, kind, actor, payload)
    VALUES (%s, %s, %s, %s)
    """
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (str(workspace_id), event_kind, actor, payload))
    except Exception as e:
        log.error("Failed to add event for workspace %s: %s", workspace_id, e)