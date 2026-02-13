/**
 * Persist Configuration
 * Defines what parts of state to persist and how to handle rehydration
 */

import { logger } from '../../services/SimpleLogger';
import { configService } from '../../services/ConfigService';

/**
 * Partialize function for persist middleware
 * Defines which parts of the store state should be persisted to localStorage
 */
export const partializeState = <T extends Record<string, unknown>>(state: T): Partial<T> => {
  try {
    return {
      // Workflow metadata
      workflows: (state as Record<string, unknown>).workflows || {},
      currentWorkflowId: (state as Record<string, unknown>).currentWorkflowId,
      workflowName: (state as Record<string, unknown>).workflowName,
      workflowTemplates: (state as Record<string, unknown>).workflowTemplates || {},
      workflowVersions: (state as Record<string, unknown>).workflowVersions || {},

      // Core data (limited for performance)
      nodes: (state as Record<string, unknown>).nodes || [],
      edges: (state as Record<string, unknown>).edges || [],
      nodeGroups: (state as Record<string, unknown>).nodeGroups || [],
      stickyNotes: (state as Record<string, unknown>).stickyNotes || [],

      // Credentials and config
      credentials: (state as Record<string, unknown>).credentials || {},
      globalVariables: (state as Record<string, unknown>).globalVariables || {},
      environments: (state as Record<string, unknown>).environments || configService.getAllEnvironments(),
      currentEnvironment: (state as Record<string, unknown>).currentEnvironment || 'dev',

      // UI preferences
      darkMode: Boolean((state as Record<string, unknown>).darkMode),

      // Execution history (limited)
      executionHistory: (((state as Record<string, unknown>).executionHistory as unknown[]) || []).slice(0, 50),
      executionStats: (state as Record<string, unknown>).executionStats || {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        nodeStats: {},
        errorStats: {}
      },

      // Scheduling and webhooks
      webhookEndpoints: (state as Record<string, unknown>).webhookEndpoints || {},
      scheduledJobs: (state as Record<string, unknown>).scheduledJobs || {},

      // Collaboration
      collaborators: (state as Record<string, unknown>).collaborators || [],

      // Debug settings
      breakpoints: (state as Record<string, unknown>).breakpoints || {},
      expressions: (state as Record<string, unknown>).expressions || {},
      customFunctions: (state as Record<string, unknown>).customFunctions || {},
      testSessions: (state as Record<string, unknown>).testSessions || {},

      // Pinned data
      pinnedData: (state as Record<string, unknown>).pinnedData || {},

      // System metrics and alerts (limited)
      systemMetrics: (state as Record<string, unknown>).systemMetrics || {
        cpu: 0,
        memory: 0,
        uptime: 0,
        requestCount: 0,
        errorCount: 0,
        lastBackup: null
      },
      alerts: (((state as Record<string, unknown>).alerts as unknown[]) || []).slice(0, 100),
    } as Partial<T>;
  } catch (error) {
    logger.error('Error preparing data for persistence:', error);
    return {
      workflows: {},
      globalVariables: {},
      environments: configService.getAllEnvironments(),
      credentials: {},
      darkMode: false
    } as Partial<T>;
  }
};

/**
 * Rehydration callback
 * Called when store state is loaded from storage
 */
export const onRehydrateStorage = () => <T>(state: T | undefined, error?: unknown) => {
  if (error) {
    logger.error('Storage rehydration failed:', error);
  } else if (state) {
    logger.info('Storage rehydrated successfully');
  }
};
