import { useEffect, useRef, useState } from 'react';
import tokens from './theme/tokens';

import useApiBase from './hooks/useApiBase';
import useHealth from './hooks/useHealth';
import useIngest from './hooks/useIngest';
import useQuery from './hooks/useQuery';

import ThreeDot from './components/ThreeDot';
import HealthIndicator from './components/HealthIndicator';
import Dropzone from './components/Dropzone';
import Tabs from './components/Tabs';
import Markdown from './components/Markdown';
import JsonView from './components/JsonView';
import SnippetChip from './components/SnippetChip';
import SynthCard from './components/SynthCard';

/* -------------------------------------------
   Small helpers
--------------------------------------------*/
function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

/* -------------------------------------------
   Playgrounds Manager (inline component)
--------------------------------------------*/
function PlaygroundManager({ apiBase, onToast }) {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [error, setError] = useState(null);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const [activeId, setActiveId] = useState(localStorage.getItem('activePlaygroundId') || '');
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!apiBase) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  useEffect(() => {
    if (activeId) {
      localStorage.setItem('activePlaygroundId', activeId);
    } else {
      localStorage.removeItem('activePlaygroundId');
    }
  }, [activeId]);

  async function refresh() {
    if (!apiBase) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/playgrounds`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setList(Array.isArray(data) ? data : (data.items || []));
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function createPlayground(e) {
    e?.preventDefault?.();
    if (!name.trim()) {
      onToast('Please enter a playground name.', 'error');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${apiBase}/playgrounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc || '' }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Create failed: HTTP ${res.status} ${txt}`);
      }
      onToast('Playground created.', 'success');
      setName('');
      setDesc('');
      await refresh();
    } catch (e) {
      onToast(e.message || 'Create failed', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function removePlayground(id) {
    if (!id) return;
    try {
      const res = await fetch(`${apiBase}/playgrounds/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Delete failed: HTTP ${res.status} ${txt}`);
      }
      onToast('Playground deleted.', 'success');
      if (id === activeId) setActiveId('');
      await refresh();
    } catch (e) {
      onToast(e.message || 'Delete failed', 'error');
    }
  }

  async function uploadToActive() {
    if (!activeId) {
      onToast('Choose a playground first.', 'error');
      return;
    }
    if (!file) {
      onToast('Select a file to upload.', 'error');
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      // Optionally include metadata fields:
      // form.append('source', 'manual-upload');

      const res = await fetch(`${apiBase}/playgrounds/${encodeURIComponent(activeId)}/ingest`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Upload failed: HTTP ${res.status} ${txt}`);
      }
      const data = await res.json().catch(() => ({}));
      const label = data?.chunks ? `${data.chunks} chunks` : 'uploaded';
      onToast(`File ${file.name} ${label}`, 'success');
      setFile(null);
    } catch (e) {
      onToast(e.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="p-6 rounded-2xl shadow-lg space-y-6"
         style={{ backgroundColor: tokens.card, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
      <h2 className="text-xl font-semibold" style={{ color: tokens.text }}>Playgrounds</h2>

      {/* Create form */}
      <form onSubmit={createPlayground} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          placeholder="Name (e.g., Sales-Docs)"
          className="px-4 py-2 rounded-lg bg-transparent border focus:outline-none"
          style={{ borderColor: tokens.line, color: tokens.text, backgroundColor: 'rgba(255,255,255,0.05)' }}
        />
        <input
          type="text"
          value={desc}
          onChange={(e)=>setDesc(e.target.value)}
          placeholder="Description (optional)"
          className="px-4 py-2 rounded-lg bg-transparent border focus:outline-none"
          style={{ borderColor: tokens.line, color: tokens.text, backgroundColor: 'rgba(255,255,255,0.05)' }}
        />
        <button
          type="submit"
          disabled={creating}
          className={classNames(
            'px-4 py-2 rounded-lg font-bold text-sm transition-all',
            creating ? 'bg-gray-700 cursor-not-allowed' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
          )}
          style={{ color: tokens.text }}
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>

      {/* List */}
      <div className="rounded-lg border" style={{ borderColor: tokens.line }}>
        <div className="px-3 py-2 text-sm" style={{ color: tokens.muted }}>
          {loading ? 'Loading…' : error ? `Error: ${error}` : `Found ${list.length} playground(s).`}
        </div>
        <ul className="divide-y" style={{ borderColor: tokens.line }}>
          {list.map(pg => (
            <li key={pg.id} className="flex items-center justify-between px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium" style={{ color: tokens.text }}>{pg.name}</div>
                <div className="text-xs" style={{ color: tokens.muted }}>
                  {pg.description || '—'} {pg.item_count != null ? `• ${pg.item_count} items` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={()=>setActiveId(pg.id)}
                  className={classNames(
                    'px-3 py-1 rounded-lg text-xs',
                    activeId === pg.id ? 'bg-white bg-opacity-20' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                  )}
                  style={{ color: tokens.text }}
                >
                  {activeId === pg.id ? 'Active' : 'Set Active'}
                </button>
                <button
                  onClick={()=>removePlayground(pg.id)}
                  className="px-3 py-1 rounded-lg text-xs bg-red-500 bg-opacity-80 hover:bg-opacity-90"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
          {!loading && list.length === 0 && (
            <li className="px-3 py-4 text-sm" style={{ color: tokens.muted }}>
              No playgrounds yet. Create one above.
            </li>
          )}
        </ul>
      </div>

      {/* Uploader to active */}
      <div className="space-y-3">
        <div className="text-sm" style={{ color: tokens.muted }}>
          Upload into: <span className="font-mono" style={{ color: tokens.text }}>{activeId || '— none selected —'}</span>
        </div>
        <Dropzone
          onFileSelected={setFile}
          isDragging={isDragging}
          onDragOver={(e)=>{ e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
          onDragLeave={(e)=>{ e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        />
        <button
          onClick={uploadToActive}
          disabled={uploading || !file || !activeId}
          className={classNames(
            'px-4 py-2 rounded-lg font-bold text-sm transition-all',
            (uploading || !file || !activeId) ? 'bg-gray-700 cursor-not-allowed' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
          )}
          style={{ color: tokens.text }}
        >
          {uploading ? 'Uploading…' : 'Upload to Playground'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------
   Original App (adds a top-level tab)
--------------------------------------------*/
export default function App() {
  const { apiBase, setApiBase } = useApiBase();
  const isHealthy = useHealth(apiBase);
  const { ingesting, ingestFile } = useIngest(apiBase);
  const { querying, queryResult, queryError, runQuery } = useQuery(apiBase);

  const [tenantId, setTenantId] = useState('t_demo');
  const [ingestFileState, setIngestFileState] = useState(null);
  const [isIngestDragging, setIsIngestDragging] = useState(false);
  const [question, setQuestion] = useState('');
  const [topK, setTopK] = useState(5);
  const [activeTab, setActiveTab] = useState('answer');
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // NEW: top-level page tab
  const [pageTab, setPageTab] = useState('lab'); // 'lab' | 'playgrounds'

  const questionInputRef = useRef(null);

  useEffect(() => {
    const savedTenant = localStorage.getItem('tenantId');
    if (savedTenant) setTenantId(savedTenant);
  }, []);

  useEffect(() => {
    localStorage.setItem('tenantId', tenantId);
  }, [tenantId]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && e.ctrlKey && question.trim()) {
        handleAsk();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, tenantId, topK]);

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileChange = (file) => setIngestFileState(file);

  const handleIngest = async () => {
    if (!ingestFileState) {
      showToast('Please select a PDF file to ingest.', 'error');
      return;
    }
    const res = await ingestFile(tenantId, ingestFileState);
    if (res?.filename) {
      const chunksLabel = typeof res.chunks === 'number' ? `${res.chunks} chunks` : 'ingested';
      showToast(`Ingested ${res.filename} (${chunksLabel})`, 'success');
      setIngestFileState(null);
    } else {
      showToast('Ingest failed. See console/logs.', 'error');
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) {
      showToast('Please enter a question.', 'error');
      return;
    }
    const ok = await runQuery(tenantId, question, Number(topK));
    if (!ok && queryError) {
      showToast(`Query failed: ${queryError}`, 'error');
    }
  };

  const renderQueryResult = () => {
    if (querying) return <div className="p-4 text-center" style={{ color: tokens.muted }}>Loading...</div>;
    if (queryError) return <div className="p-4 text-center" style={{ color: tokens.danger }}>Error: {queryError}</div>;
    if (!queryResult) return <div className="p-4 text-center" style={{ color: tokens.muted }}>Enter a question and click "Ask".</div>;

    switch (activeTab) {
      case 'answer':
        return <Markdown content={queryResult.answer_md || 'No answer provided.'} />;
      case 'snippets':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {(queryResult.snippets || []).map((s, i) => <SnippetChip key={i} snippet={s} />)}
          </div>
        );
      case 'raw':
        return <JsonView data={queryResult} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col p-8 font-['Inter']"
         style={{ backgroundColor: tokens.bg, color: tokens.text }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <ThreeDot />
          <h1 className="text-2xl font-bold">FifteenPercent - Lab</h1>
          <HealthIndicator isHealthy={isHealthy} />
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors duration-200"
          title="Settings"
          aria-label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.39a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.5a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.39a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73v.5a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.5a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
      </div>

      {/* NEW: Top-level tabs */}
      <div className="mb-6 border-b" style={{ borderColor: tokens.line }}>
        <div className="flex gap-2">
          {[
            { id: 'lab', name: 'Lab' },
            { id: 'playgrounds', name: 'Playgrounds' },
          ].map(t => (
            <button
              key={t.id}
              onClick={()=>setPageTab(t.id)}
              className={classNames(
                'px-4 py-2 text-sm font-medium transition-all',
                pageTab === t.id ? 'border-b-2' : 'hover:bg-white hover:bg-opacity-5'
              )}
              style={{
                color: pageTab === t.id ? tokens.text : tokens.muted,
                borderColor: pageTab === t.id ? tokens.text : 'transparent',
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* PAGE: Lab (existing UI) */}
      {pageTab === 'lab' && (
        <div className="flex flex-col md:flex-row space-y-8 md:space-y-0 md:space-x-8 flex-grow">
          {/* Left column */}
          <div className="w-full md:w-1/3 flex flex-col space-y-8">
            {/* Synth */}
            <SynthCard apiBase={apiBase} />

            {/* Ingest */}
            <div className="p-6 rounded-2xl shadow-lg flex flex-col space-y-6"
                 style={{ backgroundColor: tokens.card, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              <h2 className="text-xl font-semibold" style={{ color: tokens.text }}>Ingest</h2>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium" style={{ color: tokens.muted }}>Tenant ID</label>
                <input
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-transparent border text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ borderColor: tokens.line, backgroundColor: 'rgba(255,255,255,0.05)', color: tokens.text }}
                  placeholder="e.g., t_your_company"
                />
              </div>

              <Dropzone
                onFileSelected={(f)=>setIngestFileState(f)}
                isDragging={isIngestDragging}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsIngestDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsIngestDragging(false); }}
              />

              <button
                onClick={handleIngest}
                disabled={ingesting || !ingestFileState}
                className={classNames(
                  'w-full px-6 py-3 rounded-lg font-bold text-sm transition-all',
                  (ingesting || !ingestFileState) ? 'bg-gray-700 cursor-not-allowed' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                )}
                style={{ color: tokens.text }}
              >
                {ingesting ? 'Ingesting...' : 'Ingest Document'}
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="w-full md:w-2/3 flex flex-col space-y-8">
            <div className="p-6 rounded-2xl shadow-lg flex flex-col space-y-6 flex-grow"
                 style={{ backgroundColor: tokens.card, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              <h2 className="text-xl font-semibold" style={{ color: tokens.text }}>Query</h2>

              <div className="flex flex-col space-y-2">
                <label className="text-sm font-medium" style={{ color: tokens.muted }}>Question</label>
                <textarea
                  ref={questionInputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-transparent border text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{ borderColor: tokens.line, backgroundColor: 'rgba(255,255,255,0.05)', color: tokens.text, resize: 'none' }}
                  placeholder="e.g., What are the PR-001 approval steps and SLA?"
                />
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium" style={{ color: tokens.muted }}>Top K Snippets</label>
                    <input
                      type="number"
                      value={topK}
                      onChange={(e) => setTopK(e.target.value)}
                      className="w-full px-4 py-2 mt-1 rounded-lg bg-transparent border text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
                      style={{ borderColor: tokens.line, backgroundColor: 'rgba(255,255,255,0.05)', color: tokens.text }}
                    />
                  </div>
                  <button
                    onClick={handleAsk}
                    disabled={querying || !question.trim()}
                    className={classNames(
                      'px-6 py-3 mt-auto rounded-lg font-bold text-sm transition-all',
                      (querying || !question.trim()) ? 'bg-gray-700 cursor-not-allowed' : 'bg-white bg-opacity-10 hover:bg-opacity-20'
                    )}
                    style={{ color: tokens.text }}
                  >
                    {querying ? 'Asking...' : 'Ask'}
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col">
                <div className="mb-2">
                  <Tabs
                    activeTab={activeTab}
                    onSelect={setActiveTab}
                    tabs={[
                      { id: 'answer', name: 'Answer' },
                      { id: 'snippets', name: 'Snippets' },
                      { id: 'raw', name: 'Raw JSON' },
                    ]}
                  />
                </div>
                <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: '#0A0A0B' }}>
                  {renderQueryResult()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAGE: Playgrounds */}
      {pageTab === 'playgrounds' && (
        <PlaygroundManager apiBase={apiBase} onToast={showToast} />
      )}

      {toast && (
        <div className={classNames(
          'fixed bottom-8 right-8 px-6 py-3 rounded-lg shadow-xl text-white transition-all duration-300',
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        )}>
          {toast.message}
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-8 rounded-lg shadow-xl w-96 flex flex-col space-y-4" style={{ backgroundColor: tokens.card }}>
            <h3 className="text-lg font-semibold" style={{ color: tokens.text }}>Settings</h3>
            <label className="block text-sm font-medium" style={{ color: tokens.muted }}>API Base URL</label>
            <input
              type="text"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-transparent border text-white focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ borderColor: tokens.line, backgroundColor: 'rgba(255,255,255,0.05)', color: tokens.text }}
              placeholder="e.g. http://127.0.0.1:8010"
            />
            <button
              onClick={() => setShowSettings(false)}
              className="w-full px-6 py-3 mt-4 rounded-lg font-bold text-sm bg-white bg-opacity-10 hover:bg-opacity-20 transition-all duration-200"
              style={{ color: tokens.text }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
