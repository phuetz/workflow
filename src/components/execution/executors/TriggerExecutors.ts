/**
 * Trigger node executors: Manual triggers, webhooks, schedules
 */

import type { WorkflowNode, NodeConfig } from '../types';

/**
 * Execute a trigger node (manual, webhook)
 */
export async function executeTrigger(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Return mockData directly if provided, otherwise return default data
  if (config.mockData) {
    return config.mockData as Record<string, unknown>;
  }

  return {
    trigger: 'manual',
    timestamp: new Date().toISOString(),
    userId: Math.floor(Math.random() * 1000),
    email: 'user@example.com',
    action: 'signup'
  };
}

/**
 * Execute a schedule node
 */
export async function executeSchedule(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return {
    scheduled: true,
    cron: (config.cron as string) || '0 9 * * *',
    nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    data: { scheduledExecution: true }
  };
}

/**
 * Execute a delay/wait node
 */
export async function executeDelay(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const delay = parseInt(String(config.delay)) || 5;
  const unit = (config.unit as string) || 'seconds';
  const resumeMode = (config.resumeMode as string) || 'immediate';

  let delayMs = unit === 'minutes' ? delay * 60 * 1000 :
                unit === 'hours' ? delay * 60 * 60 * 1000 :
                unit === 'days' ? delay * 24 * 60 * 60 * 1000 :
                delay * 1000;

  // Cap maximum delay at 24 hours for immediate mode
  const MAX_DELAY_MS = 24 * 60 * 60 * 1000;
  if (resumeMode === 'immediate' && delayMs > MAX_DELAY_MS) {
    delayMs = MAX_DELAY_MS;
  }

  // For specificTime mode, calculate delay to target time
  if (resumeMode === 'specificTime' && config.resumeTime) {
    const targetTime = new Date(config.resumeTime as string).getTime();
    const now = Date.now();
    delayMs = Math.max(0, targetTime - now);
  }

  // Actually wait (for short delays in execution)
  if (resumeMode === 'immediate' && delayMs <= 30000) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  return {
    delayed: true,
    duration: delay,
    unit,
    delayMs,
    resumeMode,
    waitedAt: new Date().toISOString(),
    data: inputData
  };
}

/**
 * Execute respond to webhook node
 */
export async function executeRespondToWebhook(
  node: WorkflowNode,
  config: NodeConfig,
  inputData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const respondWith = config.respondWith as string || 'firstIncomingItem';
  const responseCode = config.responseCode as number || 200;
  const contentType = config.contentType as string || 'application/json';

  let responseBody: unknown;

  switch (respondWith) {
    case 'firstIncomingItem':
      responseBody = Array.isArray(inputData) ? inputData[0] : inputData;
      break;
    case 'lastIncomingItem':
      responseBody = Array.isArray(inputData) ? inputData[inputData.length - 1] : inputData;
      break;
    case 'allIncomingItems':
      responseBody = inputData;
      break;
    case 'noData':
      responseBody = null;
      break;
    case 'customResponse':
      try {
        responseBody = config.responseBody ? JSON.parse(String(config.responseBody)) : {};
      } catch {
        responseBody = config.responseBody || {};
      }
      break;
  }

  return {
    webhookResponse: {
      statusCode: responseCode,
      contentType,
      body: responseBody,
      headers: config.responseHeaders || []
    },
    sent: true
  };
}
