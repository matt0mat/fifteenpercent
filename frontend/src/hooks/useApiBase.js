import { useEffect, useState } from 'react';

export default function useApiBase() {
  const [apiBase, setApiBase] = useState(() => {
    const saved = localStorage.getItem('apiBase');
    return saved || '';
  });

  useEffect(() => {
    localStorage.setItem('apiBase', apiBase);
  }, [apiBase]);

  return { apiBase, setApiBase };
}
