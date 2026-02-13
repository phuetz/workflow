/**
 * Custom hook for workflow execution
 * Extracted from WorkflowEditor to reduce complexity
 */

import { useCallback } from 'react';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';
import { WorkflowExecutor } from '../components/ExecutionEngine';
import { logger } from '../services/SimpleLogger';
import { showValidationErrors } from '../utils/workflowEditorHelpers';

interface UseWorkflowExecutionProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  validateWorkflow: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => string[];
  clearExecution: () => void;
  clearNodeStatuses: () => void;
  setIsExecuting: (isExecuting: boolean) => void;
  setCurrentExecutingNode: (nodeId: string | null) => void;
  setNodeStatus: (nodeId: string, status: string) => void;
  setExecutionResult: (nodeId: string, result: unknown) => void;
  setNodeExecutionData: (nodeId: string, data: { input: unknown; output: unknown }) => void;
  setExecutionError: (nodeId: string, error: Error | unknown) => void;
  addExecutionToHistory: (execution: {
    workflowId: string;
    timestamp: string;
    duration: number;
    status: string;
    nodesExecuted: number;
    errors: number;
    environment: string;
  }) => void;
  addLog: (log: { level: string; message: string; data?: unknown }) => void;
  globalVariables: Record<string, unknown>;
  environments: Record<string, unknown>;
  currentEnvironment: string;
  credentials: Record<string, unknown>;
  workflows: Record<string, unknown>;
}

export function useWorkflowExecution({
  nodes,
  edges,
  validateWorkflow,
  clearExecution,
  clearNodeStatuses,
  setIsExecuting,
  setCurrentExecutingNode,
  setNodeStatus,
  setExecutionResult,
  setNodeExecutionData,
  setExecutionError,
  addExecutionToHistory,
  addLog,
  globalVariables,
  environments,
  currentEnvironment,
  credentials,
  workflows,
}: UseWorkflowExecutionProps) {
  const executeWorkflow = useCallback(async () => {
    const errors = validateWorkflow(nodes, edges);
    if (errors.length > 0) {
      showValidationErrors(errors);
      return;
    }

    clearExecution();
    clearNodeStatuses();
    setIsExecuting(true);

    const startTime = Date.now();
    const executor = new WorkflowExecutor(nodes, edges, {
      globalVariables,
      environment: environments[currentEnvironment],
      credentials,
      loadWorkflow: async (id: string) => {
        const workflow = workflows[id];
        if (!workflow || typeof workflow !== 'object') {
          throw new Error(`Workflow ${id} not found`);
        }
        return workflow as { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
      },
    });

    try {
      const resultsMap = await executor.execute(
        (nodeId: string) => {
          setCurrentExecutingNode(nodeId);
          setNodeStatus(nodeId, 'running');
        },
        (nodeId: string, input: unknown, result: unknown) => {
          setExecutionResult(nodeId, result);
          setNodeExecutionData(nodeId, { input, output: result });
          setNodeStatus(nodeId, 'success');
          setCurrentExecutingNode(null);
        },
        (nodeId: string, error: Error | unknown) => {
          setExecutionError(nodeId, error);
          setNodeStatus(nodeId, 'error');
          setCurrentExecutingNode(null);
        }
      );

      // Calculate summary statistics from results map
      const nodesExecuted = resultsMap.size;
      const errors = Array.from(resultsMap.values()).filter(r => r.status === 'error').length;
      const status = errors === 0 ? 'success' : 'error';
      const duration = Date.now() - startTime;

      addExecutionToHistory({
        workflowId: 'current',
        timestamp: new Date().toISOString(),
        duration: duration,
        status: status,
        nodesExecuted: nodesExecuted,
        errors: errors,
        environment: currentEnvironment
      });

      addLog({
        level: status === 'success' ? 'info' : 'error',
        message: `Workflow ${status === 'success' ? 'exécuté avec succès' : 'terminé avec des erreurs'}`,
        data: { duration: duration, nodes: nodesExecuted }
      });

    } catch (error) {
      logger.error('Erreur d\'exécution:', error);
      addLog({
        level: 'error',
        message: 'Erreur critique d\'exécution',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
    } finally {
      setIsExecuting(false);
      setCurrentExecutingNode(null);
    }
  }, [
    nodes,
    edges,
    validateWorkflow,
    clearExecution,
    clearNodeStatuses,
    setIsExecuting,
    setCurrentExecutingNode,
    setNodeStatus,
    setExecutionResult,
    setNodeExecutionData,
    setExecutionError,
    addExecutionToHistory,
    addLog,
    globalVariables,
    environments,
    currentEnvironment,
    credentials,
    workflows,
  ]);

  return { executeWorkflow };
}
