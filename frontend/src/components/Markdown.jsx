import { marked } from 'marked';
import DOMPurify from 'dompurify';
import tokens from '../theme/tokens';

export default function Markdown({ content }) {
  const cleanHtml = DOMPurify.sanitize(marked.parse(content || ''));
  return (
    <div
      className="p-4 prose prose-invert overflow-auto"
      style={{ color: tokens.text, backgroundColor: '#0A0A0B' }}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
