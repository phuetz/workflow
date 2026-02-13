/**
 * Node Executors Registry
 * Maps node types to their execution logic
 */

import { Node } from '@xyflow/react';
import { httpRequestExecutor } from './httpRequestExecutor';
import { emailExecutor } from './emailExecutor';
import { databaseExecutor } from './databaseExecutor';
import { transformExecutor } from './transformExecutor';
import { filterExecutor } from './filterExecutor';
import { delayExecutor } from './delayExecutor';
import { webhookExecutor } from './webhookExecutor';
import { aiExecutor } from './aiExecutor';
import { scheduleExecutor } from './scheduleExecutor';
import { triggerExecutor } from './triggerExecutor';
import { logger } from '../../../services/SimpleLogger';

export interface NodeExecutor {
  execute: (node: Node, context: unknown) => Promise<unknown>;
  validate?: (node: Node) => string[]; // Returns validation errors
}

export const nodeExecutors: Record<string, NodeExecutor> = {
  // Triggers
  trigger: triggerExecutor,
  webhook: webhookExecutor,
  schedule: scheduleExecutor,
  
  // Core Actions
  httpRequest: httpRequestExecutor,
  email: emailExecutor,
  database: databaseExecutor,
  
  // Data Processing
  transform: transformExecutor,
  filter: filterExecutor,
  
  // AI/ML
  ai: aiExecutor,
  
  // Flow Control
  delay: delayExecutor,
  condition: {
    execute: async (_node, context) => {
      // Condition nodes don't execute, they just control flow
      const ctx = context as { input?: unknown };
      return ctx.input || context;
    }
  },
  loop: {
    execute: async (_node, context) => {
      const ctx = context as { input?: unknown; items?: unknown[] };
      const items = ctx.items || [];
      const results: unknown[] = [];

      for (const item of items) {
        // Execute loop body (handled by execution service)
        results.push(item);
      }

      return { results };
    }
  },
  
  // Default executor for unknown types
  default: {
    execute: async (node, context) => {
      logger.warn(`No executor found for node type: ${node.data.type}`);
      const ctx = context as { input?: unknown };
      return ctx.input || context;
    }
  }
};

/**
 * Get executor for node type
 */
export function getNodeExecutor(nodeType: string): NodeExecutor {
  return nodeExecutors[nodeType] || nodeExecutors.default;
}