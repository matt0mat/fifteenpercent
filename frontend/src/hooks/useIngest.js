// src/hooks/useIngest.js
import { useState } from "react";

export default function useIngest(apiBase) {
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState(null);

  async function ingestFile(tenantId, file, { playgroundId } = {}) {
    if (!apiBase) {
      setIngestError("API Base URL is not set.");
      return null;
    }
    if (!file) {
      setIngestError("No file selected.");
      return null;
    }

    setIngesting(true);
    setIngestError(null);

    try {
      const form = new FormData();
      form.append("tenant_id", tenantId);
      if (playgroundId) form.append("playground_id", playgroundId);
      form.append("file", file);

      // IMPORTANT: no manual Content-Type here
      const res = await fetch(`${apiBase}/ingest/`, {
        method: "POST",
        body: form,
      });

      // surface server text if any
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`);
      }

      const data = await res.json().catch(() => ({}));
      // normalize a couple fields for UI
      return {
        ok: true,
        filename: data.filename || file.name,
        content_type: data.content_type || file.type || "application/octet-stream",
        chunks: data.chunks ?? data.chunk_count ?? null,
        ...data,
      };
    } catch (err) {
      setIngestError(err?.message || String(err));
      return null;
    } finally {
      setIngesting(false);
    }
  }

  return { ingesting, ingestError, ingestFile };
}
