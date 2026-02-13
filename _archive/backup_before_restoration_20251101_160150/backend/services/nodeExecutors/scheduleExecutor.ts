/**
 * Schedule Node Executor
 * Handles scheduled workflow triggers
 */

import { Node } from 'reactflow';
import { NodeExecutor } from './index';
import * as cron from 'node-cron';

export const scheduleExecutor: NodeExecutor = {
  async execute(node: Node, context: Record<string, unknown>): Promise<Record<string, unknown>> {
    const {
      scheduleType = 'cron',
      cronExpression,
      interval,
      intervalUnit = 'minutes',
      timezone = 'UTC',
      startDate,
      endDate
    } = config;

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
        nextRun = this.getNextCronRun(cronExpression, timezone);
      } else if (scheduleType === 'interval') {
        // Calculate next run based on interval
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
          ...context.input
        }
      };

    } catch (error) {
      throw new Error(`Schedule configuration error: ${error.message}`);
    }
  },

  validate(node: Node): string[] {
    const errors: string[] = [];

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
  },

  // Helper methods
  getNextCronRun(): Date {
    // Simplified implementation without parameters
    // In production, use a proper cron parser with timezone support
    // For now, return a simulated next run time
    
    // Simple simulation: add 1 hour
    return new Date(now.getTime() + 60 * 60 * 1000);
  },

  getIntervalInMs(interval: number, unit: string): number {
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
};