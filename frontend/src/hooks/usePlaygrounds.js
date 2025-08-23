// src/hooks/usePlaygrounds.js
import { useCallback, useEffect, useState } from "react";

/**
 * Thin client for /playgrounds CRUD.
 * It degrades gracefully if the backend doesn't have these routes yet.
 */
export default function usePlaygrounds(apiBase) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const list = useCallback(async () => {
    if (!apiBase) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${apiBase}/playgrounds`, { method: "GET" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  const create = useCallback(
    async ({ name, description, tenant_id }) => {
      if (!apiBase) return null;
      setErr(null);
      try {
        const r = await fetch(`${apiBase}/playgrounds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, description, tenant_id }),
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} ${txt}`);
        }
        const data = await r.json();
        await list();
        return data;
      } catch (e) {
        setErr(e.message || String(e));
        return null;
      }
    },
    [apiBase, list]
  );

  const remove = useCallback(
    async (id) => {
      if (!apiBase || !id) return false;
      setErr(null);
      try {
        const r = await fetch(`${apiBase}/playgrounds/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await list();
        return true;
      } catch (e) {
        setErr(e.message || String(e));
        return false;
      }
    },
    [apiBase, list]
  );

  useEffect(() => {
    list();
  }, [list]);

  return { items, loading, err, list, create, remove };
}