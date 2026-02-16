/**
 * Polling Trigger Service
 * Manages interval-based polling for trigger nodes.
 * Fetches data from sources and queues workflow executions when new data is found.
 */

import axios from 'axios';
import { logger } from '../../services/SimpleLogger';
import { executionService } from './executionService';
import { prisma } from '../database/prisma';

interface PollerConfig {
  workflowId: string;
  userId: string;
  source: 'http' | 'database' | 'email';
  intervalMs: number;
  config: Record<string, any>;
}

interface PollerState {
  config: PollerConfig;
  timer: NodeJS.Timeout | null;
  lastRunAt: Date | null;
  lastData: string | null; // JSON hash of last data for dedup
  running: boolean;
}

class PollingTriggerService {
  private pollers: Map<string, PollerState> = new Map();

  /**
   * Register a new poller for a workflow
   */
  register(config: PollerConfig): void {
    const key = config.workflowId;

    // Stop existing poller if any
    this.unregister(key);

    const state: PollerState = {
      config,
      timer: null,
      lastRunAt: null,
      lastData: null,
      running: false,
    };

    state.timer = setInterval(() => {
      this.tick(key).catch(err => {
        logger.error(`Poller tick failed for workflow ${key}`, { error: String(err) });
      });
    }, config.intervalMs);

    this.pollers.set(key, state);
    logger.info('Poller registered', { workflowId: key, intervalMs: config.intervalMs, source: config.source });
  }

  /**
   * Unregister a poller
   */
  unregister(workflowId: string): void {
    const state = this.pollers.get(workflowId);
    if (state) {
      if (state.timer) clearInterval(state.timer);
      this.pollers.delete(workflowId);
      logger.info('Poller unregistered', { workflowId });
    }
  }

  /**
   * Single poll tick
   */
  private async tick(workflowId: string): Promise<void> {
    const state = this.pollers.get(workflowId);
    if (!state || state.running) return;

    state.running = true;

    try {
      const data = await this.fetchData(state.config);
      const dataHash = JSON.stringify(data);

      // Only trigger if data has changed
      if (dataHash !== state.lastData) {
        state.lastData = dataHash;
        state.lastRunAt = new Date();

        // Fetch workflow and trigger execution
        const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
        if (!workflow) {
          logger.warn(`Polled workflow not found, unregistering: ${workflowId}`);
          this.unregister(workflowId);
          return;
        }

        await executionService.startExecution(
          workflow as any,
          { polledData: data, polledAt: new Date().toISOString() },
          state.config.userId
        );

        logger.info('Poller triggered execution', { workflowId });
      }
    } catch (err) {
      logger.error(`Poller fetch failed for ${workflowId}`, { error: String(err) });
    } finally {
      state.running = false;
    }
  }

  /**
   * Fetch data from the configured source
   */
  private async fetchData(config: PollerConfig): Promise<unknown> {
    switch (config.source) {
      case 'http': {
        const url = config.config.url as string;
        const method = (config.config.method || 'GET') as string;
        const headers = (config.config.headers || {}) as Record<string, string>;
        const response = await axios({ method, url, headers, timeout: 30000 });
        return response.data;
      }

      case 'database': {
        // Use Prisma raw query for polling
        const query = config.config.query as string;
        if (!query) throw new Error('Database polling requires a query');
        const result = await prisma.$queryRawUnsafe(query);
        return result;
      }

      default:
        throw new Error(`Unsupported polling source: ${config.source}`);
    }
  }

  /**
   * Get status of all pollers
   */
  getStatus(): Array<{ workflowId: string; source: string; intervalMs: number; lastRunAt: Date | null }> {
    return Array.from(this.pollers.entries()).map(([id, state]) => ({
      workflowId: id,
      source: state.config.source,
      intervalMs: state.config.intervalMs,
      lastRunAt: state.lastRunAt,
    }));
  }

  /**
   * Stop all pollers
   */
  stopAll(): void {
    for (const [id] of this.pollers) {
      this.unregister(id);
    }
  }
}

export const pollingTriggerService = new PollingTriggerService();
