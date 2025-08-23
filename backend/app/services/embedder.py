import os
from typing import List
from openai import OpenAI

_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")  # 1536-d
_API_KEY = os.getenv("OPENAI_API_KEY")

_client = OpenAI(api_key=_API_KEY)

def embed_texts(texts: List[str]) -> List[List[float]]:
    # OpenAI API accepts up to ~2048 inputs depending on limits; we’ll send in one batch for MVP
    resp = _client.embeddings.create(model=_MODEL, input=texts)
    # order preserved
    return [d.embedding for d in resp.data]
