/**
 * Workflow Import Service
 * Handles importing workflows from various formats and sources
 */

import { logger } from './LoggingService';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { nodeTypes } from '../data/nodeTypes';
import { EnhancedFileReader } from '../utils/fileReader';

export interface ImportedWorkflow {
  id: string;
  name: string;
  description?: string;
  version?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    author?: string;
    tags?: string[];
    category?: string;
  };
  settings?: {
    variables?: Record<string, unknown>;
    environment?: string;
    schedule?: Record<string, unknown>;
  };
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    nodeCount: number;
    edgeCount: number;
    supportedNodes: number;
    unsupportedNodes: string[];
  };
}

export class WorkflowImportService {
  /**
   * Import workflow from JSON data
   */
  async importFromJSON(jsonData: Record<string, unknown>): Promise<ImportedWorkflow> {
    logger.info('Starting workflow import from JSON');

    try {
      // Validate the JSON structure
      const validation = this.validateWorkflowData(jsonData);
      if (!validation.isValid) {
        throw new Error(`Invalid workflow format: ${validation.errors.join(', ')}`);
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('Workflow import warnings', validation.warnings);
      }

      // Process and normalize the workflow data
      const importedWorkflow = this.processWorkflowData(jsonData);

      // Track workflow import event
      const { analyticsService } = await import('../backend/services/analyticsService');
      analyticsService.trackEvent({
        type: 'workflow_created',
        timestamp: new Date(),
        workflowId: importedWorkflow.id,
        userId: 'current-user', // Would be passed as parameter in real implementation
        metadata: {
          workflowName: importedWorkflow.name,
          nodeCount: importedWorkflow.nodes.length,
          edgeCount: importedWorkflow.edges.length,
          isImported: true,
          originalFileName: 'unknown',
          fileSize: 0,
          processingTime: 0,
          hasValidationWarnings: validation.warnings.length > 0
        }
      });

      logger.info('Workflow import completed successfully', {
        workflowId: importedWorkflow.id,
        nodeCount: importedWorkflow.nodes.length,
        edgeCount: importedWorkflow.edges.length
      });

      return importedWorkflow;
    } catch (error) {
      logger.error('Workflow import failed', error);
      throw error;
    }
  }

  /**
   * Import workflow from file with enhanced error handling
   */
  async importFromFile(file: File, onProgress?: (loaded: number, total: number) => void): Promise<ImportedWorkflow> {
    try {
      logger.info('Starting workflow import from file', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // Use enhanced file reader with comprehensive options
      const fileReader = new EnhancedFileReader();
      const result = await fileReader.read(file, {
        maxSize: 50 * 1024 * 1024, // 50MB max
        allowedTypes: ['.json', 'application/json', 'json'],
        timeout: 60000, // 60 seconds timeout
        onProgress,
        validateContent: (content) => {
          // Basic JSON validation
          if (typeof content !== 'string') return false;
          const trimmed = content.trim();
          return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                 (trimmed.startsWith('[') && trimmed.endsWith(']'));
        }
      });

      if (!result.success) {
        throw new Error(`File reading failed: ${result.error}`);
      }

      // Parse and validate JSON
      let jsonData: Record<string, unknown>;
      try {
        jsonData = JSON.parse(result.data!);
      } catch (parseError) {
        logger.error('JSON parsing failed', { 
          fileName: file.name, 
          parseError,
          contentPreview: result.data!.substring(0, 100) 
        });
        throw new Error('Invalid JSON format - file may be corrupted or not a valid workflow file');
      }

      // Additional content validation
      if (!jsonData || typeof jsonData !== 'object') {
        throw new Error('Invalid workflow file - JSON content is not an object');
      }

      // Check for required workflow properties
      if (!jsonData.nodes && !jsonData.workflows) {
        logger.warn('No nodes or workflows found in file', { fileName: file.name });
        throw new Error('Invalid workflow file - no workflow data found');
      }

      // Import the workflow
      const workflow = await this.importFromJSON(jsonData);

      logger.info('Workflow import completed successfully', {
        fileName: file.name,
        workflowName: workflow.name,
        nodeCount: workflow.nodes.length,
        edgeCount: workflow.edges.length
      });

      return workflow;

    } catch (error) {
      logger.error('Workflow import from file failed', { 
        fileName: file?.name, 
        fileSize: file?.size,
        error 
      });
      
      // Provide more specific error messages
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Unknown error occurred during workflow import');
      }
    }
  }

  /**
   * Import workflow from URL
   */
  async importFromURL(url: string): Promise<ImportedWorkflow> {
    try {
      logger.info('Importing workflow from URL', { url });

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonData = await response.json();
      return await this.importFromJSON(jsonData);
    } catch (error) {
      logger.error('Failed to import workflow from URL', { url, error });
      throw error;
    }
  }

  /**
   * Validate workflow data structure
   */
  private validateWorkflowData(data: Record<string, unknown>): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const unsupportedNodes: string[] = [];

    // Check required fields
    if (!data || typeof data !== 'object') {
      errors.push('Invalid workflow data: must be an object');
      return {
        isValid: false,
        errors,
        warnings,
        summary: { nodeCount: 0, edgeCount: 0, supportedNodes: 0, unsupportedNodes: [] }
      };
    }

