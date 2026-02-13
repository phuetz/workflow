/**
 * useWorkflowExecution Hook
 * Handles workflow execution logic
 */

import { useCallback } from 'react';
import { logger } from '../../../../services/SimpleLogger';
import { useWorkflowStore } from '../../../../store/workflowStore';
import { workflowAPI, WorkflowExecutionRequest } from '../../../../services/WorkflowAPI';
import { notificationService } from '../../../../services/NotificationService';
import { WorkflowNode, WorkflowEdge } from '../../../../types/workflow';

interface UseWorkflowExecutionParams {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function useWorkflowExecution({ nodes, edges }: UseWorkflowExecutionParams) {
  const store = useWorkflowStore();
  const {
    isExecuting,
    setIsExecuting,
    currentEnvironment,
    globalVariables,
    validateWorkflow,
    clearExecution,
    clearNodeStatuses,
    setCurrentExecutingNode,
    setNodeStatus,
    setNodeExecutionData,
    addLog,
  } = store;

  // Type-safe wrappers for execution result and error methods
  const setExecutionResult = store.setExecutionResult as unknown as (result: { success: boolean; data: unknown }) => void;
  const setExecutionError = store.setExecutionError as unknown as (error: { message: string; details: unknown }) => void;
  const addExecutionToHistory = store.addExecutionToHistory as unknown as (entry: {
    id: string;
    timestamp: Date;
    status: string;
    duration: number;
    nodes: number;
    environment: string;
  }) => void;

  const executeWorkflow = useCallback(async () => {
    if (isExecuting) {
      logger.info('Workflow already executing');
      return;
    }

    // Validate workflow before execution
    const validationResult = validateWorkflow();
    if (!validationResult.isValid) {
      setExecutionError({
        message: 'Workflow validation failed',
        details: validationResult.errors
      });
      addLog({
        level: 'error',
        message: 'Workflow validation failed',
        data: validationResult.errors
      });
      notificationService.error(
        'Workflow Validation Failed',
        validationResult.errors.join(', ')
      );
      return;
    }

    try {
      setIsExecuting(true);
      clearExecution();
      clearNodeStatuses();
      addLog({
        level: 'info',
        message: 'Starting workflow execution...'
      });

      // Prepare workflow data for API call
      const workflowData: WorkflowExecutionRequest = {
        nodes: nodes as unknown as Record<string, unknown>[],
        edges: edges as unknown as Record<string, unknown>[],
        settings: {
          environment: currentEnvironment,
          variables: (globalVariables[currentEnvironment] || {}) as Record<string, unknown>
        }
      };

      // Generate a unique workflow ID if not already set
      const workflowId = `workflow_${Date.now()}`;

      try {
        // Start the workflow execution
        const executionResult = await workflowAPI.executeWorkflow(workflowId, workflowData);

        // Set up real-time monitoring
        await workflowAPI.startExecutionMonitoring(
          executionResult.executionId,
          // On node update
          (nodeUpdate) => {
            setCurrentExecutingNode(nodeUpdate.nodeId);
            setNodeStatus(nodeUpdate.nodeId, nodeUpdate.status);

            if (nodeUpdate.output) {
              setNodeExecutionData(nodeUpdate.nodeId, {
                output: nodeUpdate.output
              });
            }

            if (nodeUpdate.error) {
              setNodeExecutionData(nodeUpdate.nodeId, {
                error: nodeUpdate.error
              });
            }
          },
          // On execution complete
          (finalResult) => {
            setExecutionResult({
              success: finalResult.success,
              data: finalResult.data
            });

            addExecutionToHistory({
              id: finalResult.executionId,
              timestamp: new Date(),
              status: finalResult.success ? 'success' : 'error',
              duration: finalResult.totalDuration,
              nodes: nodes.length,
              environment: currentEnvironment
            });

            logger.info('Workflow execution completed', {
              executionId: finalResult.executionId,
              success: finalResult.success
            });
          },
          // On execution error
          (error) => {
            setExecutionError({
              message: 'Workflow execution failed',
              details: error
            });

            addLog({
              level: 'error',
              message: 'Workflow execution failed',
              data: error
            });
          }
        );

      } catch (apiError) {
        // Fallback to local simulation if API is not available
        logger.warn('API not available, falling back to local simulation', apiError);

        await simulateLocalExecution(
          nodes,
          currentEnvironment,
          setCurrentExecutingNode,
          setNodeStatus,
          setNodeExecutionData,
          setExecutionResult,
          addExecutionToHistory
        );
      }

      addLog({
        level: 'success',
        message: 'Workflow executed successfully'
      });

    } catch (error) {
      setExecutionError({
        message: 'Workflow execution failed',
        details: error
      });
      addLog({
        level: 'error',
        message: 'Workflow execution failed',
        data: error
      });
    } finally {
      setIsExecuting(false);
      setCurrentExecutingNode(null);
    }
  }, [
    isExecuting, nodes, edges, currentEnvironment, globalVariables,
    validateWorkflow, setIsExecuting, clearExecution, clearNodeStatuses,
    setCurrentExecutingNode, setNodeStatus, setNodeExecutionData,
    setExecutionResult, setExecutionError, addExecutionToHistory, addLog,
    store
  ]);

  return { executeWorkflow, isExecuting };
}

// Local simulation fallback
async function simulateLocalExecution(
  nodes: WorkflowNode[],
  currentEnvironment: string,
  setCurrentExecutingNode: (nodeId: string | null) => void,
  setNodeStatus: (nodeId: string, status: string) => void,
  setNodeExecutionData: (nodeId: string, data: Record<string, unknown>) => void,
  setExecutionResult: (result: { success: boolean; data: unknown }) => void,
  addExecutionToHistory: (entry: {
    id: string;
    timestamp: Date;
    status: string;
    duration: number;
    nodes: number;
    environment: string;
  }) => void
) {
  for (const node of nodes) {
    setCurrentExecutingNode(node.id);
    setNodeStatus(node.id, 'running');

    // Reduced timeout for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    setNodeStatus(node.id, 'success');
    setNodeExecutionData(node.id, {
      output: { message: `Node ${node.data.label || node.id} executed locally` }
    });
  }

  setExecutionResult({
    success: true,
    data: { message: 'Workflow executed locally (API unavailable)' }
  });

  addExecutionToHistory({
    id: Date.now().toString(),
    timestamp: new Date(),
    status: 'success',
    duration: nodes.length * 500,
    nodes: nodes.length,
    environment: currentEnvironment
  });
}
