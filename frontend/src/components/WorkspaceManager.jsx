// frontend/src/components/WorkspaceManager.jsx
import { useEffect, useState } from 'react';
import { useWorkspacesApi } from '../services/workspacesApi';

function WorkspaceManager() {
    const { fetchWorkspaces, createWorkspace } = useWorkspacesApi();
    const [workspaces, setWorkspaces] = useState([]);
    const [name, setName] = useState('');
    const [tenantId, setTenantId] = useState('t_demo');
    const [error, setError] = useState(null);

    const loadWorkspaces = async () => {
        try {
            setError(null);
            const data = await fetchWorkspaces(tenantId);
            setWorkspaces(data);
        } catch (e) {
            setError(e.message);
        }
    };

    useEffect(() => {
        if (tenantId) {
            loadWorkspaces();
        }
    }, [tenantId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            setError(null);
            await createWorkspace(tenantId, name);
            setName('');
            await loadWorkspaces(); // Reload the list
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <div className="p-4 border border-gray-300 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Workspaces</h2>
            
            <form onSubmit={handleCreate} className="mb-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                    <input
                        type="text"
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="Enter Tenant ID"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Workspace Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        placeholder="e.g., Acme HR Policies"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                    Create Workspace
                </button>
            </form>

            {error && (
                <div className="p-2 my-4 text-red-700 bg-red-100 rounded-lg">
                    {error}
                </div>
            )}

            <div>
                <h3 className="text-lg font-medium mb-2">Existing Workspaces</h3>
                <ul className="space-y-2">
                    {workspaces.length > 0 ? (
                        workspaces.map((ws) => (
                            <li key={ws.id} className="p-2 border rounded-md">
                                {ws.name} ({ws.id})
                            </li>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">No workspaces found.</p>
                    )}
                </ul>
            </div>
        </div>
    );
}

export default WorkspaceManager;