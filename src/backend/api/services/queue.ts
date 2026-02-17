import Redis from 'ioredis';
import { createExecution, updateExecution, getWorkflow } from '../repositories/adapters';
import { emitExecutionQueued, emitExecutionStarted, emitExecutionFinished } from './events';
import { recordExecutionQueued, recordExecutionStarted, recordExecutionFinished } from './metrics';
import { logger } from '../../../services/SimpleLogger';

let redisClient: Redis | null = null;
let workerStarted = false;
const QUEUE = 'exec_queue';

// Queue statistics
const queueStats = {
  enqueued: 0,
  processed: 0,
  failed: 0,
  retried: 0
};

async function getRedis(): Promise<any | null> {
  if (redisClient !== null) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.info('Redis URL not configured, using in-memory queue');
    redisClient = null;
    return null;
  }
  try {
    const client = new Redis(url);
    await client.ping();
    redisClient = client;
    logger.info('Redis connected successfully', {
      host: url.replace(/\/\/.*:.*@/, '//***:***@'), // mask credentials
      queue: QUEUE
    });
    return client;
  } catch (err) {
    logger.warn('Redis connection failed, using in-memory queue', {
      error: err instanceof Error ? err.message : String(err)
    });
    redisClient = null;
    return null;
  }
}

/** Execute a workflow via the unified executionService (53+ node executors) */
async function executeViaUnifiedEngine(workflowId: string, input: unknown, execId: string): Promise<void> {
  const { executionService } = await import('../../../backend/services/executionService');
  const wf = await getWorkflow(workflowId);
  if (!wf) throw new Error('Workflow not found');

  // Map the adapter workflow to the shape executionService expects
  const workflow = {
    id: wf.id,
    name: wf.name,
    nodes: wf.nodes || [],
    edges: wf.edges || [],
    settings: (wf.settings as Record<string, any>) || {},
  };

  const execution = await executionService.startExecution(workflow as any, input || {}, 'queue');

  // Poll for completion (executionService runs async)
  const deadline = Date.now() + 5 * 60 * 1000;
  const pollMs = 500;
  while (Date.now() < deadline) {
    const current = await executionService.getExecution(execution.id);
    if (!current) break;
    if (current.status !== 'pending' && current.status !== 'running') {
      return;
    }
    await new Promise(r => setTimeout(r, pollMs));
  }
  throw new Error(`Execution timed out: ${execution.id}`);
}

export async function enqueueExecution(workflowId: string, input?: unknown) {
  const exec = await createExecution(workflowId, input);
  if (!exec) throw new Error('Failed to create execution');

  queueStats.enqueued++;

  logger.info('Execution enqueued', {
    executionId: exec.id,
    workflowId,
    hasInput: !!input,
    queueStats: { ...queueStats }
  });

  emitExecutionQueued({ id: exec.id, workflowId, input });
  recordExecutionQueued(workflowId);
  const redis = await getRedis();
  if (redis) {
    await redis.rPush(QUEUE, JSON.stringify({ id: exec.id, workflowId, input }));
    logger.debug('Execution pushed to Redis queue', { executionId: exec.id, queue: QUEUE });
    startWorker();
  } else {
    // in-memory fallback: immediate execution via unified engine
    logger.debug('Using in-memory execution (no Redis)', { executionId: exec.id });
    setImmediate(async () => {
      try {
        await updateExecution(exec.id, { status: 'running', startedAt: new Date().toISOString() });
        await executeViaUnifiedEngine(workflowId, input, exec.id);
        queueStats.processed++;
        logger.debug('In-memory execution completed', { executionId: exec.id });
      } catch (err: any) {
        queueStats.failed++;
        logger.error('In-memory execution failed', {
          executionId: exec.id,
          workflowId,
          error: err?.message || 'Execution failed'
        });
        await updateExecution(exec.id, { status: 'failure', error: err?.message || 'Execution failed', finishedAt: new Date().toISOString() });
      }
    });
  }
  return exec;
}

