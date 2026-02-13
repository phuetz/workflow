import { StateCreator } from 'zustand';
import { logger } from '../../services/SimpleLogger';

export interface ExecutionResult {
  data?: any;
  timestamp?: string;
  updateSequence?: number;
  receivedAt?: string;
  nodeId?: string;
}

export interface ExecutionError {
  message?: string;
  timestamp?: string;
  errorId?: string;
  sequence?: number;
}

export interface ExecutionHistory {
  id: string;
  workflowId: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  results?: any;
  errors?: any;
}

export interface ExecutionSlice {
  // State
  isExecuting: boolean;
  executionResults: Record<string, ExecutionResult>;
  executionErrors: Record<string, ExecutionError>;
  nodeExecutionData: Record<string, any>;
  nodeExecutionStatus: Record<string, string>;
  currentExecutingNode: string | null;
  executionHistory: ExecutionHistory[];
  executionLogs: any[];
  executionStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    nodeStats: Record<string, any>;
    errorStats: Record<string, any>;
  };

  // Actions
  setIsExecuting: (isExecuting: boolean) => void;
  setCurrentExecutingNode: (nodeId: string | null) => void;
  setExecutionResult: (nodeId: string, result: ExecutionResult) => void;
  setNodeExecutionData: (nodeId: string, data: any) => void;
  setExecutionError: (nodeId: string, error: ExecutionError) => void;
  setNodeStatus: (nodeId: string, status: string) => void;
  clearNodeStatuses: () => void;
  clearExecution: () => Promise<void>;
  addExecutionToHistory: (execution: ExecutionHistory) => Promise<void>;
  addLog: (log: any) => void;
  searchLogs: (query: string) => any[];
  batchExecutionUpdates: (updates: Array<{
    type: 'result' | 'error' | 'status' | 'data';
    nodeId: string;
    payload: any;
  }>) => Promise<void>;
  updateExecutionState: (nodeId: string, updates: {
    status?: string;
    result?: any;
    error?: any;
    data?: any;
  }) => void;
}

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

export const createExecutionSlice: StateCreator<
  ExecutionSlice,
  [],
  [],
  ExecutionSlice
