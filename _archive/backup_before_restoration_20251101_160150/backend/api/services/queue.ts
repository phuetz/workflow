import Redis from 'ioredis';
import { createExecution, updateExecution, getWorkflow } from '../repositories/adapters';
import { executeWorkflowSimple } from './simpleExecutionService';
import { emitExecutionQueued, emitExecutionStarted, emitExecutionFinished } from './events';
import { recordExecutionQueued, recordExecutionStarted, recordExecutionFinished } from './metrics';

let redisClient: Redis | null = null;
let workerStarted = false;
const QUEUE = 'exec_queue';

async function getRedis(): Promise<any | null> {
  if (redisClient !== null) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) { redisClient = null; return null; }
  try {
    const client = new Redis(url);
    await client.ping();
    redisClient = client;
    return client;
  } catch {
    redisClient = null;
    return null;
  }
}

export async function enqueueExecution(workflowId: string, input?: unknown) {
  const exec = await createExecution(workflowId, input);
  emitExecutionQueued({ id: exec.id, workflowId, input });
  recordExecutionQueued(workflowId);
  const redis = await getRedis();
  if (redis) {
    await redis.rPush(QUEUE, JSON.stringify({ id: exec.id, workflowId, input }));
    startWorker();
  } else {
    // in-memory fallback: immediate execution async
    setImmediate(async () => {
      try {
        const wf = await getWorkflow(workflowId);
        if (!wf) throw new Error('Workflow not found');
        await updateExecution(exec.id, { status: 'running', startedAt: new Date().toISOString() });
        const res = await executeWorkflowSimple(wf, input);
        await updateExecution(res.id, res);
      } catch (err: any) {
        await updateExecution(exec.id, { status: 'failure', error: err?.message || 'Execution failed', finishedAt: new Date().toISOString() });
      }
    });
  }
  return exec;
}

export async function startWorker() {
  if (workerStarted) return;
  workerStarted = true;
  const concurrency = Math.max(1, Number(process.env.WORKER_CONCURRENCY || 2));
  const redis = await getRedis();

  const loop = async () => {
    while (true) {
      try {
        if (redis) {
          const res = await redis.blpop(QUEUE, 1);
          const payload = Array.isArray(res) ? res[1] : null;
          if (!payload) continue;
          const msg = JSON.parse(payload);
          await processMessage(msg);
        } else {
          // no redis, cooperative yield
          await new Promise(r => setTimeout(r, 250));
        }
      } catch {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  };

  // spawn N loops for concurrency
  for (let i = 0; i < concurrency; i++) loop();
}

async function processMessage(msg: any) {
  const { id, workflowId, input } = msg;
  try {
    const startedAt = new Date().toISOString();
    await updateExecution(id, { status: 'running', startedAt });
    emitExecutionStarted({ id, workflowId, startedAt: new Date().toISOString() });
    recordExecutionStarted(workflowId);
    const wf = await getWorkflow(workflowId);
    if (!wf) throw new Error('Workflow not found');
    const result = await executeWorkflowSimple(wf, input);
    const finishedAt = result.finishedAt || new Date().toISOString();
    const updated = await updateExecution(id, {
      status: result.status,
      output: result.output,
      error: result.error,
      finishedAt,
      durationMs: result.durationMs,
    });
    emitExecutionFinished({ id, workflowId, status: String(updated?.status || result.status), finishedAt: String(updated?.finishedAt || new Date().toISOString()), error: updated?.error });
    recordExecutionFinished(workflowId, String(updated?.status || result.status), updated?.durationMs);
  } catch (err: any) {
    const attempts = (msg.attempts || 0) + 1;
    const max = Number(process.env.MAX_RETRIES || 3);
    await updateExecution(id, { retryCount: attempts, maxRetries: max });
    const redis = await getRedis();
    if (redis && attempts <= max) {
      msg.attempts = attempts;
      const backoff = Math.min(30_000, attempts * 1000);
      setTimeout(async () => { await redis!.rpush(QUEUE, JSON.stringify(msg)); }, backoff);
    } else {
      const finishedAt = new Date().toISOString();
      const updated = await updateExecution(id, { status: 'failure', error: err?.message || 'Execution failed', finishedAt });
      emitExecutionFinished({ id, workflowId, status: 'failure', finishedAt: String(updated?.finishedAt || new Date().toISOString()), error: updated?.error });
      recordExecutionFinished(workflowId, 'failure');
    }
  }
}
