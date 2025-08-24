from alembic import op

# revision identifiers, used by Alembic.
revision = "001_initial_core"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.execute("""
    CREATE EXTENSION IF NOT EXISTS vector;

    CREATE TABLE IF NOT EXISTS tenants (
      tenant_id   TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS documents (
      doc_id      TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      filename    TEXT NOT NULL,
      mime        TEXT NOT NULL,
      file_hash   TEXT NOT NULL,
      page_count  INT  DEFAULT 0,
      uploaded_at TIMESTAMPTZ DEFAULT now(),
      tags        JSONB DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS chunks (
      chunk_id    TEXT PRIMARY KEY,
      doc_id      TEXT NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
      tenant_id   TEXT NOT NULL,
      page_start  INT,
      page_end    INT,
      char_span   int4range,
      token_len   INT,
      text        TEXT NOT NULL
    );

    -- 1536 dims matches text-embedding-3-small
    CREATE TABLE IF NOT EXISTS chunk_vectors (
      chunk_id  TEXT PRIMARY KEY REFERENCES chunks(chunk_id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      doc_id    TEXT NOT NULL,
      filename  TEXT NOT NULL,
      page      INT,
      vec       vector(1536)
    );

    CREATE INDEX IF NOT EXISTS idx_chunk_vectors_hnsw
      ON chunk_vectors USING hnsw (vec vector_cosine_ops);

    -- Playgrounds: query scopes independent of documents
    CREATE TABLE IF NOT EXISTS playgrounds (
      pg_id      TEXT PRIMARY KEY,
      tenant_id  TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Many-to-many: which docs are visible in a playground
    CREATE TABLE IF NOT EXISTS playground_docs (
      pg_id   TEXT NOT NULL REFERENCES playgrounds(pg_id) ON DELETE CASCADE,
      doc_id  TEXT NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
      PRIMARY KEY (pg_id, doc_id)
    );

    -- Synth documents (optional persistence)
    CREATE TABLE IF NOT EXISTS synth_docs (
      synth_id    TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
      topic       TEXT NOT NULL,
      outline     JSONB NOT NULL,
      content_md  TEXT NOT NULL,
      provider    TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now()
    );
    """)

def downgrade():
    op.execute("""
    DROP TABLE IF EXISTS synth_docs;
    DROP TABLE IF EXISTS playground_docs;
    DROP TABLE IF EXISTS playgrounds;
    DROP INDEX IF EXISTS idx_chunk_vectors_hnsw;
    DROP TABLE IF EXISTS chunk_vectors;
    DROP TABLE IF EXISTS chunks;
    DROP TABLE IF EXISTS documents;
    DROP TABLE IF EXISTS tenants;
    """)
