import tokens from '../theme/tokens';

export default function JsonView({ data }) {
  return (
    <pre className="p-4 text-xs overflow-auto rounded-lg"
         style={{ backgroundColor: '#0A0A0B', color: tokens.muted }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
