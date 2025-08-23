import { useState } from 'react';

export default function useQuery(apiBase) {
  const [querying, setQuerying] = useState(false);
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState(null);

  const runQuery = async (tenantId, question, topK) => {
    if (!apiBase) {
      setQueryError('API Base URL is not set.');
      return null;
    }
    setQuerying(true);
    setQueryResult(null);
    setQueryError(null);

    try {
      const res = await fetch(`${apiBase}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, question, top_k: Number(topK) }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
      }
      const data = await res.json();
      setQueryResult(data);
      return data;
    } catch (e) {
      setQueryError(e.message || String(e));
      return null;
    } finally {
      setQuerying(false);
    }
  };

  return { querying, queryResult, queryError, runQuery };
}
