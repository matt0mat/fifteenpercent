// frontend/src/services/workspacesApi.js
import useApiBase from '../hooks/useApiBase';

export const useWorkspacesApi = () => {
    const apiBase = useApiBase();

    const fetchWorkspaces = async (tenantId) => {
        try {
            const url = `${apiBase}/workspaces?tenant_id=${tenantId}`;
            const response = await fetch(url);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to fetch workspaces.');
            }
            return await response.json();
        } catch (error) {
            console.error("API call failed:", error);
            throw error;
        }
    };

    const createWorkspace = async (tenantId, name) => {
        try {
            const url = `${apiBase}/workspaces`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId, name: name }),
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create workspace.');
            }
            return await response.json();
        } catch (error) {
            console.error("API call failed:", error);
            throw error;
        }
    };

    return {
        fetchWorkspaces,
        createWorkspace,
    };
};