export async function startWorker() {
  if (workerStarted) {
    logger.debug('Worker already started');
    return;
  }
  workerStarted = true;
  const concurrency = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 2));
  const redis = await getRedis();

  logger.info('Queue worker started', {
    concurrency,
    useRedis: !!redis,
    queue: QUEUE
  });

  const loop = async (workerId: number) => {
    logger.debug('Worker loop started', { workerId });
    while (true) {
      try {
        if (redis) {
          const res = await redis.blpop(QUEUE, 1);
          const payload = Array.isArray(res) ? res[1] : null;
          if (!payload) continue;
          const msg = JSON.parse(payload);
          logger.debug('Worker processing message', { workerId, executionId: msg.id });
          await processMessage(msg);
        } else {
          // no redis, cooperative yield
          await new Promise(r => setTimeout(r, 250));
        }
      } catch (err) {
        logger.warn('Worker loop error, retrying', {
          workerId,
          error: err instanceof Error ? err.message : String(err)
        });
        await new Promise(r => setTimeout(r, 500));
      }
    }
  };

  // spawn N loops for concurrency with proper error handling
  for (let i = 0; i < concurrency; i++) {
    loop(i).catch((err) => {
      logger.error('Worker loop crashed', {
        workerId: i,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      // Restart loop after delay
      setTimeout(() => {
        logger.info('Restarting crashed worker loop', { workerId: i });
        loop(i).catch((restartError) => {
          logger.error('Worker loop restart failed', { workerId: i, error: restartError.message });
        });
      }, 5000);
    });
  }
}

async function processMessage(msg: any) {
  const { id, workflowId, input } = msg;
  const startTime = Date.now();

  logger.info('Processing execution', {
    executionId: id,
    workflowId,
    attempt: (msg.attempts || 0) + 1
  });

  try {
    const startedAt = new Date().toISOString();
    await updateExecution(id, { status: 'running', startedAt });
    emitExecutionStarted({ id, workflowId, startedAt: new Date().toISOString() });
    recordExecutionStarted(workflowId);

    // Delegate to unified execution engine (53+ node types)
    await executeViaUnifiedEngine(workflowId, input, id);

    const finishedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    queueStats.processed++;

    logger.info('Execution completed', {
      executionId: id,
      workflowId,
      durationMs,
      queueStats: { ...queueStats }
    });

    emitExecutionFinished({ id, workflowId, status: 'success', finishedAt });
    recordExecutionFinished(workflowId, 'success', durationMs);
  } catch (err: any) {
    const attempts = (msg.attempts || 0) + 1;
    const max = Number(process.env.MAX_RETRIES || 3);
    await updateExecution(id, { retryCount: attempts, maxRetries: max });
    const redis = await getRedis();

    if (redis && attempts <= max) {
      queueStats.retried++;
      msg.attempts = attempts;
      const backoff = Math.min(30_000, attempts * 1000);

      logger.warn('Execution failed, scheduling retry', {
        executionId: id,
        workflowId,
        attempt: attempts,
        maxRetries: max,
        backoffMs: backoff,
        error: err?.message || 'Unknown error'
      });

      setTimeout(async () => { await redis!.rpush(QUEUE, JSON.stringify(msg)); }, backoff);
    } else {
      queueStats.failed++;
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;

      logger.error('Execution failed permanently', {
        executionId: id,
        workflowId,
        attempts,
        maxRetries: max,
        durationMs,
        error: err?.message || 'Execution failed',
        stack: err?.stack,
        queueStats: { ...queueStats }
      });

      const updated = await updateExecution(id, { status: 'failure', error: err?.message || 'Execution failed', finishedAt });
      emitExecutionFinished({ id, workflowId, status: 'failure', finishedAt: String(updated?.finishedAt || new Date().toISOString()), error: updated?.error });
      recordExecutionFinished(workflowId, 'failure');
    }
  }
}
