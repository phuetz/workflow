/**
 * Validation Slice
 * Handles workflow validation with detailed error reporting
 */

import type { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';

export interface ValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  nodeId?: string;
  edgeId?: string;
  message: string;
  details?: string;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
  summary: {
    totalNodes: number;
    totalEdges: number;
    criticalIssues: number;
    warnings: number;
    suggestions: number;
  };
  validatedAt: Date;
}

export interface ValidationState {
  lastValidation: ValidationResult | null;
  isValidating: boolean;
  autoValidate: boolean;
  validationRules: ValidationRuleConfig;
}

export interface ValidationRuleConfig {
  maxNodes: number;
  maxEdges: number;
  requireTrigger: boolean;
  checkOrphanedNodes: boolean;
  checkCycles: boolean;
  checkNodeConfigs: boolean;
}

export interface ValidationActions {
  validateWorkflow: () => ValidationResult;
  validateNode: (nodeId: string) => ValidationIssue[];
  validateEdge: (edgeId: string) => ValidationIssue[];
  clearValidation: () => void;
  setAutoValidate: (enabled: boolean) => void;
  updateValidationRules: (rules: Partial<ValidationRuleConfig>) => void;
  validateDataIntegrity: () => { valid: boolean; issues: string[] };
}

export type ValidationSlice = ValidationState & ValidationActions;

// Browser-compatible UUID generation
const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const createValidationSlice: StateCreator<
  ValidationSlice & {
    nodes: Array<{ id: string; data?: { type?: string; label?: string; config?: Record<string, unknown> } }>;
    edges: Array<{ id: string; source: string; target: string }>;
    workflows?: Record<string, { id: string; nodes?: unknown[]; edges?: unknown[] }>;
  },
  [],
  [],
  ValidationSlice
