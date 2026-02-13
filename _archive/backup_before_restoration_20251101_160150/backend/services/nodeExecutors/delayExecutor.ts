/**
 * Delay Node Executor
 * Adds delays to workflow execution
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';
import { logger } from '../../../services/LoggingService';

export const delayExecutor: NodeExecutor = {
  async execute(node: Node, context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const {
      delay = 1000,
      unit = 'milliseconds'
    } = config;

    // Convert to milliseconds
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
    }

    // Limit maximum delay to 24 hours
    if (delayMs > maxDelay) {
      throw new Error(`Delay cannot exceed 24 hours (requested: ${delayMs}ms)`);
    }

    logger.info(`⏱️ Delaying execution for ${delayMs}ms`);

    // Wait for the specified delay
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Pass through the input data
    return {
      ...context.input,
      delayed: true,
      delayDuration: delayMs
    };
  },

  validate(node: Node): string[] {
    const errors: string[] = [];

    if (config.delay === undefined || config.delay < 0) {
      errors.push('Delay must be a positive number');
    }

    if (!['milliseconds', 'seconds', 'minutes', 'hours'].includes(config.unit || 'milliseconds')) {
      errors.push('Invalid time unit');
    }

    return errors;
  }
};