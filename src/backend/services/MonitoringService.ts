/**
 * Real-Time Monitoring Service
 * Provides live execution metrics, system health, and queue stats.
 */

import { prisma } from '../database/prisma';
import { logger } from '../../services/SimpleLogger';

interface SystemMetrics {
  executions: {
    total: number;
    running: number;
    succeeded: number;
    failed: number;
    avgDurationMs: number;
    last24h: number;
  };
  workflows: {
    total: number;
    active: number;
    draft: number;
  };
  system: {
    uptimeSeconds: number;
    memoryUsedMB: number;
    memoryTotalMB: number;
    cpuUsagePercent: number;
    nodeVersion: string;
  };
  queue: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
}

const startTime = Date.now();

export class MonitoringService {
  async getMetrics(): Promise<SystemMetrics> {
    const [execStats, workflowStats, recentExecs] = await Promise.all([
      this.getExecutionStats(),
      this.getWorkflowStats(),
      this.getRecentExecutionStats(),
    ]);

    const mem = process.memoryUsage();

    return {
      executions: {
        total: execStats.total,
        running: execStats.running,
        succeeded: execStats.succeeded,
        failed: execStats.failed,
        avgDurationMs: execStats.avgDuration,
        last24h: recentExecs,
      },
      workflows: workflowStats,
      system: {
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        memoryUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        memoryTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        cpuUsagePercent: await this.getCpuUsage(),
        nodeVersion: process.version,
      },
      queue: await this.getQueueStats(),
    };
  }

  private async getExecutionStats() {
    const [total, running, succeeded, failed, avgResult] = await Promise.all([
      prisma.workflowExecution.count(),
      prisma.workflowExecution.count({ where: { status: 'RUNNING' } }),
      prisma.workflowExecution.count({ where: { status: 'SUCCESS' } }),
      prisma.workflowExecution.count({ where: { status: 'FAILED' } }),
      prisma.workflowExecution.aggregate({
        _avg: { duration: true },
        where: { status: 'SUCCESS', duration: { not: null } },
      }),
    ]);

    return {
      total,
      running,
      succeeded,
      failed,
      avgDuration: Math.round(avgResult._avg?.duration || 0),
    };
  }

  private async getWorkflowStats() {
    const [total, active, draft] = await Promise.all([
      prisma.workflow.count(),
      prisma.workflow.count({ where: { status: 'ACTIVE' } }),
      prisma.workflow.count({ where: { status: 'DRAFT' } }),
    ]);
    return { total, active, draft };
  }

  private async getRecentExecutionStats() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return prisma.workflowExecution.count({
      where: { startedAt: { gte: since } },
    });
  }

  private async getQueueStats() {
    // Try to get real queue stats from Redis/BullMQ
    try {
      const { queueManager } = await import('../queue/QueueManager');
      const stats = await queueManager.getQueueMetrics('workflow-execution');
      return {
        pending: stats.waiting || 0,
        active: stats.active || 0,
        completed: stats.completed || 0,
        failed: stats.failed || 0,
      };
    } catch {
      return { pending: 0, active: 0, completed: 0, failed: 0 };
    }
  }

  private async getCpuUsage(): Promise<number> {
    const start = process.cpuUsage();
    await new Promise(r => setTimeout(r, 100));
    const end = process.cpuUsage(start);
    const totalMicros = end.user + end.system;
    return Math.round((totalMicros / 100000) * 100) / 100; // Percent of 100ms sample
  }

  /**
   * Get execution history for charts (last N hours, grouped by hour).
   */
  async getExecutionTimeline(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const executions = await prisma.workflowExecution.findMany({
      where: { startedAt: { gte: since } },
      select: { status: true, startedAt: true, duration: true },
      orderBy: { startedAt: 'asc' },
    });

    // Group by hour
    const buckets = new Map<string, { success: number; failure: number; total: number; avgDuration: number; durations: number[] }>();

    for (const exec of executions) {
      if (!exec.startedAt) continue;
      const hour = exec.startedAt.toISOString().slice(0, 13) + ':00:00Z';
      if (!buckets.has(hour)) {
        buckets.set(hour, { success: 0, failure: 0, total: 0, avgDuration: 0, durations: [] });
      }
      const bucket = buckets.get(hour)!;
      bucket.total++;
      if (exec.status === 'SUCCESS') bucket.success++;
      else if (exec.status === 'FAILED') bucket.failure++;
      if (exec.duration) bucket.durations.push(exec.duration);
    }

    return Array.from(buckets.entries()).map(([hour, data]) => ({
      hour,
      ...data,
      avgDuration: data.durations.length
        ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
        : 0,
      durations: undefined,
    }));
  }

  /**
   * Get top failing workflows.
   */
  async getTopFailingWorkflows(limit = 10) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const results = await prisma.workflowExecution.groupBy({
      by: ['workflowId'],
      where: { status: 'FAILED', startedAt: { gte: since } },
      _count: true,
      orderBy: { _count: { workflowId: 'desc' } },
      take: limit,
    });

    const workflows = await prisma.workflow.findMany({
      where: { id: { in: results.map(r => r.workflowId) } },
      select: { id: true, name: true },
    });

    const nameMap = new Map(workflows.map(w => [w.id, w.name]));

    return results.map(r => ({
      workflowId: r.workflowId,
      workflowName: nameMap.get(r.workflowId) || 'Unknown',
      failureCount: r._count,
    }));
  }
}

export const monitoringService = new MonitoringService();
