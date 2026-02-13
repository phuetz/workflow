// Lightweight persistence layer with Prisma fallback
import { fileURLToPath } from 'url';
let prisma = null;

async function initPrisma() {
  if (prisma) return prisma;
  try {
    const mod = await import('@prisma/client');
    const { PrismaClient } = mod;
    prisma = new PrismaClient();
    // simple ping
    await prisma.$queryRaw`SELECT 1`;
    return prisma;
  } catch {
    prisma = undefined; // explicitly mark unavailable
    return undefined;
  }
}

// In-memory fallback stores
const mem = {
  workflows: new Map(),
  executions: new Map(),
  webhooks: new Map(),
  webhookEvents: []
};

function cuidLike() {
  // very simple id when prisma not available
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Workflows
export async function createWorkflow(data) {
  const client = await initPrisma();
  if (client) {
    try {
      const anyUser = data.userId
        ? { id: data.userId }
        : await client.user.findFirst({ select: { id: true } });
      if (!anyUser) throw new Error('no-user');
      const wf = await client.workflow.create({
        data: {
          name: data.name ?? 'Untitled Workflow',
          description: data.description ?? null,
          status: 'DRAFT',
          tags: [],
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
          variables: {},
          settings: {},
          user: { connect: { id: anyUser.id } },
        }
      });
      return wf;
    } catch {
      // fall through to memory
    }
  }
  const id = cuidLike();
  const wf = { id, ...data };
  mem.workflows.set(id, wf);
  return wf;
}

export async function listWorkflows() {
  const client = await initPrisma();
  if (client) {
    const list = await client.workflow.findMany({ orderBy: { updatedAt: 'desc' } });
    return list;
  }
  return Array.from(mem.workflows.values());
}

export async function getWorkflow(id) {
  const client = await initPrisma();
  if (client) {
    return await client.workflow.findUnique({ where: { id } });
  }
  return mem.workflows.get(id) || null;
}

export async function updateWorkflow(id, updates) {
  const client = await initPrisma();
  if (client) {
    try {
      const wf = await client.workflow.update({ where: { id }, data: updates });
      return wf;
    } catch {
      return null;
    }
  }
  const current = mem.workflows.get(id);
  if (!current) return null;
  const updated = { ...current, ...updates };
  mem.workflows.set(id, updated);
  return updated;
}

export async function deleteWorkflow(id) {
  const client = await initPrisma();
  if (client) {
    try {
      await client.workflow.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  return mem.workflows.delete(id);
}

// Executions
export async function createExecution(workflowId, input) {
  const client = await initPrisma();
  if (client) {
    try {
      const anyUser = await client.user.findFirst({ select: { id: true } });
      if (!anyUser) throw new Error('no-user');
      const ex = await client.workflowExecution.create({
        data: {
          workflow: { connect: { id: workflowId } },
          user: { connect: { id: anyUser.id } },
          status: 'RUNNING',
          trigger: { type: 'manual' },
          input: input ?? {},
          executionData: { logs: [{ ts: Date.now(), level: 'info', message: 'Execution queued' }] }
        }
      });
      return ex;
    } catch {
      // fall through to memory if workflow/user not found
    }
  }
  const id = cuidLike();
  const ex = {
    id,
    workflowId,
    status: 'QUEUED',
    input: input ?? {},
    output: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    logs: []
  };
  mem.executions.set(id, ex);
  return ex;
}

export async function updateExecution(id, updates) {
  const client = await initPrisma();
  if (client) {
    try {
      const ex = await client.workflowExecution.update({
        where: { id },
        data: normalizeExecutionUpdates(updates)
      });
      return ex;
    } catch {
      // ignore
    }
  }
  const current = mem.executions.get(id);
  if (!current) return null;
  const updated = { ...current, ...updates };
  mem.executions.set(id, updated);
  return updated;
}

export async function getExecution(id) {
  const client = await initPrisma();
  if (client) {
    try {
      const ex = await client.workflowExecution.findUnique({ where: { id } });
      return ex;
    } catch { return null; }
  }
  return mem.executions.get(id) || null;
}

export async function listExecutions(filter = {}) {
  const client = await initPrisma();
  if (client) {
    const where = {};
    if (filter.workflowId) where.workflowId = filter.workflowId;
    if (filter.status) where.status = filter.status;
    const list = await client.workflowExecution.findMany({ where, orderBy: { startedAt: 'desc' } });
    return list;
  }
  let list = Array.from(mem.executions.values());
  if (filter.workflowId) list = list.filter(e => e.workflowId === filter.workflowId);
  if (filter.status) list = list.filter(e => e.status === filter.status);
  return list;
}

export async function appendExecutionLog(id, entry) {
  const client = await initPrisma();
  if (client) {
    try {
      await client.workflowExecution.update({
        where: { id },
        data: {
          executionData: {
            push: { logs: [entry] }
          }
        }
      });
      return true;
    } catch { /* ignore */ }
  }
  const current = mem.executions.get(id);
  if (!current) return false;
  current.logs = current.logs || [];
  current.logs.push(entry);
  return true;
}

// Webhooks
export async function getWebhook(id) {
  const client = await initPrisma();
  if (client) {
    try { return await client.webhook.findUnique({ where: { id } }); } catch { return null; }
  }
  return mem.webhooks.get(id) || null;
}

export async function createWebhook(data) {
  const client = await initPrisma();
  if (client) {
    try {
      const anyWf = data.workflowId ? { id: data.workflowId } : await client.workflow.findFirst({ select: { id: true } });
      if (!anyWf) throw new Error('no-wf');
      return await client.webhook.create({ data: { workflowId: anyWf.id, url: data.url, method: (data.method || 'POST'), isActive: true, secret: data.secret || null, headers: data.headers || {} } });
    } catch { /* fallthrough */ }
  }
  const id = cuidLike();
  const wh = { id, ...data };
  mem.webhooks.set(id, wh);
  return wh;
}

export async function recordWebhookEvent(webhookId, payload, headers, ipAddress, userAgent) {
  const client = await initPrisma();
  if (client) {
    try {
      return await client.webhookEvent.create({
        data: {
          webhook: { connect: { id: webhookId } },
          eventType: headers['x-event-type'] || 'custom',
          payload,
          headers,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          processed: false
        }
      });
    } catch { /* ignore */ }
  }
  const ev = { id: cuidLike(), webhookId, payload, headers, ipAddress, userAgent, createdAt: new Date().toISOString() };
  mem.webhookEvents.push(ev);
  return ev;
}

function normalizeExecutionUpdates(updates) {
  const data = {};
  if (updates.status) data.status = updates.status.toUpperCase();
  if (updates.startedAt) data.startedAt = new Date(updates.startedAt);
  if (updates.finishedAt) data.finishedAt = new Date(updates.finishedAt);
  if (updates.durationMs != null) data.duration = Math.floor(Number(updates.durationMs));
  if (updates.output !== undefined) data.output = updates.output;
  if (updates.error !== undefined) data.error = updates.error;
  if (updates.logs && Array.isArray(updates.logs)) {
    data.executionData = { push: { logs: updates.logs } };
  }
  return data;
}
