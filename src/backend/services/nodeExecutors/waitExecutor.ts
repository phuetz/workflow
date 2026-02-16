/**
 * Wait Node Executor
 * Supports time-based waits and webhook resume
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import * as crypto from 'crypto';
import { logger } from '../../../services/SimpleLogger';

// In-memory storage for paused executions (in production, use database)
const pausedExecutions = new Map<string, {
  executionId: string;
  nodeId: string;
  context: NodeExecutionContext;
  createdAt: Date;
}>();

export function getPausedExecution(token: string) {
  return pausedExecutions.get(token);
}

export function removePausedExecution(token: string) {
  pausedExecutions.delete(token);
}

export const waitExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};

    const waitType = (config.waitType || 'time') as string;

    if (waitType === 'time') {
      const duration = (config.duration || 1000) as number;
      const unit = (config.unit || 'milliseconds') as string;

      let durationMs = duration;
      switch (unit) {
        case 'seconds': durationMs = duration * 1000; break;
        case 'minutes': durationMs = duration * 60 * 1000; break;
        case 'hours': durationMs = duration * 60 * 60 * 1000; break;
      }

      // Cap at 24 hours
      if (durationMs > 86400000) {
        throw new Error('Wait duration cannot exceed 24 hours');
      }

      logger.info(`Wait node: sleeping for ${durationMs}ms`);
      await new Promise(resolve => setTimeout(resolve, durationMs));

      return {
        success: true,
        data: {
          ...(typeof context.input === 'object' && context.input !== null ? context.input : {}),
          waited: true,
          waitDuration: durationMs,
        },
        timestamp: new Date().toISOString(),
      };
    }

    if (waitType === 'webhook') {
      // Generate a unique resume token
      const resumeToken = crypto.randomUUID();
      const baseUrl = process.env.BASE_URL || process.env.PUBLIC_URL || 'http://localhost:8082';
      const resumeUrl = `${baseUrl}/api/webhooks/resume/${resumeToken}`;

      // Store paused state
      pausedExecutions.set(resumeToken, {
        executionId: context.executionId,
        nodeId: context.nodeId,
        context,
        createdAt: new Date(),
      });

      logger.info('Wait node: paused for webhook resume', {
        executionId: context.executionId,
        nodeId: context.nodeId,
        resumeToken,
      });

      // Return paused result -- the execution engine should detect $paused
      return {
        success: true,
        data: {
          $paused: true,
          resumeUrl,
          resumeToken,
          message: 'Execution paused. POST to resumeUrl to continue.',
        },
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(`Unknown wait type: ${waitType}`);
  },
};
