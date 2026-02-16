/**
 * Delay Node Executor
 * Adds delays to workflow execution
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { logger } from '../../../services/SimpleLogger';

export const delayExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};

    const delay = (config.delay || 1000) as number;
    const unit = (config.unit || 'milliseconds') as string;

    const maxDelay = 24 * 60 * 60 * 1000;

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

    if (delayMs > maxDelay) {
      throw new Error(`Delay cannot exceed 24 hours (requested: ${delayMs}ms)`);
    }

    logger.info(`Delaying execution for ${delayMs}ms`);

    await new Promise<void>(resolve => setTimeout(resolve, delayMs));

    return {
      success: true,
      data: {
        ...(typeof context.input === 'object' && context.input !== null ? context.input : {}),
        delayed: true,
        delayDuration: delayMs
      },
      timestamp: new Date().toISOString(),
    };
  },
};
