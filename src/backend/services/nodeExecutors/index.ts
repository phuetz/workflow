/**
 * Node Executors Registry
 * Maps node types to their execution logic
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import { httpRequestExecutor } from './httpRequestExecutor';
import { emailExecutor } from './emailExecutor';
import { databaseExecutor } from './databaseExecutor';
import { transformExecutor } from './transformExecutor';
import { delayExecutor } from './delayExecutor';
import { webhookExecutor } from './webhookExecutor';
import { aiExecutor } from './aiExecutor';
import { scheduleExecutor } from './scheduleExecutor';
import { triggerExecutor } from './triggerExecutor';
import { slackExecutor } from './slackExecutor';
import { discordExecutor } from './discordExecutor';
import { googleSheetsExecutor } from './googleSheetsExecutor';
import { s3Executor } from './s3Executor';
import { mongodbExecutor } from './mongodbExecutor';
import { waitExecutor } from './waitExecutor';
import { codeExecutor, functionExecutor, functionItemExecutor } from './codeExecutor';
import { subWorkflowExecutor } from './subWorkflowExecutor';
import { filterExecutor as conditionalFilterExecutor } from './filterExecutor';
import {
  sortExecutor, mergeExecutor, filterExecutor as arrayFilterExecutor, setExecutor,
  editFieldsExecutor, aggregateExecutor, limitExecutor,
  removeDuplicatesExecutor, splitInBatchesExecutor, renameKeysExecutor,
  splitOutExecutor, summarizeExecutor, compareDatasetsExecutor, itemListsExecutor,
} from './dataTransformExecutor';
import {
  dateTimeExecutor, cryptoExecutor, htmlExecutor, markdownExecutor,
  compressionExecutor, etlExecutor, loopExecutor, forEachExecutor,
  noOperationExecutor, stopAndErrorExecutor, respondToWebhookExecutor,
  errorGeneratorExecutor,
} from './utilityExecutor';
import { logger } from '../../../services/SimpleLogger';

export type { NodeExecutor, NodeExecutionContext, NodeExecutionResult };

export const nodeExecutors: Record<string, NodeExecutor> = {
  // Triggers
  trigger: triggerExecutor,
  manualTrigger: triggerExecutor,
  webhook: webhookExecutor,
  schedule: scheduleExecutor,

  // Core Actions
  httpRequest: httpRequestExecutor,
  email: emailExecutor,
  gmail: emailExecutor,  // alias

  // Database
  database: databaseExecutor,
  mysql: databaseExecutor,     // alias
  postgres: databaseExecutor,  // alias

  // Data Processing
  transform: transformExecutor,
  filter: conditionalFilterExecutor,
  filterItems: arrayFilterExecutor,
  sort: sortExecutor,
  merge: mergeExecutor,
  set: setExecutor,
  edit: editFieldsExecutor,
  editFields: editFieldsExecutor,
  aggregate: aggregateExecutor,
  limit: limitExecutor,
  removeDuplicates: removeDuplicatesExecutor,
  splitInBatches: splitInBatchesExecutor,
  renameKeys: renameKeysExecutor,
  splitOut: splitOutExecutor,
  summarize: summarizeExecutor,
  compareDatasets: compareDatasetsExecutor,
  itemLists: itemListsExecutor,

  // Code Execution
  code: codeExecutor,
  function: functionExecutor,
  functionItem: functionItemExecutor,

  // AI/ML
  ai: aiExecutor,
  openai: aiExecutor,  // alias

  // Communication
  slack: slackExecutor,
  discord: discordExecutor,

  // Cloud/Storage
  googleSheets: googleSheetsExecutor,
  s3: s3Executor,
  mongodb: mongodbExecutor,

  // Utilities
  dateTime: dateTimeExecutor,
  crypto: cryptoExecutor,
  html: htmlExecutor,
  markdown: markdownExecutor,
  compression: compressionExecutor,
  etl: etlExecutor,

  // Flow Control
  delay: delayExecutor,
  wait: waitExecutor,
  loop: loopExecutor,
  forEach: forEachExecutor,
  condition: {
    async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
      return { success: true, data: context.input, timestamp: new Date().toISOString() };
    }
  },
  noOperation: noOperationExecutor,
  stopAndError: stopAndErrorExecutor,
  respondToWebhook: respondToWebhookExecutor,
  errorGenerator: errorGeneratorExecutor,

  // Sub-workflows
  subWorkflow: subWorkflowExecutor,

  // Default executor for unknown types
  default: {
    async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
      logger.warn(`No executor found for node: ${context.nodeId}`);
      return { success: true, data: context.input, timestamp: new Date().toISOString() };
    }
  }
};

/**
 * Get executor for node type
 */
export function getNodeExecutor(nodeType: string): NodeExecutor {
  return nodeExecutors[nodeType] || nodeExecutors.default;
}
