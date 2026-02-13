/**
 * PLAN C PHASE 3 - Refactoring: Execution Management Store
 * Extracted from monolithic workflowStore.ts
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { logger } from '../../services/LoggingService';
import { eventNotificationService } from '../../services/EventNotificationService';

export interface ExecutionResult {
  success: boolean;
  data: any;
  error?: string;
  executedAt: number;
  duration?: number;
  updateSequence?: number;
}

export interface NodeExecutionData {
  input: any;
  output: any;
  startTime: number;
  endTime?: number;
  updateCount: number;
  updateSequence?: number;
}

export type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface ExecutionHistoryEntry {
  id: string;
  workflowId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'failed';
  results: Record<string, ExecutionResult>;
  errors: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ExecutionState {
  isExecuting: boolean;
  currentExecutingNode: string | null;
  executionResults: Record<string, ExecutionResult>;
  executionErrors: Record<string, any>;
  nodeExecutionData: Record<string, NodeExecutionData>;
  nodeExecutionStatus: Record<string, NodeExecutionStatus>;
  executionHistory: ExecutionHistoryEntry[];
  breakpoints: Set<string>;
  stepByStep: boolean;
  pausedAt: string | null;
  
  // Actions
  setIsExecuting: (isExecuting: boolean) => void;
  setCurrentExecutingNode: (nodeId: string | null) => void;
  setExecutionResult: (nodeId: string, result: ExecutionResult) => void;
  setExecutionError: (nodeId: string, error: any) => void;
  setNodeExecutionData: (nodeId: string, data: Partial<NodeExecutionData>) => void;
  setNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  
  // Bulk operations
  batchUpdateExecutionResults: (updates: Array<{ nodeId: string; result: ExecutionResult }>) => void;
  clearExecution: () => void;
  clearNodeStatuses: () => void;
  
  // History
  addExecutionToHistory: (execution: Omit<ExecutionHistoryEntry, 'id'>) => void;
  clearExecutionHistory: () => void;
  getExecutionHistory: (limit?: number) => ExecutionHistoryEntry[];
  
  // Debugging
  toggleBreakpoint: (nodeId: string) => void;
  clearBreakpoints: () => void;
  setStepByStep: (enabled: boolean) => void;
  pauseAt: (nodeId: string) => void;
  resume: () => void;
  
  // Statistics
  getExecutionStats: () => {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    lastExecution: ExecutionHistoryEntry | null;
  };
  
  // Real-time updates
  updateExecutionProgress: (progress: number) => void;
  getNodeExecutionTime: (nodeId: string) => number | null;
}

export const useExecutionStore = create<ExecutionState>()(
  subscribeWithSelector((set, get) => ({
    isExecuting: false,
    currentExecutingNode: null,
    executionResults: {},
    executionErrors: {},
    nodeExecutionData: {},
    nodeExecutionStatus: {},
    executionHistory: [],
    breakpoints: new Set(),
    stepByStep: false,
    pausedAt: null,
    
    setIsExecuting: (isExecuting) => {
      set({ isExecuting });
      eventNotificationService.notify('execution.status', { isExecuting });
      logger.info(`Execution ${isExecuting ? 'started' : 'stopped'}`);
    },
    
    setCurrentExecutingNode: (nodeId) => {
      set({ currentExecutingNode: nodeId });
      
      if (nodeId) {
        eventNotificationService.notify('execution.node', { nodeId });
        logger.debug(`Executing node: ${nodeId}`);
      }
    },
    
    setExecutionResult: (nodeId, result) => {
      set((state) => {
        const newResults = {
          ...state.executionResults,
          [nodeId]: {
            ...result,
            updateSequence: (state.executionResults[nodeId]?.updateSequence || 0) + 1
          }
        };
        
        // Update node status based on result
        const newStatus = result.success ? 'success' : 'error';
        const newStatuses = {
          ...state.nodeExecutionStatus,
          [nodeId]: newStatus as NodeExecutionStatus
        };
        
        eventNotificationService.notify('execution.result', { nodeId, result });
        logger.debug(`Node ${nodeId} execution result:`, result.success ? 'success' : 'failed');
        
        return {
          executionResults: newResults,
          nodeExecutionStatus: newStatuses
        };
      });
    },
    
    setExecutionError: (nodeId, error) => {
      set((state) => {
        const errorData = {
          message: error.message || error,
          stack: error.stack,
          timestamp: Date.now()
        };
        
        const newErrors = {
          ...state.executionErrors,
          [nodeId]: errorData
        };
        
        const newStatuses = {
          ...state.nodeExecutionStatus,
          [nodeId]: 'error' as NodeExecutionStatus
        };
        
        eventNotificationService.notify('execution.error', { nodeId, error: errorData });
        logger.error(`Node ${nodeId} execution error:`, error);
        
        return {
          executionErrors: newErrors,
          nodeExecutionStatus: newStatuses
        };
      });
    },
    
    setNodeExecutionData: (nodeId, data) => {
      set((state) => {
        const existing = state.nodeExecutionData[nodeId] || {
          input: null,
          output: null,
          startTime: Date.now(),
          updateCount: 0
        };
        
        const newData = {
          ...existing,
          ...data,
          updateCount: existing.updateCount + 1,
          updateSequence: (existing.updateSequence || 0) + 1
        };
        
        return {
          nodeExecutionData: {
            ...state.nodeExecutionData,
            [nodeId]: newData
          }
        };
      });
    },
    
    setNodeStatus: (nodeId, status) => {
      set((state) => ({
        nodeExecutionStatus: {
          ...state.nodeExecutionStatus,
          [nodeId]: status
        }
      }));
      
      eventNotificationService.notify('node.status', { nodeId, status });
      logger.debug(`Node ${nodeId} status: ${status}`);
    },
    
    batchUpdateExecutionResults: (updates) => {
      set((state) => {
        const newResults = { ...state.executionResults };
        const newStatuses = { ...state.nodeExecutionStatus };
        
        updates.forEach(({ nodeId, result }) => {
          newResults[nodeId] = {
            ...result,
            updateSequence: (newResults[nodeId]?.updateSequence || 0) + 1
          };
          newStatuses[nodeId] = result.success ? 'success' : 'error';
        });
        
        logger.info(`Batch updated ${updates.length} execution results`);
        
        return {
          executionResults: newResults,
          nodeExecutionStatus: newStatuses
        };
      });
    },
    
    clearExecution: () => {
      set({
        isExecuting: false,
        currentExecutingNode: null,
        executionResults: {},
        executionErrors: {},
        nodeExecutionData: {},
        nodeExecutionStatus: {},
        pausedAt: null
      });
      
      eventNotificationService.notify('execution.cleared', {});
      logger.info('Execution state cleared');
    },
    
    clearNodeStatuses: () => {
      set({ nodeExecutionStatus: {} });
    },
    
    addExecutionToHistory: (execution) => {
      set((state) => {
        const entry: ExecutionHistoryEntry = {
          ...execution,
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        const newHistory = [entry, ...state.executionHistory].slice(0, 100); // Keep last 100
        
        eventNotificationService.notify('execution.history', { entry });
        logger.info(`Added execution to history: ${entry.id}`);
        
        return { executionHistory: newHistory };
      });
    },
    
    clearExecutionHistory: () => {
      set({ executionHistory: [] });
      logger.info('Execution history cleared');
    },
    
    getExecutionHistory: (limit = 10) => {
      return get().executionHistory.slice(0, limit);
    },
    
    toggleBreakpoint: (nodeId) => {
      set((state) => {
        const newBreakpoints = new Set(state.breakpoints);
        
        if (newBreakpoints.has(nodeId)) {
          newBreakpoints.delete(nodeId);
          logger.debug(`Removed breakpoint at node ${nodeId}`);
        } else {
          newBreakpoints.add(nodeId);
          logger.debug(`Added breakpoint at node ${nodeId}`);
        }
        
        return { breakpoints: newBreakpoints };
      });
    },
    
    clearBreakpoints: () => {
      set({ breakpoints: new Set() });
      logger.info('All breakpoints cleared');
    },
    
    setStepByStep: (enabled) => {
      set({ stepByStep: enabled });
      logger.info(`Step-by-step mode: ${enabled ? 'enabled' : 'disabled'}`);
    },
    
    pauseAt: (nodeId) => {
      set({ pausedAt: nodeId });
      eventNotificationService.notify('execution.paused', { nodeId });
      logger.info(`Execution paused at node ${nodeId}`);
    },
    
    resume: () => {
      set({ pausedAt: null });
      eventNotificationService.notify('execution.resumed', {});
      logger.info('Execution resumed');
    },
    
    getExecutionStats: () => {
      const state = get();
      const history = state.executionHistory;
      
      if (history.length === 0) {
        return {
          totalExecutions: 0,
          successRate: 0,
          averageDuration: 0,
          lastExecution: null
        };
      }
      
      const completedExecutions = history.filter(e => e.status !== 'running');
      const successfulExecutions = completedExecutions.filter(e => e.status === 'completed');
      
      const totalDuration = completedExecutions.reduce((sum, e) => {
        const duration = e.endTime ? e.endTime - e.startTime : 0;
        return sum + duration;
      }, 0);
      
      return {
        totalExecutions: history.length,
        successRate: completedExecutions.length > 0 
          ? (successfulExecutions.length / completedExecutions.length) * 100 
          : 0,
        averageDuration: completedExecutions.length > 0 
          ? totalDuration / completedExecutions.length 
          : 0,
        lastExecution: history[0] || null
      };
    },
    
    updateExecutionProgress: (progress) => {
      eventNotificationService.notify('execution.progress', { progress });
    },
    
    getNodeExecutionTime: (nodeId) => {
      const state = get();
      const data = state.nodeExecutionData[nodeId];
      
      if (!data) return null;
      
      if (data.endTime) {
        return data.endTime - data.startTime;
      }
      
      if (state.currentExecutingNode === nodeId) {
        return Date.now() - data.startTime;
      }
      
      return null;
    }
  }))
);