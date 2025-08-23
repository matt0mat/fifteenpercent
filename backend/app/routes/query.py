# backend/app/routes/query.py
from __future__ import annotations

from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db.connection import get_conn
from ..services.embedder import embed_texts

router = APIRouter()


class QueryIn(BaseModel):
    tenant_id: str = Field(..., description="Tenant ID (required).")
    question: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=50)
    playground_id: Optional[str] = Field(
        None,
        description="If provided, restrict results to docs in this playground."
    )


@router.post("/", summary="Semantic query over ingested chunks")
def query(q: QueryIn) -> Dict[str, Any]:
    """
    MVP semantic search:
      1) embed the question
      2) vector search over chunk_vectors (filtered by tenant and optional playground)
      3) return top-k snippets + a simple stitched 'answer_md'

    This remains fully backwards-compatible with the previous behavior when
    `playground_id` is not sent by the client.
    """
    question = q.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Empty question")

    # 1) Embed the question
    try:
        qvec = embed_texts([question])[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"embedding_failed: {e}")

    # 2) Search the DB
    conn = get_conn()
    rows: List[tuple]
    try:
        with conn.cursor() as cur:
            if q.playground_id:
                # Filter to docs in the given playground.
                # This is written to be tolerant of schemas:
                # - chunk_vectors(cv) -> chunks(c) -> docs(d)
                # - we compute distance on cv.vec and order ASC (pgvector <=>)
                cur.execute(
                    """
                    SELECT
                      c.chunk_id,
                      d.doc_id,
                      d.filename,
                      COALESCE(c.page, 0) AS page,
                      c.text,
                      (cv.vec <=> %s::vector) AS distance
                    FROM chunk_vectors cv
                    JOIN chunks c ON c.chunk_id = cv.chunk_id
                    JOIN docs   d ON d.doc_id   = c.doc_id
                    WHERE cv.tenant_id = %s
                      AND d.playground_id = %s
                    ORDER BY cv.vec <=> %s::vector
                    LIMIT %s
                    """,
                    (qvec, q.tenant_id, q.playground_id, qvec, q.top_k),
                )
            else:
                # Original behavior (no playground filter).
                cur.execute(
                    """
                    SELECT
                      c.chunk_id,
                      d.doc_id,
                      d.filename,
                      COALESCE(c.page, 0) AS page,
                      c.text,
                      (cv.vec <=> %s::vector) AS distance
                    FROM chunk_vectors cv
                    JOIN chunks c ON c.chunk_id = cv.chunk_id
                    JOIN docs   d ON d.doc_id   = c.doc_id
                    WHERE cv.tenant_id = %s
                    ORDER BY cv.vec <=> %s::vector
                    LIMIT %s
                    """,
                    (qvec, q.tenant_id, qvec, q.top_k),
                )
            rows = cur.fetchall()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"db_query_failed: {e}")

    # 3) Shape snippets
    snippets: List[Dict[str, Any]] = [
        {
            "chunk_id": r[0],
            "doc_id": r[1],
            "filename": r[2],
            "page": int(r[3]) if r[3] is not None else 0,
            "preview": (r[4] or "")[:800],
            "distance": float(r[5]),
        }
        for r in rows
    ]

    # Very simple stitched "answer" (keeps prior behavior)
    if snippets:
        stitched = "\n\n".join(
            f"**{s['filename']} (p.{s['page']})**\n\n{s['preview']}"
            for s in snippets
        )
    else:
        stitched = "_no matches_"

    return {
        "answer_md": stitched,
        "snippets": snippets,
        "filters": {
            "tenant_id": q.tenant_id,
            "playground_id": q.playground_id,
            "top_k": q.top_k,
        },
    }