> = (set, get) => ({
  // Initial state
  lastValidation: null,
  isValidating: false,
  autoValidate: true,
  validationRules: {
    maxNodes: 500,
    maxEdges: 1000,
    requireTrigger: false,
    checkOrphanedNodes: true,
    checkCycles: true,
    checkNodeConfigs: true,
  },

  // Validate entire workflow
  validateWorkflow: () => {
    set({ isValidating: true });

    try {
      const state = get();
      const { nodes, edges, validationRules } = state;

      const errors: ValidationIssue[] = [];
      const warnings: ValidationIssue[] = [];
      const info: ValidationIssue[] = [];

      // Rule: Workflow must have nodes
      if (nodes.length === 0) {
        errors.push({
          id: randomId(),
          type: 'error',
          message: 'Workflow must contain at least one node',
          suggestion: 'Add a trigger node to start your workflow',
        });
      }

      // Rule: Check max nodes
      if (nodes.length > validationRules.maxNodes) {
        errors.push({
          id: randomId(),
          type: 'error',
          message: `Workflow exceeds maximum node limit (${validationRules.maxNodes})`,
          details: `Current: ${nodes.length} nodes`,
          suggestion: 'Consider breaking into sub-workflows',
        });
      }

      // Rule: Check max edges
      if (edges.length > validationRules.maxEdges) {
        errors.push({
          id: randomId(),
          type: 'error',
          message: `Workflow exceeds maximum edge limit (${validationRules.maxEdges})`,
          details: `Current: ${edges.length} edges`,
        });
      }

      // Build node and edge maps for validation
      const nodeIds = new Set(nodes.map(n => n.id));
      const connectedNodes = new Set<string>();
      edges.forEach(e => {
        connectedNodes.add(e.source);
        connectedNodes.add(e.target);
      });

      // Rule: Check for orphaned edges (referencing non-existent nodes)
      edges.forEach(edge => {
        if (!nodeIds.has(edge.source)) {
          errors.push({
            id: randomId(),
            type: 'error',
            edgeId: edge.id,
            message: `Edge references non-existent source node`,
            details: `Edge ${edge.id} source: ${edge.source}`,
          });
        }
        if (!nodeIds.has(edge.target)) {
          errors.push({
            id: randomId(),
            type: 'error',
            edgeId: edge.id,
            message: `Edge references non-existent target node`,
            details: `Edge ${edge.id} target: ${edge.target}`,
          });
        }
      });

      // Rule: Check for orphaned nodes (no connections)
      if (validationRules.checkOrphanedNodes && nodes.length > 1) {
        nodes.forEach(node => {
          if (!connectedNodes.has(node.id)) {
            warnings.push({
              id: randomId(),
              type: 'warning',
              nodeId: node.id,
              message: `Node "${node.data?.label || node.id}" has no connections`,
              suggestion: 'Connect this node or remove it if unused',
            });
          }
        });
      }

      // Rule: Check for trigger nodes
      const triggerTypes = ['trigger', 'webhook', 'schedule', 'manualTrigger'];
      const triggerNodes = nodes.filter(n => triggerTypes.includes(n.data?.type || ''));

      if (validationRules.requireTrigger && triggerNodes.length === 0) {
        warnings.push({
          id: randomId(),
          type: 'warning',
          message: 'Workflow has no trigger node',
          details: 'It can only be run manually',
          suggestion: 'Add a trigger node (webhook, schedule, etc.)',
        });
      }

      // Rule: Check for multiple triggers
      if (triggerNodes.length > 1) {
        info.push({
          id: randomId(),
          type: 'info',
          message: `Workflow has ${triggerNodes.length} trigger nodes`,
          details: 'Multiple triggers will each start separate executions',
        });
      }

      // Rule: Check node configurations
      if (validationRules.checkNodeConfigs) {
        nodes.forEach(node => {
          const issues = state.validateNode(node.id);
          issues.forEach(issue => {
            if (issue.type === 'error') errors.push(issue);
            else if (issue.type === 'warning') warnings.push(issue);
            else info.push(issue);
          });
        });
      }

      // Performance suggestions
      if (nodes.length > 50) {
        info.push({
          id: randomId(),
          type: 'info',
          message: 'Large workflow detected',
          details: `${nodes.length} nodes may impact performance`,
          suggestion: 'Consider breaking into sub-workflows',
        });
      }

      if (nodes.length > 10) {
        info.push({
          id: randomId(),
          type: 'info',
          message: 'Consider grouping related nodes',
          suggestion: 'Use node groups for better organization',
        });
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        info,
        summary: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          criticalIssues: errors.length,
          warnings: warnings.length,
          suggestions: info.length,
        },
        validatedAt: new Date(),
      };

      set({ lastValidation: result, isValidating: false });

      logger.info('Workflow validation completed', {
        isValid: result.isValid,
        errors: errors.length,
        warnings: warnings.length,
      });

      return result;
    } catch (error) {
      logger.error('Validation error:', error);
      set({ isValidating: false });

      return {
        isValid: false,
        errors: [{
          id: randomId(),
          type: 'error',
          message: 'Validation failed due to internal error',
          details: error instanceof Error ? error.message : String(error),
        }],
        warnings: [],
        info: [],
        summary: {
          totalNodes: 0,
          totalEdges: 0,
          criticalIssues: 1,
          warnings: 0,
          suggestions: 0,
        },
        validatedAt: new Date(),
      };
    }
  },

  // Validate single node
  validateNode: (nodeId: string) => {
    const state = get();
    const node = state.nodes.find(n => n.id === nodeId);
    const issues: ValidationIssue[] = [];

    if (!node) {
      issues.push({
        id: randomId(),
        type: 'error',
        nodeId,
        message: 'Node not found',
      });
      return issues;
    }

    const nodeType = node.data?.type || 'unknown';
    const config = node.data?.config || {};

    // Type-specific validation
    switch (nodeType) {
      case 'webhook':
        if (!config.webhookUrl && !config.path) {
          issues.push({
            id: randomId(),
            type: 'warning',
            nodeId,
            message: 'Webhook node has no URL configured',
            suggestion: 'Configure a webhook URL or path',
          });
        }
        break;

      case 'schedule':
        if (!config.schedule && !config.cron) {
          issues.push({
            id: randomId(),
            type: 'warning',
            nodeId,
            message: 'Schedule node has no schedule configured',
            suggestion: 'Configure a cron expression or interval',
          });
        }
        break;

      case 'http':
      case 'httpRequest':
        if (!config.url) {
          issues.push({
            id: randomId(),
            type: 'warning',
            nodeId,
            message: 'HTTP node has no URL configured',
            suggestion: 'Configure the request URL',
          });
        }
        break;

      case 'email':
        if (!config.to && !config.recipients) {
          issues.push({
            id: randomId(),
            type: 'warning',
            nodeId,
            message: 'Email node has no recipients configured',
            suggestion: 'Configure email recipients',
          });
        }
        break;

      case 'database':
      case 'sql':
        if (!config.query && !config.operation) {
          issues.push({
            id: randomId(),
            type: 'warning',
            nodeId,
            message: 'Database node has no query configured',
            suggestion: 'Configure a database query or operation',
          });
        }
        break;
    }

    return issues;
  },

  // Validate single edge
  validateEdge: (edgeId: string) => {
    const state = get();
    const edge = state.edges.find(e => e.id === edgeId);
    const issues: ValidationIssue[] = [];

    if (!edge) {
      issues.push({
        id: randomId(),
        type: 'error',
        edgeId,
        message: 'Edge not found',
      });
      return issues;
    }

    const nodeIds = new Set(state.nodes.map(n => n.id));

    if (!nodeIds.has(edge.source)) {
      issues.push({
        id: randomId(),
        type: 'error',
        edgeId,
        message: 'Edge source node does not exist',
        details: `Source: ${edge.source}`,
      });
    }

    if (!nodeIds.has(edge.target)) {
      issues.push({
        id: randomId(),
        type: 'error',
        edgeId,
        message: 'Edge target node does not exist',
        details: `Target: ${edge.target}`,
      });
    }

    return issues;
  },

  // Clear validation results
  clearValidation: () => set({ lastValidation: null }),

  // Toggle auto-validation
  setAutoValidate: (enabled: boolean) => set({ autoValidate: enabled }),

  // Update validation rules
  updateValidationRules: (rules: Partial<ValidationRuleConfig>) =>
    set((state) => ({
      validationRules: { ...state.validationRules, ...rules },
    })),

  // Validate data integrity (from workflowMetaSlice)
  validateDataIntegrity: () => {
    const state = get();
    const issues: string[] = [];
    const { nodes, edges, workflows } = state;

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
    if (workflows) {
      Object.values(workflows).forEach((workflow) => {
        if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
          issues.push(`Workflow ${workflow.id} has malformed nodes`);
        }
        if (!workflow.edges || !Array.isArray(workflow.edges)) {
          issues.push(`Workflow ${workflow.id} has malformed edges`);
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  },
});
