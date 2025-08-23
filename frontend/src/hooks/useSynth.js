import { useState } from 'react';

export default function useSynth(apiBase) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function generateDocument({ topic, numSections = 5, temperature = 0.7 }) {
    if (!apiBase) {
      setError('API Base URL is not set.');
      return null;
    }
    setGenerating(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`${apiBase}/synth/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          num_sections: Number(numSections),
          temperature,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`);
      }
      const data = await res.json();
      setResult(data);
      return data;
    } catch (e) {
      setError(e.message || String(e));
      return null;
    } finally {
      setGenerating(false);
    }
  }

  return { generating, result, error, generateDocument };
}
