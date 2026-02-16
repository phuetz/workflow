/**
 * Scheduler Service
 * Manages cron-based and interval-based workflow triggers.
 * Registers real cron jobs that queue workflow executions via BullMQ.
 */

import * as cron from 'node-cron';
import { prisma } from '../database/prisma';
import { logger } from '../../services/SimpleLogger';

interface ScheduleEntry {
  id: string;
  workflowId: string;
  cronExpression?: string;
  intervalMs?: number;
  timezone: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

const activeJobs = new Map<string, cron.ScheduledTask>();
const activeIntervals = new Map<string, NodeJS.Timeout>();
const scheduleRegistry = new Map<string, ScheduleEntry>();

export class SchedulerService {
  private started = false;

  /**
   * Start the scheduler - loads schedules from DB and registers cron jobs.
   */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    try {
      // Load active workflows with schedule triggers
      const workflows = await prisma.workflow.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, nodes: true, settings: true },
      });

      let registered = 0;
      for (const workflow of workflows) {
        const nodes = workflow.nodes as any[];
        if (!Array.isArray(nodes)) continue;

        // Find schedule trigger nodes
        const scheduleNodes = nodes.filter(
          (n: any) => n.data?.type === 'schedule' || n.data?.type === 'scheduleTrigger'
        );

        for (const node of scheduleNodes) {
          const config = node.data?.config || {};
          if (config.cronExpression || config.interval) {
            await this.registerSchedule(workflow.id, node.id, config);
            registered++;
          }
        }
      }

      logger.info(`Scheduler started: ${registered} schedules registered from ${workflows.length} workflows`);
    } catch (error) {
      logger.warn('Scheduler start failed, will retry on next workflow save', { error: String(error) });
    }
  }

  /**
   * Register a schedule for a workflow.
   */
  async registerSchedule(
    workflowId: string,
    nodeId: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const scheduleId = `${workflowId}:${nodeId}`;

    // Unregister existing schedule if any
    this.unregisterSchedule(scheduleId);

    const timezone = (config.timezone as string) || 'UTC';
    const cronExpression = config.cronExpression as string | undefined;
    const interval = config.interval as number | undefined;
    const intervalUnit = (config.intervalUnit as string) || 'minutes';

    const entry: ScheduleEntry = {
      id: scheduleId,
      workflowId,
      timezone,
      enabled: true,
    };

    if (cronExpression) {
      if (!cron.validate(cronExpression)) {
        logger.warn('Invalid cron expression, skipping', { scheduleId, cronExpression });
        return;
      }

      entry.cronExpression = cronExpression;

      const task = cron.schedule(cronExpression, () => {
        this.triggerWorkflow(workflowId, nodeId, 'cron', cronExpression);
      }, { timezone });

      activeJobs.set(scheduleId, task);

      logger.info('Cron schedule registered', { scheduleId, cronExpression, timezone });

    } else if (interval) {
      const multipliers: Record<string, number> = {
        seconds: 1000,
        minutes: 60 * 1000,
        hours: 3600 * 1000,
        days: 86400 * 1000,
      };
      const ms = interval * (multipliers[intervalUnit] || 60000);
      entry.intervalMs = ms;

      const timer = setInterval(() => {
        this.triggerWorkflow(workflowId, nodeId, 'interval', `${interval} ${intervalUnit}`);
      }, ms);

      activeIntervals.set(scheduleId, timer);

      logger.info('Interval schedule registered', { scheduleId, interval, intervalUnit, ms });
    }

    scheduleRegistry.set(scheduleId, entry);
  }

  /**
   * Trigger a workflow execution from a schedule.
   */
  private async triggerWorkflow(
    workflowId: string,
    nodeId: string,
    triggerType: string,
    expression: string
  ): Promise<void> {
    try {
      const scheduleId = `${workflowId}:${nodeId}`;
      const entry = scheduleRegistry.get(scheduleId);
      if (entry) entry.lastRun = new Date();

      // Queue the execution via BullMQ
      try {
        const { queueManager } = await import('../queue/QueueManager');
        await queueManager.addJob('workflow-execution', 'execute', {
          workflowId,
          executionId: `sched_${Date.now()}`,
          triggeredBy: 'scheduler',
          inputData: {
            trigger: {
              type: triggerType,
              nodeId,
              expression,
              scheduledAt: new Date().toISOString(),
            },
          },
        });

        logger.info('Schedule triggered workflow', { workflowId, nodeId, triggerType, expression });
      } catch {
        // Fallback: direct execution if queue unavailable
        const { executionService } = await import('./executionService');
        const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
        if (workflow) {
          await executionService.startExecution(workflow as any, {
            trigger: { type: triggerType, expression, scheduledAt: new Date().toISOString() },
          }, 'scheduler');
        }
      }
    } catch (error) {
      logger.error('Failed to trigger scheduled workflow', {
        workflowId,
        nodeId,
        error: String(error),
      });
    }
  }

  /**
   * Unregister a schedule.
   */
  unregisterSchedule(scheduleId: string): void {
    const job = activeJobs.get(scheduleId);
    if (job) {
      job.stop();
      activeJobs.delete(scheduleId);
    }

    const interval = activeIntervals.get(scheduleId);
    if (interval) {
      clearInterval(interval);
      activeIntervals.delete(scheduleId);
    }

    scheduleRegistry.delete(scheduleId);
  }

  /**
   * Unregister all schedules for a workflow.
   */
  unregisterWorkflow(workflowId: string): void {
    for (const [id] of scheduleRegistry) {
      if (id.startsWith(`${workflowId}:`)) {
        this.unregisterSchedule(id);
      }
    }
  }

  /**
   * List active schedules.
   */
  listSchedules(): ScheduleEntry[] {
    return Array.from(scheduleRegistry.values());
  }

  /**
   * Shutdown - stop all schedules.
   */
  async shutdown(): Promise<void> {
    for (const [id] of scheduleRegistry) {
      this.unregisterSchedule(id);
    }
    this.started = false;
    logger.info('Scheduler shut down');
  }
}

export const schedulerService = new SchedulerService();
