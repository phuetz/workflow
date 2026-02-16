/**
 * Workflow Sync Service
 * Subscribes to Zustand store changes and syncs workflows to backend API.
 * Provides load/save operations against /api/workflows.
 */

import { useWorkflowStore } from '../store/workflowStore';
import { logger } from './SimpleLogger';

const API_BASE = '/api/workflows';
let syncEnabled = false;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastSyncedHash = '';

/**
 * Fetch all workflows from backend and merge into store.
 */
export async function loadWorkflowsFromAPI(): Promise<void> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) return;
    const data = await res.json() as any;
    const workflows = data.workflows || data.data || data;
    if (Array.isArray(workflows) && workflows.length > 0) {
      const store = useWorkflowStore.getState();
      for (const wf of workflows) {
        // Load each workflow's nodes/edges if they have data
        if (wf.nodes && wf.edges) {
          store.setWorkflows?.([...((store as any).workflows || []), {
            id: wf.id,
            name: wf.name,
            description: wf.description,
            nodes: wf.nodes,
            edges: wf.edges,
            createdAt: wf.createdAt,
            updatedAt: wf.updatedAt,
          }]);
        }
      }
      logger.info(`Loaded ${workflows.length} workflows from API`);
    }
  } catch {
    // API unavailable
  }
}

/**
 * Save current workflow to backend API.
 */
export async function saveWorkflowToAPI(workflowId?: string): Promise<string | null> {
  try {
    const state = useWorkflowStore.getState();
    const nodes = state.nodes || [];
    const edges = state.edges || [];
    const name = (state as any).workflowName || (state as any).name || 'Untitled Workflow';

    const body = {
      name,
      nodes,
      edges,
      settings: {},
    };

    if (workflowId) {
      // Update existing
      const res = await fetch(`${API_BASE}/${workflowId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        logger.info(`Workflow ${workflowId} saved to API`);
        return workflowId;
      }
    } else {
      // Create new
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json() as any;
        const id = data.id || data.workflow?.id;
        logger.info(`Workflow created in API: ${id}`);
        return id;
      }
    }
  } catch (error) {
    logger.warn('Failed to save workflow to API', { error: String(error) });
  }
  return null;
}

/**
 * Delete a workflow from backend API.
 */
export async function deleteWorkflowFromAPI(workflowId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${workflowId}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Enable auto-sync: debounced push to API on store changes.
 */
export function enableAutoSync(): void {
  if (syncEnabled) return;
  syncEnabled = true;

  useWorkflowStore.subscribe((state) => {
    // Hash current state to avoid redundant syncs
    const hash = JSON.stringify({ nodes: (state.nodes || []).length, edges: (state.edges || []).length });
    if (hash === lastSyncedHash) return;
    lastSyncedHash = hash;

    // Debounce: save 2s after last change
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      const currentId = (state as any).currentWorkflowId;
      if (currentId) {
        saveWorkflowToAPI(currentId).catch(() => {});
      }
    }, 2000);
  });

  logger.info('Workflow auto-sync enabled');
}

/**
 * Disable auto-sync.
 */
export function disableAutoSync(): void {
  syncEnabled = false;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
}
