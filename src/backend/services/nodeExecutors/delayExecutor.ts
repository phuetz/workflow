/**
 * Delay Node Executor
 * Adds delays to workflow execution
 */

import { Node } from '@xyflow/react';
import { NodeExecutor } from './index';
import { logger } from '../../../services/SimpleLogger';

export const delayExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    // Cast context to specific type
    const ctx = context as Record<string, unknown>;

    // Extract config from node data
    const config = (node.data?.config || {}) as { delay?: number; unit?: string };

    const {
      delay = 1000,
      unit = 'milliseconds'
    } = config;

    // Maximum delay: 24 hours in milliseconds
    const maxDelay = 24 * 60 * 60 * 1000;

    // Convert to milliseconds
    let delayMs = delay;
    switch (unit) {
      case 'seconds':
        delayMs = delay * 1000;
        break;
      case 'minutes':
        delayMs = delay * 60 * 1000;
        break;
      case 'hours':
        delayMs = delay * 60 * 60 * 1000;
        break;
      case 'milliseconds':
      default:
        delayMs = delay;
        break;
    }

    // Limit maximum delay to 24 hours
    if (delayMs > maxDelay) {
      throw new Error(`Delay cannot exceed 24 hours (requested: ${delayMs}ms)`);
    }

    logger.info(`⏱️ Delaying execution for ${delayMs}ms`);

    // Wait for the specified delay
    await new Promise<void>(resolve => setTimeout(resolve, delayMs));

    // Pass through the input data
    return {
      ...(ctx.input as Record<string, unknown>),
      delayed: true,
      delayDuration: delayMs
    };
  },

  validate(node: Node): string[] {
    const errors: string[] = [];

    // Extract config from node data
    const config = (node.data?.config || {}) as { delay?: number; unit?: string };

    if (config.delay === undefined || config.delay < 0) {
      errors.push('Delay must be a positive number');
    }

    if (!['milliseconds', 'seconds', 'minutes', 'hours'].includes(config.unit || 'milliseconds')) {
      errors.push('Invalid time unit');
    }

    return errors;
  }
};