/**
 * Node Executors Registry
 * Maps node types to their execution logic
 */

import { Node } from 'reactflow';
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
import { logger } from '../../../services/LoggingService';

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
    execute: async (node, context) => {
      // Condition nodes don't execute, they just control flow
      return context.input;
    }
  },
  loop: {
    execute: async (node, context) => {

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
      return context.input;
    }
  }
};

/**
 * Get executor for node type
 */
export function getNodeExecutor(nodeType: string): NodeExecutor {
  return nodeExecutors[nodeType] || nodeExecutors.default;
}