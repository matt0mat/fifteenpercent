import { useEffect, useState } from 'react';

export default function useHealth(apiBase, interval = 5000) {
  const [isHealthy, setIsHealthy] = useState(false);

  useEffect(() => {
    if (!apiBase) {
      setIsHealthy(false);
      return;
    }

    const check = async () => {
      try {
        // FastAPI typically redirects /health -> /health/; ok for GET.
        const res = await fetch(`${apiBase}/health`);
        setIsHealthy(res.ok);
      } catch {
        setIsHealthy(false);
      }
    };

    check();
    const id = setInterval(check, interval);
    return () => clearInterval(id);
  }, [apiBase, interval]);

  return isHealthy;
}
