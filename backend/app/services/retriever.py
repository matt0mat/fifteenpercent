import os
from typing import List, Tuple
import psycopg
from pgvector.psycopg import register_vector
from openai import OpenAI

EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
DATABASE_URL = os.getenv("DATABASE_URL")

def embed_query(q: str) -> List[float]:
    return client.embeddings.create(model=EMBED_MODEL, input=[q]).data[0].embedding

def top_k(tenant_id: str, query_vec: List[float], k: int = 8) -> List[Tuple]:
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT chunk_id, doc_id, filename, page, text, (vec <=> %s::vector) AS distance
                FROM chunk_vectors
                JOIN chunks USING (chunk_id)
                WHERE tenant_id = %s
                ORDER BY vec <=> %s::vector
                LIMIT %s
                """,
                (query_vec, tenant_id, query_vec, k),
            )
            return cur.fetchall()
