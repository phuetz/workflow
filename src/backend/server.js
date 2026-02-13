import http from 'http';
import os from 'os';
import { fileURLToPath } from 'url';
import { logger } from '../services/SimpleLogger';
import crypto from 'crypto';

// Server instance for graceful shutdown
let serverInstance = null;
let isShuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = 30000; // 30 seconds
import {
  createWorkflow as dbCreateWorkflow,
  listWorkflows as dbListWorkflows,
  getWorkflow as dbGetWorkflow,
  updateWorkflow as dbUpdateWorkflow,
  deleteWorkflow as dbDeleteWorkflow,
  createExecution as dbCreateExecution,
  updateExecution as dbUpdateExecution,
  listExecutions as dbListExecutions,
  getExecution as dbGetExecution
} from './services/persistence.js';

// Simple in-memory rate limiting (P0 API security)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const parsedLimit = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '', 10);
const RATE_LIMIT_MAX_REQUESTS = Number.isFinite(parsedLimit) ? parsedLimit : 100;
const rateLimitMap = new Map(); // ip -> { count, reset }

// Basic CORS configuration
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// Simple in-memory metrics for the queue system
const queueMetrics = {
  'workflow-execution': {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  'webhook-processing': {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
  'email-sending': {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0,
  },
};

// In-memory workflow storage
const workflows = new Map();
let workflowCounter = 1;

// In-memory executions storage and simple queue
const executions = new Map();
let executionCounter = 1;
const executionQueue = [];
let redisQueueEnabled = false;
let redisClientSingleton; let redisWorkerActive = false;

async function getRedis() {
  if (redisClientSingleton !== undefined) return redisClientSingleton;
  try {
    const { default: Redis } = await import('ioredis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const client = new Redis(url);
    await client.ping();
    redisClientSingleton = client;
    redisQueueEnabled = true;
    return client;
  } catch {
    redisClientSingleton = null;
    redisQueueEnabled = false;
    return null;
  }
}

// In-memory webhook storage
const webhooks = new Map();
let webhookCounter = 1;

// In-memory user storage
const users = new Map();
let userCounter = 1;

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const maxBody = parseInt(process.env.BODY_LIMIT_BYTES || '', 10) || 1_000_000; // 1MB default
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > maxBody) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function startMetricsUpdates(server) {
  const interval = setInterval(() => {
    // Keep metrics based on actual execution queue state
    const m = queueMetrics['workflow-execution'];
    queueMetrics['workflow-execution'] = {
      waiting: executionQueue.length,
      active: m.active,
      completed: m.completed,
      failed: m.failed,
      delayed: m.delayed,
      paused: 0
    };
  }, 5000);

  server.on('close', () => clearInterval(interval));
}

// Simple execution worker
let workerActive = false;
async function runExecutionWorker() {
  if (workerActive || redisQueueEnabled) return; // use redis worker if enabled
  workerActive = true;
  const processNext = async () => {
    const job = executionQueue.shift();
    if (!job) {
      workerActive = false;
      return;
    }
    // Mark active
    queueMetrics['workflow-execution'].active += 1;
    const exec = executions.get(job.id) || (await dbGetExecution?.(job.id).catch(() => null));
    if (exec) {
      exec.status = 'RUNNING';
      exec.startedAt = new Date().toISOString();
      if (exec.logs) exec.logs.push({ ts: Date.now(), level: 'info', message: 'Execution started' });
      // Try to persist status transition
      try { await dbUpdateExecution(exec.id, { status: 'RUNNING', startedAt: exec.startedAt, logs: [{ ts: Date.now(), level: 'info', message: 'Execution started' }] }); } catch {}
    }
    // Simulate work
    const duration = Math.floor(Math.random() * 1500) + 500;
    await new Promise(r => setTimeout(r, duration));
    if (exec) {
      // If cancelled during run
      if (exec.status === 'CANCELLED') {
        if (exec.logs) exec.logs.push({ ts: Date.now(), level: 'warn', message: 'Execution cancelled' });
      } else {
        // occasional failure with retry/backoff
        const fail = Math.random() < 0.1;
        if (fail && (exec.attempts ?? 0) < (exec.maxRetries ?? 0)) {
          exec.attempts = (exec.attempts ?? 0) + 1;
          if (exec.logs) exec.logs.push({ ts: Date.now(), level: 'error', message: `Execution failed (attempt ${exec.attempts}), retrying...` });
          const backoff = 500 * exec.attempts;
          setTimeout(async () => {
            const redis = await getRedis();
            if (redis) {
              await redis.lpush('execution_queue', JSON.stringify({ id: exec.id, workflowId: exec.workflowId, input: exec.input }));
              await runRedisWorker();
            } else {
              executionQueue.push(exec);
              runExecutionWorker();
            }
          }, backoff);
          // mark as queued again
          exec.status = 'QUEUED';
        } else if (fail) {
          exec.status = 'FAILED';
          exec.output = { ok: false };
          if (exec.logs) exec.logs.push({ ts: Date.now(), level: 'error', message: 'Execution failed' });
        } else {
          exec.status = 'SUCCESS';
          exec.output = { ok: true };
          if (exec.logs) exec.logs.push({ ts: Date.now(), level: 'info', message: 'Execution completed' });
        }
      }
      exec.finishedAt = new Date().toISOString();
      exec.durationMs = duration;
      try { await dbUpdateExecution(exec.id, { status: exec.status, finishedAt: exec.finishedAt, durationMs: exec.durationMs, output: exec.output, logs: [{ ts: Date.now(), level: 'info', message: 'Execution finished' }] }); } catch {}
    }
    // Update metrics
    queueMetrics['workflow-execution'].active = Math.max(0, queueMetrics['workflow-execution'].active - 1);
    if (exec?.status === 'SUCCESS') queueMetrics['workflow-execution'].completed += 1;
    else if (exec?.status === 'FAILED') queueMetrics['workflow-execution'].failed += 1;
    // Process next
    setImmediate(processNext);
  };
  setImmediate(processNext);
}

async function runRedisWorker() {
  if (redisWorkerActive) return;
  const redis = await getRedis();
  if (!redis) return;
  redisWorkerActive = true;
  (async function loop() {
    try {
      const res = await redis.brpop('execution_queue', 0);
      const payload = res?.[1];
      if (payload) {
        try {
          const msg = JSON.parse(payload);
          const id = msg.id;
          // Ensure a local mirror exists
          if (!executions.get(id)) {
            executions.set(id, { id, workflowId: msg.workflowId, status: 'QUEUED', input: msg.input, logs: [] });
          }
          // Process using the same handler
          queueMetrics['workflow-execution'].waiting = Math.max(0, queueMetrics['workflow-execution'].waiting - 1);
          await new Promise(r => setTimeout(r, 0));
          // call local worker once for this item
          executionQueue.push(executions.get(id));
          workerActive = false; // ensure worker can start
          await runExecutionWorker();
        } catch { /* ignore parse error */ }
      }
    } catch { /* connection error, backoff */ await new Promise(r => setTimeout(r, 1000)); }
    setImmediate(loop);
  })();
}

export function createHealthServer() {
  const server = http.createServer(async (req, res) => {
    setSecurityHeaders(res);
    setCorsHeaders(req, res);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const ip = req.socket.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      res.writeHead(429, { 'Content-Type': 'text/plain' });
      res.end('Too Many Requests');
      return;
    }
    if (req.method === 'GET' && req.url === '/api/v1/health') {
      const payload = {
        status: 'ok',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().rss,
        cpuLoad: os.loadavg()[0],
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    } else if (req.method === 'GET' && req.url && req.url.startsWith('/api/v1/executions')) {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      // GET /api/v1/executions or /api/v1/executions/:id or /api/v1/executions/:id/logs
      if (parts.length === 3) {
        // list
        const workflowId = url.searchParams.get('workflowId');
        const status = url.searchParams.get('status');
        let list;
        try {
          list = await dbListExecutions({ workflowId: workflowId || undefined, status: status ? status.toUpperCase() : undefined });
        } catch {}
        if (!list) {
          list = Array.from(executions.values());
          if (workflowId) list = list.filter(e => e.workflowId === workflowId);
          if (status) list = list.filter(e => e.status === status.toUpperCase());
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ executions: list }));
      } else if (parts.length >= 4) {
        const id = parts[3];
        let exec = executions.get(id);
        if (!exec) {
          try { exec = await dbGetExecution(id); } catch {}
        }
        if (!exec) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Execution not found' }));
          return;
        }
        if (parts.length === 4) {
          // detail
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(exec));
        } else if (parts.length === 5 && parts[4] === 'logs') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          const logs = exec.logs || exec.executionData?.logs || [];
          res.end(JSON.stringify({ logs }));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else if (req.method === 'POST' && req.url === '/api/v1/executions') {
      let body;
      try {
        body = await parseJsonBody(req);
      } catch (e) {
        const message = e instanceof Error && e.message === 'Payload too large' ? 'Payload too large' : 'Invalid JSON';
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
        return;
      }
      const { workflowId, input, maxRetries } = body || {};
      if (!workflowId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'workflowId is required' }));
        return;
      }
      // Optional: check that workflow exists
      let wf = workflows.get(String(workflowId));
      if (!wf) {
        try { wf = await dbGetWorkflow(String(workflowId)); } catch {}
      }
      if (!wf) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Workflow not found' }));
        return;
      }
      // Try to persist execution
      let persistedId = null;
      try {
        const persisted = await dbCreateExecution(String(workflowId), input);
        persistedId = persisted?.id || null;
      } catch {}
      const id = persistedId || String(executionCounter++);
      const exec = {
        id,
        workflowId: String(workflowId),
        status: 'QUEUED',
        input: input ?? {},
        output: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
        durationMs: null,
        logs: [],
        attempts: 0,
        maxRetries: Number.isFinite(maxRetries) ? Math.max(0, Math.min(5, Number(maxRetries))) : 0
      };
      executions.set(id, exec);
      // Queue via Redis if available, else use in-memory
      const redis = await getRedis();
      if (redis) {
        await redis.lpush('execution_queue', JSON.stringify({ id, workflowId: exec.workflowId, input: exec.input }));
        await runRedisWorker();
      } else {
        executionQueue.push(exec);
        runExecutionWorker();
      }
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(exec));
    } else if (req.method === 'POST' && req.url && req.url.startsWith('/api/v1/executions/')) {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/');
      const id = parts[4];
      if (parts[5] === 'cancel') {
        let exec = executions.get(id);
        if (!exec) {
          try { exec = await dbGetExecution(id); } catch {}
        }
        if (!exec) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Execution not found' }));
          return;
        }
        if (exec.status === 'QUEUED' || exec.status === 'RUNNING') {
          exec.status = 'CANCELLED';
          exec.finishedAt = new Date().toISOString();
          if (exec.logs) exec.logs.push({ ts: Date.now(), level: 'warn', message: 'Cancellation requested' });
          try { await dbUpdateExecution(exec.id, { status: 'CANCELLED', finishedAt: exec.finishedAt, logs: [{ ts: Date.now(), level: 'warn', message: 'Cancellation requested' }] }); } catch {}
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Cannot cancel in current state' }));
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else if (req.method === 'GET' && req.url === '/api/v1/queues/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(queueMetrics));
    } else if (req.url && req.url.startsWith('/hooks/')) {
      // Inbound webhook ingest with optional HMAC verification
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/').filter(Boolean);
      const id = parts[1];
      if (req.method !== 'POST' || !id) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      // Read raw body
      const raw = await new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; if (body.length > 2_000_000) { reject(new Error('Payload too large')); req.destroy(); } });
        req.on('end', () => resolve(body));
        req.on('error', reject);
      }).catch(() => null);
      if (raw === null) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        return;
      }
      let json;
      try { json = JSON.parse(raw); } catch { json = { _raw: raw }; }
      let secret = null;
      try {
        const whDb = await (await import('./services/persistence.js')).getWebhook(id);
        secret = whDb?.secret || null;
      } catch {}
      // Verify signature if secret present
      const theirSig = req.headers['x-webhook-signature'] || req.headers['x-signature'] || '';
      if (secret) {
        const h = crypto.createHmac('sha256', secret);
        h.update(raw);
        const computed = `sha256=${h.digest('hex')}`;
        const ok = typeof theirSig === 'string' && timingSafeCompare(computed, theirSig);
        if (!ok) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid signature' }));
          return;
        }
      }
      // Record event
      try { await (await import('./services/persistence.js')).recordWebhookEvent(id, json, req.headers, req.socket.remoteAddress, req.headers['user-agent']); } catch {}
      // Optionally enqueue workflow execution if linked
      // Here we assume webhook id equals workflow id in memory fallback mapping
      const wf = workflows.get(id) || null;
      if (wf) {
        const newExec = { id: String(executionCounter++), workflowId: id, status: 'QUEUED', input: json, createdAt: new Date().toISOString(), logs: [] };
        executions.set(newExec.id, newExec);
        const redis = await getRedis();
        if (redis) {
          await redis.lpush('execution_queue', JSON.stringify({ id: newExec.id, workflowId: id, input: json }));
          await runRedisWorker();
        } else {
          executionQueue.push(newExec);
          runExecutionWorker();
        }
      }
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ accepted: true }));
    } else if (req.url && req.url.startsWith('/api/v1/workflows')) {
      const url = new URL(req.url, 'http://localhost');
      const parts = url.pathname.split('/');
      const id = parts[4];

      if (req.method === 'GET' && url.pathname === '/api/v1/workflows') {
        let list;
        try { list = await dbListWorkflows(); } catch {}
        if (!list) list = Array.from(workflows.values());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ workflows: list }));
      } else if (req.method === 'POST' && url.pathname === '/api/v1/workflows') {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        try {
          const wf = await dbCreateWorkflow(body);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(wf));
        } catch {
          const workflow = { id: String(workflowCounter++), ...body };
          workflows.set(workflow.id, workflow);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(workflow));
        }
      } else if (req.method === 'GET' && id) {
        let wf = workflows.get(id);
        if (!wf) {
          try { wf = await dbGetWorkflow(id); } catch {}
        }
        if (wf) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(wf));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'PUT' && id) {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        try {
          const updated = await dbUpdateWorkflow(id, body);
          if (updated) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(updated));
          } else throw new Error('not found');
        } catch {
          const wf = workflows.get(id);
          if (wf) {
            const updated = { ...wf, ...body };
            workflows.set(id, updated);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(updated));
          } else {
            res.writeHead(404);
            res.end('Not Found');
          }
        }
      } else if (req.method === 'POST' && parts[5] === 'duplicate' && id) {
        let wf = workflows.get(id);
        if (!wf) {
          try { wf = await dbGetWorkflow(id); } catch {}
        }
        if (wf) {
          try {
            const copy = await dbCreateWorkflow({ ...wf, name: `${wf.name || 'Workflow'} (Copy)` });
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(copy));
          } catch {
            const newId = String(workflowCounter++);
            const copy = {
              ...wf,
              id: newId,
              name: `${wf.name || 'Workflow'} (Copy)`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            workflows.set(newId, copy);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(copy));
          }
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'DELETE' && id) {
        try {
          const ok = await dbDeleteWorkflow(id);
          if (ok) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else throw new Error('not deleted');
        } catch {
          const existed = workflows.delete(id);
          res.writeHead(existed ? 200 : 404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: existed }));
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else if (req.url && req.url.startsWith('/api/v1/webhooks')) {
      const url = new URL(req.url, 'http://localhost');
      const id = url.pathname.split('/')[4];

      if (req.method === 'GET' && url.pathname === '/api/v1/webhooks') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ webhooks: Array.from(webhooks.values()) }));
      } else if (req.method === 'POST' && url.pathname === '/api/v1/webhooks') {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        const webhook = { id: String(webhookCounter++), ...body };
        webhooks.set(webhook.id, webhook);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(webhook));
      } else if (req.method === 'GET' && id) {
        const wh = webhooks.get(id);
        if (wh) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(wh));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'PUT' && id) {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        const wh = webhooks.get(id);
        if (wh) {
          const updated = { ...wh, ...body };
          webhooks.set(id, updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'DELETE' && id) {
        const existed = webhooks.delete(id);
        res.writeHead(existed ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: existed }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else if (req.url && req.url.startsWith('/api/v1/users')) {
      const url = new URL(req.url, 'http://localhost');
      const id = url.pathname.split('/')[4];

      if (req.method === 'GET' && url.pathname === '/api/v1/users') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ users: Array.from(users.values()) }));
      } else if (req.method === 'POST' && url.pathname === '/api/v1/users') {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        const user = { id: String(userCounter++), ...body };
        users.set(user.id, user);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(user));
      } else if (req.method === 'GET' && id) {
        const u = users.get(id);
        if (u) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(u));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'PUT' && id) {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        const u = users.get(id);
        if (u) {
          const updated = { ...u, ...body };
          users.set(id, updated);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(updated));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      } else if (req.method === 'DELETE' && id) {
        const existed = users.delete(id);
        res.writeHead(existed ? 200 : 404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: existed }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  startMetricsUpdates(server);
  return server;
}

