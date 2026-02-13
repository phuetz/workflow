/**
 * Schedule Node Executor
 * Handles scheduled workflow triggers
 */

import { Node } from '@xyflow/react';
import { NodeExecutor } from './index';
import * as cron from 'node-cron';

// Helper functions outside of the executor object
function getNextCronRun(cronExpression: string, timezone: string): Date {
  // Simplified implementation
  // In production, use a proper cron parser with timezone support like cronstrue or cron-parser
  // For now, return a simulated next run time

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _expression = cronExpression;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tz = timezone;

  const now = new Date();
  // Simple simulation: add 1 hour
  return new Date(now.getTime() + 60 * 60 * 1000);
}

function getIntervalInMs(interval: number, unit: string): number {
  switch (unit) {
    case 'seconds':
      return interval * 1000;
    case 'minutes':
      return interval * 60 * 1000;
    case 'hours':
      return interval * 60 * 60 * 1000;
    case 'days':
      return interval * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unknown interval unit: ${unit}`);
  }
}

export const scheduleExecutor: NodeExecutor = {
  async execute(node: Node, context: unknown): Promise<unknown> {
    // Cast context to specific type
    const ctx = context as Record<string, unknown>;

    // Extract config from node.data
    const config = (node.data?.config || {}) as {
      scheduleType?: string;
      cronExpression?: string;
      interval?: number;
      intervalUnit?: string;
      timezone?: string;
      startDate?: string;
      endDate?: string;
    };

    const {
      scheduleType = 'cron',
      cronExpression,
      interval,
      intervalUnit = 'minutes',
      timezone = 'UTC',
      startDate,
      endDate
    } = config;

    const now = new Date();

    try {
      // For schedule nodes, we return scheduling information
      // The actual scheduling is handled by the workflow scheduler service

      let nextRun: Date;

      if (scheduleType === 'cron') {
        if (!cronExpression) {
          throw new Error('Cron expression is required');
        }

        // Validate cron expression
        if (!cron.validate(cronExpression)) {
          throw new Error('Invalid cron expression');
        }

        // Calculate next run time
        nextRun = getNextCronRun(cronExpression, timezone);
      } else if (scheduleType === 'interval') {
        // Calculate next run based on interval
        if (!interval) {
          throw new Error('Interval is required');
        }
        const intervalMs = getIntervalInMs(interval, intervalUnit);
        nextRun = new Date(now.getTime() + intervalMs);
      } else {
        throw new Error(`Unknown schedule type: ${scheduleType}`);
      }

      // Check date constraints
      if (startDate && new Date(startDate) > nextRun) {
        nextRun = new Date(startDate);
      }

      if (endDate && new Date(endDate) < nextRun) {
        return {
          scheduled: false,
          reason: 'Schedule has ended',
          endDate
        };
      }

      return {
        scheduled: true,
        scheduleType,
        expression: scheduleType === 'cron' ? cronExpression : `Every ${interval} ${intervalUnit}`,
        nextRun: nextRun.toISOString(),
        timezone,
        metadata: {
          triggeredAt: now.toISOString(),
          ...(typeof ctx.input === 'object' && ctx.input !== null ? ctx.input as Record<string, unknown> : {})
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Schedule configuration error: ${errorMessage}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];

    // Extract config from node.data
    const config = (node.data?.config || {}) as {
      scheduleType?: string;
      cronExpression?: string;
      interval?: number;
      intervalUnit?: string;
      startDate?: string;
      endDate?: string;
    };

    if (config.scheduleType === 'cron') {
      if (!config.cronExpression) {
        errors.push('Cron expression is required');
      } else if (!cron.validate(config.cronExpression)) {
        errors.push('Invalid cron expression');
      }
    } else if (config.scheduleType === 'interval') {
      if (!config.interval || config.interval <= 0) {
        errors.push('Interval must be a positive number');
      }
    }

    if (config.startDate && config.endDate) {
      if (new Date(config.startDate) >= new Date(config.endDate)) {
        errors.push('End date must be after start date');
      }
    }

    return errors;
  }
};