> = (set, get) => ({
  // Initial state
  isExecuting: false,
  executionResults: {},
  executionErrors: {},
  nodeExecutionData: {},
  nodeExecutionStatus: {},
  currentExecutingNode: null,
  executionHistory: [],
  executionLogs: [],
  executionStats: {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    nodeStats: {},
    errorStats: {},
  },

  // Actions
  setIsExecuting: (isExecuting) => set({ isExecuting }),

  setCurrentExecutingNode: (nodeId) => set({ currentExecutingNode: nodeId }),

  setExecutionResult: (nodeId, result) => {
    set((state) => {
      const now = Date.now();
      const existingResult = state.executionResults[nodeId];
      const resultTimestamp = result.timestamp || new Date(now).toISOString();
      const incomingSequence = result.updateSequence || 0;
      const currentSequence = existingResult?.updateSequence || -1;

      if (incomingSequence <= currentSequence) {
        logger.warn(`Ignoring out-of-order execution result for node ${nodeId}`);
        return state;
      }

      if (existingResult && existingResult.timestamp &&
          new Date(existingResult.timestamp).getTime() > new Date(resultTimestamp).getTime()) {
        logger.warn(`Ignoring older execution result for node ${nodeId}`);
        return state;
      }

      const newResult = {
        ...result,
        timestamp: resultTimestamp,
        updateSequence: result.updateSequence || (currentSequence + 1),
        receivedAt: new Date(now).toISOString(),
        nodeId
      };

      return {
        ...state,
        executionResults: {
          ...state.executionResults,
          [nodeId]: newResult
        },
        lastExecutionUpdate: now
      } as any;
    });
  },

  setNodeExecutionData: (nodeId, data) => set((state) => {
    if (!nodeId || typeof nodeId !== 'string') {
      logger.error('Invalid nodeId provided to setNodeExecutionData');
      return state;
    }

    return {
      ...state,
      nodeExecutionData: {
        ...state.nodeExecutionData,
        [nodeId]: {
          ...data,
          lastUpdated: Date.now(),
          updateCount: (state.nodeExecutionData[nodeId]?.updateCount || 0) + 1
        }
      }
    };
  }),

  setExecutionError: (nodeId, error) => {
    set((state) => {
      const now = Date.now();
      const existingError = state.executionErrors[nodeId];

      if (existingError && existingError.timestamp && error.timestamp &&
          existingError.timestamp > error.timestamp) {
        logger.warn(`Ignoring older execution error for node ${nodeId}`);
        return state;
      }

      return {
        ...state,
        executionErrors: {
          ...state.executionErrors,
          [nodeId]: {
            ...error,
            timestamp: error.timestamp || new Date(now).toISOString(),
            errorId: `${nodeId}_${now}_${randomUUID().substring(0, 8)}`,
            sequence: (state.executionErrors[nodeId]?.sequence || 0) + 1
          }
        }
      };
    });
  },

  setNodeStatus: (nodeId, status) => set((state) => {
    const validTransitions: Record<string, string[]> = {
      'idle': ['running', 'skipped'],
      'running': ['success', 'error', 'cancelled'],
      'success': ['running'],
      'error': ['running'],
      'cancelled': ['running'],
      'skipped': []
    };

    const currentStatus = state.nodeExecutionStatus[nodeId];
    if (currentStatus && validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
      logger.warn(`Invalid status transition for node ${nodeId}: ${currentStatus} -> ${status}`);
      return state;
    }

    return {
      ...state,
      nodeExecutionStatus: {
        ...state.nodeExecutionStatus,
        [nodeId]: status
      }
    };
  }),

  clearNodeStatuses: () => set({ nodeExecutionStatus: {} }),

  clearExecution: async () => {
    return new Promise<void>((resolve) => {
      set((state) => {
        logger.info('Clearing execution state atomically');

        const clearedState = {
          ...state,
          executionResults: {},
          executionErrors: {},
          nodeExecutionData: {},
          nodeExecutionStatus: {},
          currentExecutingNode: null,
          isExecuting: false,
          lastExecutionClear: Date.now(),
          executionClearId: randomUUID()
        } as any;

        resolve();
        return clearedState;
      });
    });
  },

  addExecutionToHistory: async (execution) => {
    return new Promise<void>((resolve) => {
      set((state) => {
        if (!execution || typeof execution !== 'object') {
          logger.warn('Invalid execution data provided to addExecutionToHistory');
          resolve();
          return state;
        }

        const enhancedExecution = {
          ...execution,
          addedAt: Date.now(),
          historyId: randomUUID()
        };

        const updatedState = {
          ...state,
          executionHistory: [enhancedExecution, ...state.executionHistory].slice(0, 100),
          lastHistoryAdd: Date.now()
        } as any;

        resolve();
        return updatedState;
      });
    });
  },

  addLog: (log) => set((state) => {
    const newLog = {
      ...log,
      timestamp: new Date().toISOString(),
      id: `log_${Date.now()}`
    };

    const newLogs = [...state.executionLogs, newLog];
    const maxLogs = 100;

    return {
      executionLogs: newLogs.slice(-maxLogs)
    };
  }),

  searchLogs: (query) => {
    const logs = get().executionLogs;
    return logs.filter(log =>
      JSON.stringify(log).toLowerCase().includes(query.toLowerCase())
    );
  },

  batchExecutionUpdates: async (updates) => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    return new Promise<void>((resolve) => {
      set((state) => {
        const newState = { ...state };

        const validUpdates = updates.filter(update => {
          if (!update.nodeId || typeof update.nodeId !== 'string') {
            logger.warn(`Invalid nodeId in batch update: ${update.nodeId}`);
            return false;
          }
          return true;
        });

        validUpdates.forEach(update => {
          const existingResult = state.executionResults[update.nodeId];
          switch (update.type) {
            case 'result': {
              if (!existingResult || !existingResult.timestamp ||
                  !update.payload.timestamp || existingResult.timestamp <= update.payload.timestamp) {
                newState.executionResults = {
                  ...newState.executionResults,
                  [update.nodeId]: {
                    ...update.payload,
                    timestamp: update.payload.timestamp || new Date(now).toISOString(),
                    batchId
                  }
                };
              }
              break;
            }
            case 'status': {
              newState.nodeExecutionStatus = {
                ...newState.nodeExecutionStatus,
                [update.nodeId]: {
                  status: update.payload,
                  timestamp: now,
                  batchId
                } as any
              };
              break;
            }
            case 'error': {
              newState.executionErrors = {
                ...newState.executionErrors,
                [update.nodeId]: {
                  ...update.payload,
                  timestamp: update.payload.timestamp || new Date(now).toISOString(),
                  errorId: `${update.nodeId}_${now}_${randomUUID().substring(0, 8)}`,
                  batchId
                }
              };
              break;
            }
            case 'data': {
              newState.nodeExecutionData = {
                ...newState.nodeExecutionData,
                [update.nodeId]: {
                  ...update.payload,
                  lastUpdated: now,
                  batchId,
                  updateCount: (newState.nodeExecutionData[update.nodeId]?.updateCount || 0) + 1
                }
              };
              break;
            }
          }
        });

        (newState as any).lastBatchUpdate = {
          batchId,
          timestamp: now,
          updateCount: validUpdates.length,
          invalidUpdateCount: updates.length - validUpdates.length
        };

        logger.debug(`Processed batch ${batchId} with ${validUpdates.length} updates`);
        resolve();
        return newState;
      });
    });
  },

  updateExecutionState: (nodeId, updates) => {
    set((state) => {
      const now = Date.now();
      const newState = { ...state };

      if (updates.status !== undefined) {
        const validTransitions: Record<string, string[]> = {
          'idle': ['running', 'skipped'],
          'running': ['success', 'error', 'cancelled'],
          'success': ['running'],
          'error': ['running'],
          'cancelled': ['running'],
          'skipped': []
        };

        const currentStatus = state.nodeExecutionStatus[nodeId];
        if (!currentStatus || !validTransitions[currentStatus] || validTransitions[currentStatus].includes(updates.status)) {
          newState.nodeExecutionStatus = {
            ...state.nodeExecutionStatus,
            [nodeId]: updates.status
          };
        }
      }

      if (updates.result !== undefined) {
        const existingResult = state.executionResults[nodeId];
        if (!existingResult || !existingResult.timestamp || !updates.result.timestamp ||
            existingResult.timestamp <= updates.result.timestamp) {
          newState.executionResults = {
            ...state.executionResults,
            [nodeId]: {
              ...updates.result,
              timestamp: updates.result.timestamp || new Date(now).toISOString(),
              updateSequence: (existingResult?.updateSequence || 0) + 1
            }
          };
        }
      }

      if (updates.error !== undefined) {
        const existingError = state.executionErrors[nodeId];
        if (!existingError || !existingError.timestamp || !updates.error.timestamp ||
            existingError.timestamp <= updates.error.timestamp) {
          newState.executionErrors = {
            ...state.executionErrors,
            [nodeId]: {
              ...updates.error,
              timestamp: updates.error.timestamp || new Date(now).toISOString(),
              errorId: `${nodeId}_${now}_${randomUUID().substring(0, 9)}`,
              sequence: (existingError?.sequence || 0) + 1
            }
          };
        }
      }

      if (updates.data !== undefined) {
        newState.nodeExecutionData = {
          ...state.nodeExecutionData,
          [nodeId]: {
            ...updates.data,
            lastUpdated: now,
            updateCount: (state.nodeExecutionData[nodeId]?.updateCount || 0) + 1
          }
        };
      }

      return newState;
    });
  },
});
