import { useState } from 'react';
import tokens from '../theme/tokens';
import { fmtDistance, shortId } from '../utils/format';

export default function SnippetChip({ snippet }) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="p-4 rounded-lg border flex flex-col space-y-2 transition-all duration-200"
      style={{
        backgroundColor: tokens.card,
        borderColor: hover ? tokens.accentRing : tokens.line,
        boxShadow: hover ? '0 0 8px rgba(255,255,255,0.1)' : 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex-1 overflow-hidden text-sm" style={{ color: tokens.muted }}>
        <p className="line-clamp-3">
          {snippet.snippet}
        </p>
      </div>
      <div className="flex justify-between items-center text-xs" style={{ color: tokens.muted }}>
        <div className="flex items-center space-x-1">
          <span>Source:</span>
          <span className="font-mono bg-white bg-opacity-5 px-2 py-0.5 rounded-full" style={{ color: tokens.text }}>
            {shortId(snippet.source_id)}
          </span>
        </div>
        <span>Dist: {fmtDistance(snippet.distance)}</span>
      </div>
    </div>
  );
}