    // Check nodes
    let nodeCount = 0;
    let supportedNodes = 0;

    if (!Array.isArray(data.nodes)) {
      errors.push('Missing or invalid nodes array');
    } else {
      nodeCount = data.nodes.length;
      
      for (const node of data.nodes) {
        if (!node.id || !node.data?.type) {
          errors.push(`Invalid node structure: missing id or type`);
          continue;
        }

        // Check if node type is supported
        if (nodeTypes[node.data.type]) {
          supportedNodes++;
        } else {
          unsupportedNodes.push(node.data.type);
          warnings.push(`Unsupported node type: ${node.data.type}`);
        }

        // Check node position
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          warnings.push(`Node ${node.id} has invalid position`);
        }
      }
    }

    // Check edges
    let edgeCount = 0;

    if (!Array.isArray(data.edges)) {
      errors.push('Missing or invalid edges array');
    } else {
      edgeCount = data.edges.length;
      
      for (const edge of data.edges) {
        if (!edge.id || !edge.source || !edge.target) {
          errors.push(`Invalid edge structure: missing id, source, or target`);
        }
      }
    }

    // Check workflow metadata
    if (data.name && typeof data.name !== 'string') {
      warnings.push('Invalid workflow name: should be a string');
    }

    if (data.version && typeof data.version !== 'string') {
      warnings.push('Invalid version: should be a string');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        nodeCount,
        edgeCount,
        supportedNodes,
        unsupportedNodes: [...new Set(unsupportedNodes)]
      }
    };
  }

  /**
   * Process and normalize workflow data
   */
  private processWorkflowData(data: Record<string, unknown>): ImportedWorkflow {
    // Generate new IDs to avoid conflicts
    const nodeIdMap = new Map<string, string>();
    const generateNewId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Process nodes
    const processedNodes: WorkflowNode[] = (data.nodes as Record<string, unknown>[]).map((node: Record<string, unknown>) => {
      const newId = generateNewId();
      nodeIdMap.set(node.id as string, newId);

      return {
        id: newId,
        type: 'custom',
        position: node.position || { x: 0, y: 0 },
        data: {
          label: node.data?.label || nodeTypes[node.data?.type]?.label || 'Unknown Node',
          type: node.data?.type,
          config: node.data?.config || {},
          category: node.data?.category || nodeTypes[node.data?.type]?.category,
          ...node.data
        },
        style: node.style,
        className: node.className,
        hidden: node.hidden,
        selected: false, // Reset selection state
        dragging: false, // Reset dragging state
      };
    });

    // Process edges with updated node IDs
    const processedEdges: WorkflowEdge[] = (data.edges as Record<string, unknown>[]).map((edge: Record<string, unknown>) => ({
      id: generateNewId(),
      source: nodeIdMap.get(edge.source as string) || edge.source,
      target: nodeIdMap.get(edge.target as string) || edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      style: edge.style,
      label: edge.label,
      labelStyle: edge.labelStyle,
      labelShowBg: edge.labelShowBg,
      labelBgStyle: edge.labelBgStyle,
      animated: edge.animated || false,
      hidden: edge.hidden,
      data: edge.data,
    }));

    // Create workflow object
    const workflow: ImportedWorkflow = {
      id: data.id || generateNewId(),
      name: data.name || 'Imported Workflow',
      description: data.description,
      version: data.version || '1.0.0',
      nodes: processedNodes,
      edges: processedEdges,
      metadata: {
        createdAt: data.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: data.metadata?.author || 'Unknown',
        tags: data.metadata?.tags || [],
        category: data.metadata?.category || 'imported',
      },
      settings: {
        variables: data.settings?.variables || {},
        environment: data.settings?.environment || 'development',
        schedule: data.settings?.schedule,
      }
    };

    return workflow;
  }

  /**
   * Export workflow to JSON format
   */
  exportToJSON(workflow: {
    id: string;
    name: string;
    description?: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    settings?: Record<string, unknown>;
  }): string {
    const exportData = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      version: '1.0.0',
      nodes: workflow.nodes,
      edges: workflow.edges,
      metadata: {
        createdAt: new Date().toISOString(),
        exportedAt: new Date().toISOString(),
        author: 'Workflow Builder',
        format: 'workflow-builder-v1'
      },
      settings: workflow.settings || {}
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate import summary for user confirmation
   */
  generateImportSummary(workflow: ImportedWorkflow, validation: ImportValidationResult): string {
    const lines = [
      `Workflow: ${workflow.name}`,
      `Nodes: ${validation.summary.nodeCount} (${validation.summary.supportedNodes} supported)`,
      `Connections: ${validation.summary.edgeCount}`,
    ];

    if (validation.summary.unsupportedNodes.length > 0) {
      lines.push(`Unsupported nodes: ${validation.summary.unsupportedNodes.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      lines.push(`Warnings: ${validation.warnings.length}`);
    }

    return lines.join('\n');
  }
}

// Singleton instance
export const workflowImportService = new WorkflowImportService();