import { useState } from 'react';
import tokens from '../theme/tokens';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import useSynth from '../hooks/useSynth';

export default function SynthCard({ apiBase, defaultTopic = '' }) {
  const [topic, setTopic] = useState(defaultTopic);
  const [numSections, setNumSections] = useState(5);
  const [temperature, setTemperature] = useState(0.7);
  const [activeTab, setActiveTab] = useState('preview'); // preview | outline | raw
  const { generating, result, error, generateDocument } = useSynth(apiBase);

  const onGenerate = async () => {
    if (!topic.trim()) return;
    await generateDocument({ topic, numSections, temperature });
  };

  const downloadMarkdown = () => {
    if (!result?.content_md) return;
    const blob = new Blob([result.content_md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderContent = () => {
    if (generating) return <p className="p-4 text-center" style={{ color: tokens.muted }}>Generating document...</p>;
    if (error) return <p className="p-4 text-center" style={{ color: tokens.danger }}>Error: {error}</p>;
    if (!result) return <p className="p-4 text-center" style={{ color: tokens.muted }}>Enter a topic and generate a document.</p>;

    switch (activeTab) {
      case 'preview': {
        const clean = DOMPurify.sanitize(marked.parse(result.content_md || ''));
        return <div className="p-4 prose prose-invert overflow-auto" style={{ color: tokens.text }}
                    dangerouslySetInnerHTML={{ __html: clean }} />;
      }
      case 'outline':
        return (
          <ul className="list-disc list-inside p-4" style={{ color: tokens.text }}>
            {(result.outline || []).map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        );
      case 'raw':
        return (
          <pre className="p-4 text-xs overflow-auto" style={{ color: tokens.muted }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 rounded-2xl shadow-lg flex flex-col space-y-6"
         style={{ backgroundColor: tokens.card, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
      <h2 className="text-xl font-semibold" style={{ color: tokens.text }}>Synthesize</h2>

      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium" style={{ color: tokens.muted }}>Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-transparent border text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
          style={{ borderColor: tokens.line, backgroundColor: 'rgba(255,255,255,0.05)', color: tokens.text }}
          placeholder="e.g., The history of artificial intelligence"
        />
      </div>

      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="flex-1 flex flex-col space-y-2">
          <label className="text-sm font-medium" style={{ color: tokens.muted }}># Sections</label>
          <input
            type="number"
            value={numSections}
            onChange={(e) => setNumSections(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-transparent border text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{ borderColor: tokens.line, backgroundColor: 'rgba(255,255,255,0.05)', color: tokens.text }}
          />
        </div>
        <div className="flex-1 flex flex-col space-y-2">
          <label className="text-sm font-medium" style={{ color: tokens.muted }}>Temperature</label>
          <input
            type="number"
            step="0.1" min="0" max="1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-transparent border text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{ borderColor: tokens.line, backgroundColor: 'rgba(255,255,255,0.05)', color: tokens.text }}
          />
        </div>
      </div>

      <div className="flex justify-between space-x-4">
        <button
          onClick={onGenerate}
          disabled={generating || !topic.trim()}
          className={`px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 ${
            generating || !topic.trim() ? 'bg-gray-700 cursor-not-allowed' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
          }`}
          style={{ color: tokens.text }}
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>
        <button
          onClick={downloadMarkdown}
          disabled={!result?.content_md}
          className={`px-6 py-3 rounded-lg font-bold text-sm transition-all duration-200 ${
            !result?.content_md ? 'bg-gray-700 cursor-not-allowed' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
          }`}
          style={{ color: tokens.text }}
        >
          Download .md
        </button>
      </div>

      <div className="flex space-x-2 border-b" style={{ borderColor: tokens.line }}>
        {[
          { id: 'preview', name: 'Preview' },
          { id: 'outline', name: 'Outline' },
          { id: 'raw', name: 'Raw' },
        ].map(t => (
          <button key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium focus:outline-none transition-all duration-200 ${
                    activeTab === t.id ? 'border-b-2 font-semibold' : 'hover:bg-white hover:bg-opacity-5'
                  }`}
                  style={{
                    color: activeTab === t.id ? tokens.text : tokens.muted,
                    borderColor: activeTab === t.id ? tokens.text : 'transparent',
                  }}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="flex-grow rounded-lg overflow-hidden" style={{ backgroundColor: '#0A0A0B' }}>
        {renderContent()}
      </div>
    </div>
  );
}
