import { useEffect, useState } from 'react';
import useApiBase from './hooks/useApiBase';

/* --- Placeholder Components (to be built later) --- */
const HealthIndicator = () => null;
const WorkspaceManager = () => (
    <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Workspaces</h2>
        <p>This is where you'll manage your workspaces.</p>
    </div>
);
const WorkspaceDetail = () => (
    <div className="p-4 border border-gray-300 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Workspace Detail</h2>
        <p>This is where you'll see details for the selected workspace.</p>
    </div>
);

/* --- Main App Component --- */
function App() {
    const apiBase = useApiBase();
    const [status, setStatus] = useState('unknown');

    useEffect(() => {
        const checkHealth = async () => {
            if (!apiBase) return;
            try {
                const res = await fetch(`${apiBase}/health`);
                setStatus(res.ok ? 'ok' : 'error');
            } catch (e) {
                setStatus('error');
            }
        };
        checkHealth();
    }, [apiBase]);

    return (
        <div className="container mx-auto p-4">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">FifteenPercent Core</h1>
                <HealthIndicator status={status} />
            </header>

            <main className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <WorkspaceManager />
                </div>
                <div className="md:col-span-2">
                    <WorkspaceDetail />
                </div>
            </main>

            <footer className="mt-8 text-center text-sm text-gray-500">
                <p>&copy; 2024 FifteenPercent</p>
            </footer>
        </div>
    );
}

export default App;