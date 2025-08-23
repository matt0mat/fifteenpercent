from typing import List, Dict

def chunk_text(full_text: str, tokens_per_chunk: int = 1000, overlap: int = 120) -> List[Dict]:
    # naive char-based proxy for tokens; good enough for MVP
    text = full_text
    chunks = []
    n = len(text)
    start = 0
    while start < n:
        end = min(start + tokens_per_chunk, n)
        chunk = text[start:end]
        if chunk.strip():
            chunks.append({
                "text": chunk,
                "char_start": start,
                "char_end": end,
            })
        if end == n:
            break
        start = max(0, end - overlap)
    return chunks