function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Graceful shutdown handler
 * - Stops accepting new connections
 * - Waits for in-flight requests to complete
 * - Closes database connections (Prisma)
 * - Closes Redis connections
 * - Exits cleanly
 */
async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal');
    return;
  }
  isShuttingDown = true;

  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  // Force shutdown timeout
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  // Prevent the timeout from keeping the process alive if everything else finishes
  forceShutdownTimer.unref();

  // Stop accepting new connections
  if (serverInstance) {
    serverInstance.close(async (err) => {
      if (err) {
        logger.error('Error closing server:', err);
        clearTimeout(forceShutdownTimer);
        process.exit(1);
      }

      logger.info('Server closed. No longer accepting new connections.');
      logger.info('Cleaning up resources...');

      try {
        // Close Redis connections
        if (redisClientSingleton) {
          logger.info('Closing Redis connections...');
          try {
            await redisClientSingleton.quit();
            logger.info('Redis connections closed');
          } catch (redisError) {
            logger.warn('Error closing Redis:', redisError);
          }
        }

        // Close database connections (Prisma)
        try {
          const persistence = await import('./services/persistence.js');
          if (persistence.prisma) {
            logger.info('Closing database connections...');
            await persistence.prisma.$disconnect();
            logger.info('Database connections closed');
          }
        } catch (dbError) {
          // Database might not be initialized or persistence module might not export prisma
          logger.warn('Error closing database (may not be initialized):', dbError.message);
        }

        // Clear any remaining intervals/timers
        // The metrics interval is already handled by server.on('close')

        logger.info('Graceful shutdown complete');
        clearTimeout(forceShutdownTimer);
        process.exit(0);
      } catch (error) {
        logger.error('Error during cleanup:', error);
        clearTimeout(forceShutdownTimer);
        process.exit(1);
      }
    });
  } else {
    logger.info('No server instance to close');
    clearTimeout(forceShutdownTimer);
    process.exit(0);
  }
}

// Register signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 8082;
  serverInstance = createHealthServer();
  serverInstance.listen(port, () => {
    logger.info(`Health server listening on ${port}`);
    logger.info('Press Ctrl+C to gracefully shutdown');
  });
}
