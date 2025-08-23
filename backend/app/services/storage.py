import os, hashlib, uuid, time
from typing import Tuple
import fitz  # PyMuPDF

DATA_DIR = os.getenv("DATA_DIR", "/code/data")
os.makedirs(DATA_DIR, exist_ok=True)

def _sha256_file(fp) -> str:
    h = hashlib.sha256()
    fp.seek(0)
    for chunk in iter(lambda: fp.read(1 << 20), b""):
        h.update(chunk)
    fp.seek(0)
    return h.hexdigest()

def save_and_extract_pdf(file_bytes: bytes, filename: str) -> Tuple[str, int, str]:
    # persist file to disk (versioning by uuid)
    doc_id = f"d_{uuid.uuid4().hex}"
    disk_path = os.path.join(DATA_DIR, f"{doc_id}__{filename}")
    with open(disk_path, "wb") as f:
        f.write(file_bytes)

    # hash
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # extract text and page_count
    pdf = fitz.open(stream=file_bytes, filetype="pdf")
    pages = pdf.page_count
    texts = []
    for i in range(pages):
        page = pdf.load_page(i)
        texts.append(page.get_text("text"))
    pdf.close()
    full_text = "\f".join(texts)  # keep page breaks as form-feed

    return file_hash, pages, full_text
