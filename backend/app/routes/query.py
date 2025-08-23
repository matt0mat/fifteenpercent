from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

from ..db.connection import get_conn
from ..services.embedder import embed_texts

router = APIRouter()

class QueryIn(BaseModel):
    tenant_id: str
    question: str
    top_k: int | None = 5

@router.post("/")
def query(q: QueryIn) -> Dict[str, Any]:
    if not q.question.strip():
        raise HTTPException(400, "Empty question")

    # embed question
    qvec = embed_texts([q.question])[0]

    # search
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT
              c.chunk_id,
              c.doc_id,
              cv.filename,
              cv.page,
              c.text,
              (cv.vec <=> %s::vector) AS distance
            FROM chunk_vectors cv
            JOIN chunks c ON c.chunk_id = cv.chunk_id
            WHERE cv.tenant_id = %s
            ORDER BY cv.vec <=> %s::vector
            LIMIT %s
            """,
            (qvec, q.tenant_id, qvec, q.top_k or 5),
        )
        rows = cur.fetchall()

    snippets = [
        {
            "chunk_id": r[0],
            "doc_id": r[1],
            "filename": r[2],
            "page": r[3],
            "preview": (r[4] or "")[:400],
            "distance": float(r[5]),
        }
        for r in rows
    ]

    # naïve answer: concatenate top snippets (MVP)
    answer = "\n\n".join(s["preview"] for s in snippets) or "_no matches_"

    return {"answer_md": answer, "snippets": snippets}
