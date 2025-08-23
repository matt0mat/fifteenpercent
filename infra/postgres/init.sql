CREATE EXTENSION IF NOT EXISTS vector;

-- tenants
CREATE TABLE tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- documents
CREATE TABLE documents (
  doc_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  page_count INT DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  tags JSONB DEFAULT '{}'::jsonb
);

-- chunks
CREATE TABLE chunks (
  chunk_id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  page_start INT,
  page_end INT,
  char_span int4range,
  token_len INT,
  text TEXT NOT NULL
);

-- vectors (1536 dims to satisfy pgvector HNSW <= 2000)
CREATE TABLE chunk_vectors (
  chunk_id TEXT PRIMARY KEY REFERENCES chunks(chunk_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  page INT,
  vec vector(1536)
);

-- HNSW index over cosine distance
CREATE INDEX IF NOT EXISTS idx_chunk_vectors_hnsw
ON chunk_vectors USING hnsw (vec vector_cosine_ops);
