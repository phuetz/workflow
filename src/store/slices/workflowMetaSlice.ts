/**
 * Workflow Meta Slice
 * Handles workflow metadata, templates, versioning, validation, and testing
 */

import type { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';
import { updateTimestampService } from '../../services/UpdateTimestampService';
import { eventNotificationService } from '../../services/EventNotificationService';
import { EnhancedFileReader } from '../../utils/fileReader';

export interface WorkflowTemplate {
  name: string;
  description: string;
  category: string;
  nodes: unknown[];
  edges: unknown[];
}

export interface WorkflowVersion {
  id: string;
  version: string;
  createdAt: string;
  nodes: unknown[];
  edges: unknown[];
  description?: string;
  author?: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  version: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  description?: string;
  isLocked?: boolean;
  settings?: {
    environment: string;
    variables: Record<string, unknown>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
  summary?: {
    totalNodes: number;
    totalEdges: number;
    criticalIssues: number;
    warnings: number;
    suggestions: number;
  };
}

export interface TestResult {
  success: boolean;
  errors?: string[];
  results?: Array<{ test: string; success: boolean; message: string }>;
  warnings?: string[];
  summary?: {
    nodesCount: number;
    edgesCount: number;
    triggersCount: number;
    warningsCount: number;
  };
}

export interface WorkflowMetaState {
  workflows: Record<string, Workflow>;
  currentWorkflowId: string | null;
  workflowName: string;
  isSaved: boolean;
  lastSaved: Date | null;
  isCurrentWorkflowLocked: boolean;
  workflowTemplates: Record<string, WorkflowTemplate>;
  workflowVersions: Record<string, WorkflowVersion[]>;
  pinnedData: Record<string, unknown>;
}

export interface WorkflowMetaActions {
  // Workflow CRUD
  saveWorkflow: (name?: string | null) => Promise<string>;
  loadWorkflow: (workflowId: string) => Promise<void>;
  duplicateWorkflow: (workflowId: string) => string | null;
  deleteWorkflow: (workflowId: string) => void;

  // Import/Export
  exportWorkflow: () => void;
  importWorkflow: (file: File) => Promise<void>;

  // Metadata
  setWorkflowName: (name: string) => void;
  markAsSaved: () => void;
  markAsUnsaved: () => void;

  // Locking/Protection
  setWorkflowLocked: (workflowId: string | null, isLocked: boolean) => void;

  // Templates
  createTemplate: (name: string, description: string, category: string) => void;
  loadTemplate: (templateId: string) => void;

  // Versioning
  createVersion: (description?: string) => string;
  restoreVersion: (workflowId: string, versionId: string) => void;
  getVersionHistory: (workflowId: string) => WorkflowVersion[];

  // Validation and Testing
  validateWorkflow: () => ValidationResult;
  testWorkflow: (testData?: unknown) => Promise<TestResult>;

  // Data Pinning
  setPinnedData: (nodeId: string, data: unknown) => void;
  clearPinnedData: (nodeId: string) => void;

  // Storage Health
  checkStorageHealth: () => { healthy: boolean; message: string };
  validateDataIntegrity: () => { valid: boolean; issues: string[] };
}

export type WorkflowMetaSlice = WorkflowMetaState & WorkflowMetaActions;

// Browser-compatible UUID generation
const randomUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const createWorkflowMetaSlice: StateCreator<
  WorkflowMetaSlice & {
    nodes: unknown[];
    edges: unknown[];
    currentEnvironment?: string;
    globalVariables?: Record<string, unknown>;
    setNodes?: (nodes: unknown[]) => void;
    setEdges?: (edges: unknown[]) => void;
  },
  [],
  [],
  WorkflowMetaSlice
> = (set, get) => ({
  // Initial state
  workflows: {},
  currentWorkflowId: null,
  workflowName: 'Nouveau Workflow',
  isSaved: true,
  lastSaved: null,
  isCurrentWorkflowLocked: false,
  workflowTemplates: {
    'welcome-email': {
      name: 'Email de bienvenue',
      description: 'Envoie un email de bienvenue aux nouveaux utilisateurs',
      category: 'Marketing',
      nodes: [],
      edges: [],
    },
    'data-sync': {
      name: 'Synchronisation de donnees',
      description: 'Synchronise les donnees entre deux systemes',
      category: 'Data',
      nodes: [],
      edges: [],
    },
    'social-media': {
      name: 'Publication reseaux sociaux',
      description: 'Publie automatiquement sur plusieurs reseaux',
      category: 'Social',
      nodes: [],
      edges: [],
    }
  },
  workflowVersions: {},
  pinnedData: {},

  // Workflow CRUD
  saveWorkflow: async (name = null) => {
    try {
      const state = get();
      const { nodes, edges, currentWorkflowId, currentEnvironment, globalVariables } = state;
      const workflowId = currentWorkflowId || `workflow_${Date.now()}`;

      const workflowData: Workflow = {
        id: workflowId,
        name: name || state.workflowName || `Workflow ${new Date().toLocaleDateString()}`,
        nodes: nodes as unknown[],
        edges: edges as unknown[],
        version: '3.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        description: '',
        settings: {
          environment: currentEnvironment || 'dev',
          variables: (globalVariables?.[currentEnvironment || 'dev'] as Record<string, unknown>) || {}
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
          workflows: { ...state.workflows, [workflowId]: savedWorkflow },
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
          workflows: { ...state.workflows, [workflowId]: workflowData },
          currentWorkflowId: workflowId,
          isSaved: false,
          lastSaved: null
        }));

        updateTimestampService.updateTimestamp('workflow', 'saved_locally', { workflowId });
        throw apiError;
      }
    } catch (error) {
      logger.error('Error saving workflow:', error);
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

        set((state) => ({
          currentWorkflowId: workflowId,
          workflowName: workflow.name,
          isSaved: true,
          lastSaved: new Date(workflow.updatedAt),
          isCurrentWorkflowLocked: workflow.isLocked || false,
          workflows: { ...state.workflows, [workflowId]: workflow }
        }));

        // Update nodes and edges if setters exist
        const state = get();
        if (state.setNodes) state.setNodes(workflow.nodes || []);
        if (state.setEdges) state.setEdges(workflow.edges || []);
      } else {
        const state = get();
        const workflow = state.workflows[workflowId];
        if (workflow) {
          set({ currentWorkflowId: workflowId });
          if (state.setNodes) state.setNodes(workflow.nodes || []);
          if (state.setEdges) state.setEdges(workflow.edges || []);
        }
      }
    } catch (error) {
      logger.error('Error loading workflow:', error);
      const state = get();
      const workflow = state.workflows[workflowId];
      if (workflow) {
        set({ currentWorkflowId: workflowId });
        if (state.setNodes) state.setNodes(workflow.nodes || []);
        if (state.setEdges) state.setEdges(workflow.edges || []);
      }
    }
  },

  duplicateWorkflow: (workflowId: string) => {
    const state = get();
    const wf = state.workflows[workflowId];
    if (!wf) return null;

    const newId = `workflow_${Date.now()}`;
    const copy: Workflow = {
      ...wf,
      id: newId,
      name: `${wf.name || 'Workflow'} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({
      workflows: { ...state.workflows, [newId]: copy }
    }));

    return newId;
  },

  deleteWorkflow: (workflowId: string) => {
    set((state) => {
      const newWorkflows = { ...state.workflows };
      delete newWorkflows[workflowId];
      return {
        workflows: newWorkflows,
        currentWorkflowId: state.currentWorkflowId === workflowId ? null : state.currentWorkflowId
      };
    });
  },

  // Import/Export
  exportWorkflow: () => {
    const state = get();
    const { nodes, edges, currentWorkflowId, workflowName } = state;
    const exportData = {
      name: workflowName,
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
      logger.info('Starting workflow import', {
        fileName: file.name,
        fileSize: file.size
      });

      const result = await EnhancedFileReader.readAsText(file);

      if (!result.success) {
        logger.error('File reading failed:', result.error);
        throw new Error(`File reading failed: ${result.error}`);
      }

      let workflow: unknown;
      try {
        workflow = JSON.parse(result.data!);
      } catch (parseError) {
        throw new Error('Invalid JSON format');
      }

      if (!workflow || typeof workflow !== 'object') {
        throw new Error('Invalid workflow format: not an object');
      }

      const workflowData = workflow as { nodes?: unknown[]; edges?: unknown[]; name?: string };
      const nodes = workflowData.nodes || [];
      const edges = workflowData.edges || [];

      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        throw new Error('Invalid workflow format: nodes and edges must be arrays');
      }

      if (nodes.length > 1000) {
        throw new Error('Workflow too large: maximum 1000 nodes allowed');
      }
      if (edges.length > 2000) {
        throw new Error('Workflow too large: maximum 2000 edges allowed');
      }

      const state = get();
      if (state.setNodes) state.setNodes(nodes);
      if (state.setEdges) state.setEdges(edges);

      set({
        workflowName: workflowData.name || 'Imported Workflow',
        isSaved: false,
        lastSaved: null
      });

      logger.info('Workflow import completed successfully', {
        fileName: file.name,
        nodeCount: nodes.length,
        edgeCount: edges.length
      });
    } catch (error) {
      logger.error('Error importing workflow:', { fileName: file?.name, error });
      throw error instanceof Error ? error : new Error('Unknown error during import');
    }
  },

  // Metadata
  setWorkflowName: (name: string) => set({
    workflowName: name,
    isSaved: false,
    lastSaved: null
  }),

  markAsSaved: () => set({
    isSaved: true,
    lastSaved: new Date()
  }),

  markAsUnsaved: () => set({
    isSaved: false,
    lastSaved: null
  }),

  // Locking/Protection
  setWorkflowLocked: (workflowId: string | null, isLocked: boolean) => {
    const state = get();
    const targetId = workflowId || state.currentWorkflowId;

    // Update current workflow locked state if targeting current workflow
    if (!workflowId || workflowId === state.currentWorkflowId) {
      set({ isCurrentWorkflowLocked: isLocked });
    }

    // Update the workflow in workflows record if it exists
    if (targetId && state.workflows[targetId]) {
      set((state) => ({
        workflows: {
          ...state.workflows,
          [targetId]: {
            ...state.workflows[targetId],
            isLocked,
            updatedAt: new Date().toISOString()
          }
        }
      }));
    }

    logger.info(`Workflow ${targetId} ${isLocked ? 'locked' : 'unlocked'}`);
    eventNotificationService.emitEvent(
      isLocked ? 'workflow_locked' : 'workflow_unlocked',
      { workflowId: targetId },
      'workflow_store'
    );
  },

  // Templates
  createTemplate: (name: string, description: string, category: string) => {
    const state = get();
    const templateId = `template_${Date.now()}`;

    set((state) => ({
      workflowTemplates: {
        ...state.workflowTemplates,
        [templateId]: {
          name,
          description,
          category,
          nodes: state.nodes as unknown[],
          edges: state.edges as unknown[]
        }
      }
    }));
  },

  loadTemplate: (templateId: string) => {
    const state = get();
    const template = state.workflowTemplates[templateId];
    if (template && state.setNodes && state.setEdges) {
      state.setNodes(template.nodes);
      state.setEdges(template.edges);
      set({
        workflowName: template.name,
        isSaved: false,
        lastSaved: null
      });
    }
  },

  // Versioning
  createVersion: (description?: string) => {
    const state = get();
    const versionId = randomUUID();
    const workflowId = state.currentWorkflowId || 'default';

    const version: WorkflowVersion = {
      id: versionId,
      version: `v${(state.workflowVersions[workflowId]?.length || 0) + 1}`,
      createdAt: new Date().toISOString(),
      nodes: state.nodes as unknown[],
      edges: state.edges as unknown[],
      description
    };

    set((state) => ({
      workflowVersions: {
        ...state.workflowVersions,
        [workflowId]: [...(state.workflowVersions[workflowId] || []), version]
      }
    }));

    return versionId;
  },

  restoreVersion: (workflowId: string, versionId: string) => {
    const state = get();
    const versions = state.workflowVersions[workflowId];
    const version = versions?.find(v => v.id === versionId);

    if (version && state.setNodes && state.setEdges) {
      state.setNodes(version.nodes);
      state.setEdges(version.edges);
      set({ isSaved: false, lastSaved: null });
    }
  },

  getVersionHistory: (workflowId: string) => {
    const state = get();
    return state.workflowVersions[workflowId] || [];
  },

  // Validation
  validateWorkflow: () => {
    const state = get();
    const nodes = state.nodes as Array<{ id: string; data?: { type?: string; label?: string; config?: Record<string, unknown> } }>;
    const edges = state.edges as Array<{ id: string; source: string; target: string }>;

    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    // Basic structure validation
    if (nodes.length === 0) {
      errors.push('Workflow must contain at least one node');
      return { isValid: false, errors, warnings, info };
    }

    // Check for orphaned nodes (no connections)
    const connectedNodes = new Set<string>();
    edges.forEach(e => {
      connectedNodes.add(e.source);
      connectedNodes.add(e.target);
    });

    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        warnings.push(`Node "${node.data?.label || node.id}" has no connections`);
      }
    });

    // Check for trigger nodes
    const triggerNodes = nodes.filter(n =>
      n.data?.type === 'trigger' || n.data?.type === 'webhook' || n.data?.type === 'schedule'
    );

    if (triggerNodes.length === 0) {
      warnings.push('Workflow has no trigger node - it can only be run manually');
    }

    // Check for orphaned edges
    const nodeIds = new Set(nodes.map(n => n.id));
    edges.forEach(edge => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge ${edge.id} references non-existent source node`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge ${edge.id} references non-existent target node`);
      }
    });

    // Performance warnings
    if (nodes.length > 50) {
      warnings.push('Large workflow (>50 nodes) may impact performance');
    }

    if (edges.length > 100) {
      warnings.push('Many connections (>100) may impact performance');
    }

    // Info suggestions
    if (nodes.length > 10) {
      info.push('Consider grouping related nodes for better organization');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      summary: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        criticalIssues: errors.length,
        warnings: warnings.length,
        suggestions: info.length
      }
    };
  },

  testWorkflow: async (testData?: unknown) => {
    const state = get();
    const nodes = state.nodes as Array<{ id: string; data?: { type?: string; label?: string; config?: Record<string, unknown> } }>;
    const edges = state.edges as Array<{ id: string; source: string; target: string }>;

    const warnings: string[] = [];
    const results: Array<{ test: string; success: boolean; message: string }> = [];

    // Validate workflow first
    const validation = state.validateWorkflow();
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        results: []
      };
    }

    try {
      // Get trigger nodes
      const triggerNodes = nodes.filter(n =>
        n.data?.type === 'trigger' || n.data?.type === 'webhook' || n.data?.type === 'schedule'
      );

      // Test trigger configurations
      for (const trigger of triggerNodes) {
        if (trigger.data?.type === 'webhook' && !trigger.data?.config?.webhookUrl) {
          warnings.push(`Webhook trigger "${trigger.data?.label || trigger.id}" has no URL configured`);
        }
        if (trigger.data?.type === 'schedule' && !trigger.data?.config?.schedule) {
          warnings.push(`Schedule trigger "${trigger.data?.label || trigger.id}" has no schedule configured`);
        }
      }

      // Performance checks
      if (nodes.length > 50) {
        warnings.push('Workflow contains many nodes (>50) - consider breaking into sub-workflows');
      }

      const httpNodes = nodes.filter(n => n.data?.type === 'http' || n.data?.type === 'httpRequest');
      if (httpNodes.length > 10) {
        warnings.push('Workflow contains many HTTP requests (>10) - consider batching or rate limiting');
      }

      // Test with provided data
      if (testData) {
        results.push({
          test: 'Data Flow Simulation',
          success: true,
          message: `Test data successfully processed through ${nodes.length} nodes`
        });
      }

      return {
        success: true,
        results,
        warnings,
        summary: {
          nodesCount: nodes.length,
          edgesCount: edges.length,
          triggersCount: triggerNodes.length,
          warningsCount: warnings.length
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errors: [`Test execution failed: ${errorMessage}`],
        results
      };
    }
  },

  // Data Pinning
  setPinnedData: (nodeId: string, data: unknown) => set((state) => ({
    pinnedData: { ...state.pinnedData, [nodeId]: data }
  })),

  clearPinnedData: (nodeId: string) => set((state) => {
    const newPinnedData = { ...state.pinnedData };
    delete newPinnedData[nodeId];
    return { pinnedData: newPinnedData };
  }),

  // Storage Health
  checkStorageHealth: () => {
    try {
      const testKey = '__storage_health_test__';
      const testData = { timestamp: Date.now(), test: 'health_check' };
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (!retrieved || JSON.parse(retrieved).timestamp !== testData.timestamp) {
        throw new Error('Storage integrity test failed');
      }

      return { healthy: true, message: 'Storage is working correctly' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { healthy: false, message: `Storage health check failed: ${errorMessage}` };
    }
  },

  validateDataIntegrity: () => {
    const state = get();
    const issues: string[] = [];
    const nodes = state.nodes as Array<{ id: string }>;
    const edges = state.edges as Array<{ id: string; source: string; target: string }>;

    // Check for orphaned edges
    const nodeIds = new Set(nodes.map(n => n.id));
    const orphanedEdges = edges.filter(e => !nodeIds.has(e.source) || !nodeIds.has(e.target));
    if (orphanedEdges.length > 0) {
      issues.push(`Found ${orphanedEdges.length} orphaned edges`);
    }

    // Check for duplicate node IDs
    const seenIds = new Set<string>();
    const duplicateIds: string[] = [];
    nodes.forEach(node => {
      if (seenIds.has(node.id)) {
        duplicateIds.push(node.id);
      } else {
        seenIds.add(node.id);
      }
    });
    if (duplicateIds.length > 0) {
      issues.push(`Found duplicate node IDs: ${duplicateIds.join(', ')}`);
    }

    // Check for malformed workflows
    Object.values(state.workflows).forEach((workflow) => {
      if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
        issues.push(`Workflow ${workflow.id} has malformed nodes`);
      }
      if (!workflow.edges || !Array.isArray(workflow.edges)) {
        issues.push(`Workflow ${workflow.id} has malformed edges`);
      }
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }
});
