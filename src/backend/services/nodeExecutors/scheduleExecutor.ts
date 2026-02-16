/**
 * Schedule Node Executor
 * Handles scheduled workflow triggers
 */

import { NodeExecutor, NodeExecutionContext, NodeExecutionResult } from './types';
import * as cron from 'node-cron';

function getIntervalInMs(interval: number, unit: string): number {
  switch (unit) {
    case 'seconds': return interval * 1000;
    case 'minutes': return interval * 60 * 1000;
    case 'hours': return interval * 60 * 60 * 1000;
    case 'days': return interval * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown interval unit: ${unit}`);
  }
}

export const scheduleExecutor: NodeExecutor = {
  async execute(context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const config = context.config || {};

    const scheduleType = (config.scheduleType || 'cron') as string;
    const cronExpression = config.cronExpression as string | undefined;
    const interval = config.interval as number | undefined;
    const intervalUnit = (config.intervalUnit || 'minutes') as string;
    const timezone = (config.timezone || 'UTC') as string;
    const startDate = config.startDate as string | undefined;
    const endDate = config.endDate as string | undefined;

    const now = new Date();

    let nextRun: Date;

    if (scheduleType === 'cron') {
      if (!cronExpression) throw new Error('Cron expression is required');
      if (!cron.validate(cronExpression)) throw new Error('Invalid cron expression');
      nextRun = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (scheduleType === 'interval') {
      if (!interval) throw new Error('Interval is required');
      const intervalMs = getIntervalInMs(interval, intervalUnit);
      nextRun = new Date(now.getTime() + intervalMs);
    } else {
      throw new Error(`Unknown schedule type: ${scheduleType}`);
    }

    if (startDate && new Date(startDate) > nextRun) {
      nextRun = new Date(startDate);
    }

    if (endDate && new Date(endDate) < nextRun) {
      return {
        success: true,
        data: { scheduled: false, reason: 'Schedule has ended', endDate },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: {
        scheduled: true,
        scheduleType,
        expression: scheduleType === 'cron' ? cronExpression : `Every ${interval} ${intervalUnit}`,
        nextRun: nextRun.toISOString(),
        timezone,
        metadata: {
          triggeredAt: now.toISOString(),
          ...(typeof context.input === 'object' && context.input !== null ? context.input : {})
        }
      },
      timestamp: new Date().toISOString(),
    };
  },
};
