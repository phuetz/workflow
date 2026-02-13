/**
 * @deprecated LEGACY - Use workflowMetaSlice instead (F1.3)
 *
 * This slice is kept ONLY for backwards compatibility.
 * All workflow state and actions are now handled by workflowMetaSlice.
 * This slice is NOT used in the main workflowStore.
 *
 * Migration: Import from workflowMetaSlice instead:
 *   import { createWorkflowMetaSlice, WorkflowMetaSlice } from './workflowMetaSlice';
 */

import { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';
import { updateTimestampService } from '../../services/UpdateTimestampService';
import { eventNotificationService } from '../../services/EventNotificationService';

export interface Workflow {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  description: string;
  settings: {
    environment: string;
    variables: Record<string, any>;
  };
}

export interface WorkflowSlice {
  // State
  workflows: Record<string, Workflow>;
  currentWorkflowId: string | null;
  workflowName: string;
  isSaved: boolean;
  lastSaved: Date | null;
  workflowTemplates: Record<string, any>;
  workflowVersions: Record<string, any>;

  // Actions
  saveWorkflow: (name?: string | null) => Promise<string>;
  loadWorkflow: (workflowId: string) => Promise<void>;
  duplicateWorkflow: (workflowId: string) => string | null;
  exportWorkflow: () => void;
  importWorkflow: (file: File) => Promise<void>;
  setWorkflowName: (name: string) => void;
  markAsSaved: () => void;
}

export const createWorkflowSlice: StateCreator<
  WorkflowSlice,
  [],
  [],
  WorkflowSlice
> = (set, get) => ({
  // Initial state
  workflows: {},
  currentWorkflowId: null,
  workflowName: 'Nouveau Workflow',
  isSaved: true,
  lastSaved: null,
  workflowTemplates: {
    'welcome-email': {
      name: 'Email de bienvenue',
      description: 'Envoie un email de bienvenue aux nouveaux utilisateurs',
      category: 'Marketing',
      nodes: [],
      edges: [],
    },
    'data-sync': {
      name: 'Synchronisation de données',
      description: 'Synchronise les données entre deux systèmes',
      category: 'Data',
      nodes: [],
      edges: [],
    },
    'social-media': {
      name: 'Publication réseaux sociaux',
      description: 'Publie automatiquement sur plusieurs réseaux',
      category: 'Social',
      nodes: [],
      edges: [],
    }
  },
  workflowVersions: {},

  // Actions
  saveWorkflow: async (name = null) => {
    try {
      const state = get() as any;
      const { nodes, edges, currentWorkflowId, currentEnvironment, globalVariables } = state;
      const workflowId = currentWorkflowId || `workflow_${Date.now()}`;
      const workflowData: Workflow = {
        id: workflowId,
        name: name || `Workflow ${new Date().toLocaleDateString()}`,
        nodes,
        edges,
        version: '3.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        description: '',
        settings: {
          environment: currentEnvironment,
          variables: globalVariables?.[currentEnvironment] || {}
        }
      };

      try {
        const response = await fetch('/api/workflows', {
          method: workflowData.id === currentWorkflowId ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(workflowData)
        });

        if (!response.ok) {
          throw new Error(`Failed to save workflow: ${response.statusText}`);
        }

        const savedWorkflow = await response.json();

        set((state) => ({
          workflows: { ...(state as any).workflows, [workflowId]: savedWorkflow },
          currentWorkflowId: workflowId,
          isSaved: true,
          lastSaved: new Date()
        }));

        updateTimestampService.updateTimestamp('workflow', 'saved', { workflowId });
        eventNotificationService.emitEvent('workflow_saved', {
          workflowId,
          workflowName: savedWorkflow.name
        }, 'workflow_store');

        return workflowId;
      } catch (apiError) {
        logger.error('API error saving workflow:', apiError);

        set((state) => ({
          workflows: { ...(state as any).workflows, [workflowId]: workflowData },
          currentWorkflowId: workflowId,
          isSaved: false,
          lastSaved: null
        }));

        updateTimestampService.updateTimestamp('workflow', 'saved_locally', { workflowId });
        throw apiError;
      }
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde:', error);
      throw error;
    }
  },

  loadWorkflow: async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const workflow = await response.json();
        set({
          currentWorkflowId: workflowId,
          workflowName: workflow.name,
          isSaved: true,
          lastSaved: new Date(workflow.updatedAt)
        } as any);

        set((state) => ({
          workflows: { ...(state as any).workflows, [workflowId]: workflow }
        }));
      } else {
        const state = get() as any;
        const workflow = state.workflows[workflowId];
        if (workflow) {
          set({
            currentWorkflowId: workflowId
          } as any);
        }
      }
    } catch (error) {
      logger.error('Error loading workflow:', error);
      const state = get() as any;
      const workflow = state.workflows[workflowId];
      if (workflow) {
        set({
          currentWorkflowId: workflowId
        } as any);
      }
    }
  },

  duplicateWorkflow: (workflowId: string) => {
    const state = get() as any;
    const wf = state.workflows[workflowId];
    if (!wf) return null;

    const newId = `workflow_${Date.now()}`;
    const copy = {
      ...wf,
      id: newId,
      name: `${wf.name || 'Workflow'} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      workflows: { ...(state as any).workflows, [newId]: copy },
    }));

    return newId;
  },

  exportWorkflow: () => {
    const state = get() as any;
    const { nodes, edges, currentWorkflowId } = state;
    const exportData = {
      nodes,
      edges,
      exportDate: new Date().toISOString(),
      version: '3.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${currentWorkflowId || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importWorkflow: async (file: File) => {
    try {
      logger.info('Starting workflow import from store', {
        fileName: file.name,
        fileSize: file.size
      });

      const text = await file.text();
      const workflow = JSON.parse(text);

      if (!workflow || typeof workflow !== 'object') {
        throw new Error('Invalid workflow format: not an object');
      }

      const nodes = workflow.nodes || [];
      const edges = workflow.edges || [];

      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        throw new Error('Invalid workflow format: nodes and edges must be arrays');
      }

      if (nodes.length > 1000 || edges.length > 2000) {
        throw new Error('Workflow too large');
      }

      set({} as any);

      logger.info('Workflow import completed successfully from store', {
        fileName: file.name,
        nodeCount: nodes.length,
        edgeCount: edges.length
      });
    } catch (error) {
      logger.error('Error importing workflow from store:', {
        fileName: file?.name,
        fileSize: file?.size,
        error
      });
      throw error instanceof Error ? error : new Error('Unknown error occurred during workflow import');
    }
  },

  setWorkflowName: (name: string) => set({
    workflowName: name,
    isSaved: false,
    lastSaved: null
  }),

  markAsSaved: () => set({
    isSaved: true,
    lastSaved: new Date()
  }),
});
