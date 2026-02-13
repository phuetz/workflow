import type { Workflow as MemWorkflow } from './workflows';
import {
  listWorkflows as memList,
  getWorkflow as memGet,
  createWorkflow as memCreate,
  updateWorkflow as memUpdate,
  deleteWorkflow as memDelete,
} from './workflows';
import {
  createExecution as memCreateExec,
  getExecution as memGetExec,
  listExecutionsByWorkflow as memListExecByWf,
  updateExecution as memUpdateExec,
} from './executions';
import {
  upsertCredential as memUpsertCred,
  listCredentials as memListCred,
  deleteCredential as memDeleteCred,
  getCredentialDecrypted as memGetCred,
} from './credentials';

// Prisma adapter (optional)
let prisma: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require('@prisma/client');
  if (process.env.DATABASE_URL) prisma = new PrismaClient();
} catch (_) {
  prisma = null;
}

// Workflows
export type Workflow = MemWorkflow;

export async function listWorkflows(): Promise<Workflow[]> {
  if (!prisma) return memList();
  const rows = await prisma.workflow.findMany({ orderBy: { updatedAt: 'desc' } });
  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    tags: r.tags ?? [],
    status: String(r.status).toLowerCase(),
    nodes: r.nodes ?? [],
    edges: r.edges ?? [],
    settings: r.settings ?? {},
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  if (!prisma) return memGet(id);
  const r = await prisma.workflow.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    tags: r.tags ?? [],
    status: String(r.status).toLowerCase(),
    nodes: r.nodes ?? [],
    edges: r.edges ?? [],
    settings: r.settings ?? {},
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  if (!prisma) return memCreate(data);
  const r = await prisma.workflow.create({ data: {
    name: data.name || 'Untitled',
    description: data.description ?? null,
    tags: data.tags ?? [],
    status: (data.status || 'draft').toUpperCase(),
    nodes: data.nodes ?? [],
    edges: data.edges ?? [],
    settings: data.settings ?? {},
    userId: data['userId'] || (process.env.SEED_USER_ID || 'seed-user'),
  }});
  return await getWorkflow(r.id) as Workflow;
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow | null> {
  if (!prisma) return memUpdate(id, updates);
  const exists = await prisma.workflow.findUnique({ where: { id } });
  if (!exists) return null;
  await prisma.workflow.update({ where: { id }, data: {
    name: updates.name ?? undefined,
    description: updates.description ?? undefined,
    tags: updates.tags ?? undefined,
    status: updates.status ? String(updates.status).toUpperCase() : undefined,
    nodes: updates.nodes ?? undefined,
    edges: updates.edges ?? undefined,
    settings: updates.settings ?? undefined,
  }});
  return await getWorkflow(id);
}

export async function deleteWorkflow(id: string): Promise<boolean> {
  if (!prisma) return memDelete(id);
  try { await prisma.workflow.delete({ where: { id } }); return true; } catch { return false; }
}

// Executions
export async function createExecution(workflowId: string, input?: unknown) {
  if (!prisma) return memCreateExec(workflowId, input);
  const r = await prisma.workflowExecution.create({ data: {
    workflowId,
    userId: process.env.SEED_USER_ID || 'seed-user',
    status: 'PENDING',
    trigger: { type: 'manual' },
    input: input ?? null,
    executionData: {},
  }});
  return await getExecution(r.id);
}

export async function getExecution(id: string) {
  if (!prisma) return memGetExec(id);
  const r = await prisma.workflowExecution.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    workflowId: r.workflowId,
    status: String(r.status).toLowerCase(),
    input: r.input ?? undefined,
    output: r.output ?? undefined,
    error: r.error ? (r.error.message || 'Execution error') : undefined,
    createdAt: r.startedAt?.toISOString() || new Date().toISOString(),
    startedAt: r.startedAt?.toISOString(),
    finishedAt: r.finishedAt?.toISOString(),
    durationMs: r.duration ?? undefined,
    logs: [],
  };
}

export async function listExecutionsByWorkflow(workflowId: string) {
  if (!prisma) return memListExecByWf(workflowId);
  const rows = await prisma.workflowExecution.findMany({ where: { workflowId }, orderBy: { startedAt: 'desc' } });
  return rows.map((r: any) => ({
    id: r.id,
    workflowId: r.workflowId,
    status: String(r.status).toLowerCase(),
    input: r.input ?? undefined,
    output: r.output ?? undefined,
    error: r.error ? (r.error.message || 'Execution error') : undefined,
    createdAt: r.startedAt?.toISOString() || new Date().toISOString(),
    startedAt: r.startedAt?.toISOString(),
    finishedAt: r.finishedAt?.toISOString(),
    durationMs: r.duration ?? undefined,
    logs: [],
  }));
}

export async function listExecutionsPaged(workflowId: string, page = 1, limit = 20) {
  if (!prisma) {
    const all = memListExecByWf(workflowId);
    const start = (Math.max(1, page) - 1) * Math.max(1, limit);
    return { executions: all.slice(start, start + limit), total: all.length, page, totalPages: Math.ceil(all.length / limit) };
  }
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [items, total] = await Promise.all([
    prisma.workflowExecution.findMany({ where: { workflowId }, orderBy: { startedAt: 'desc' }, skip, take: limit }),
    prisma.workflowExecution.count({ where: { workflowId } }),
  ]);
  return {
    executions: items.map((r: any) => ({
      id: r.id,
      workflowId: r.workflowId,
      status: String(r.status).toLowerCase(),
      input: r.input ?? undefined,
      output: r.output ?? undefined,
      error: r.error ? (r.error.message || 'Execution error') : undefined,
      createdAt: r.startedAt?.toISOString() || new Date().toISOString(),
      startedAt: r.startedAt?.toISOString(),
      finishedAt: r.finishedAt?.toISOString(),
      durationMs: r.duration ?? undefined,
      logs: [],
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateExecution(id: string, updates: any) {
  if (!prisma) return memUpdateExec(id, updates);
  const data: any = {};
  if (updates.status) data.status = String(updates.status).toUpperCase();
  if (updates.startedAt) data.startedAt = new Date(updates.startedAt);
  if (updates.finishedAt) data.finishedAt = new Date(updates.finishedAt);
  if (typeof updates.durationMs === 'number') data.duration = updates.durationMs;
  if (typeof updates.retryCount === 'number') data.retryCount = updates.retryCount;
  if (typeof updates.maxRetries === 'number') data.maxRetries = updates.maxRetries;
  if ('output' in updates) data.output = updates.output ?? null;
  if ('error' in updates) data.error = updates.error ? { message: String(updates.error) } : null;
  if (Array.isArray(updates.logs)) data.executionData = { logs: updates.logs };
  await prisma.workflowExecution.update({ where: { id }, data });
  return await getExecution(id);
}

// Webhooks
type Webhook = { id: string; secret?: string | null };
const memWebhooks = new Map<string, Webhook>();

export async function upsertWebhookSecret(id: string, secret: string) {
  if (!prisma) {
    memWebhooks.set(id, { id, secret });
    return { id };
  }
  const exists = await prisma.webhook.findUnique({ where: { id } }).catch(() => null);
  if (exists) await prisma.webhook.update({ where: { id }, data: { secret } });
  else await prisma.webhook.create({ data: { id, workflowId: id, url: `/hooks/${id}`, method: 'POST', isActive: true, secret } });
  return { id };
}

export async function getWebhookSecret(id: string): Promise<string | null> {
  if (!prisma) return memWebhooks.get(id)?.secret || null;
  const r = await prisma.webhook.findUnique({ where: { id } }).catch(() => null);
  return r?.secret || null;
}

// Node Executions (persist per-node state/logs)
type NodeLog = { ts: number; level: 'debug'|'info'|'warn'|'error'; message: string; data?: unknown };
type NodeExec = { id: string; executionId: string; nodeId: string; nodeName?: string; nodeType?: string; startedAt: string; finishedAt?: string; status: string; logs: NodeLog[] };
const memNodeExecs = new Map<string, NodeExec[]>(); // key: executionId

export async function startNodeExecution(executionId: string, node: { id: string; name?: string; type?: string }) {
  if (!prisma) {
    const arr = memNodeExecs.get(executionId) || [];
    const rec: NodeExec = { id: `${executionId}:${node.id}:${Date.now()}`, executionId, nodeId: node.id, nodeName: node.name, nodeType: node.type, startedAt: new Date().toISOString(), status: 'running', logs: [] };
    arr.push(rec); memNodeExecs.set(executionId, arr); return rec.id;
  }
  const r = await prisma.nodeExecution.create({ data: {
    executionId,
    nodeId: node.id,
    nodeName: node.name || node.id,
    nodeType: node.type || 'custom',
    status: 'RUNNING',
    metadata: { logs: [] },
  }});
  return r.id as string;
}

export async function appendNodeLog(executionId: string, nodeId: string, log: NodeLog) {
  if (!prisma) {
    const arr = memNodeExecs.get(executionId) || [];
    const rec = arr.find(r => r.nodeId === nodeId && !r.finishedAt);
    if (rec) rec.logs.push(log);
    return;
  }
  const rec = await prisma.nodeExecution.findFirst({ where: { executionId, nodeId }, orderBy: { startedAt: 'desc' } });
  if (!rec) return;
  const current = (rec.metadata as any)?.logs || [];
  current.push(log);
  await prisma.nodeExecution.update({ where: { id: rec.id }, data: { metadata: { logs: current } } });
}

export async function finishNodeExecution(executionId: string, nodeId: string, status: 'success'|'failure', output?: unknown, error?: string) {
  if (!prisma) {
    const arr = memNodeExecs.get(executionId) || [];
    const rec = arr.find(r => r.nodeId === nodeId && !r.finishedAt);
    if (rec) { rec.finishedAt = new Date().toISOString(); rec.status = status; if (error) rec.logs.push({ ts: Date.now(), level: 'error', message: error }); }
    return;
  }
  const rec = await prisma.nodeExecution.findFirst({ where: { executionId, nodeId }, orderBy: { startedAt: 'desc' } });
  if (!rec) return;
  await prisma.nodeExecution.update({ where: { id: rec.id }, data: {
    status: status === 'success' ? 'SUCCESS' : 'FAILED',
    finishedAt: new Date(),
    output: output ?? null,
    error: error ? { message: error } : null,
  }});
}

export async function listNodeExecutions(executionId: string, page = 1, limit = 50) {
  if (!prisma) {
    const arr = memNodeExecs.get(executionId) || [];
    const start = (Math.max(1, page) - 1) * Math.max(1, limit);
    return { nodes: arr.slice(start, start + limit), total: arr.length, page, totalPages: Math.ceil(arr.length / limit) };
  }
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const [items, total] = await Promise.all([
    prisma.nodeExecution.findMany({ where: { executionId }, orderBy: { startedAt: 'asc' }, skip, take: limit }),
    prisma.nodeExecution.count({ where: { executionId } }),
  ]);
  return {
    nodes: items.map((r: any) => ({ id: r.id, executionId: r.executionId, nodeId: r.nodeId, nodeName: r.nodeName, nodeType: r.nodeType, startedAt: r.startedAt?.toISOString(), finishedAt: r.finishedAt?.toISOString(), status: String(r.status).toLowerCase(), logs: (r.metadata as any)?.logs || [] })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// Credentials
// Credentials (Prisma-backed with encryption when available)
import crypto from 'crypto';
function key(): Buffer { return crypto.createHash('sha256').update(process.env.MASTER_KEY || 'dev-master-key-please-change-in-prod-32-bytes!').digest(); }
function encrypt(data: unknown) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.from(JSON.stringify({ iv: iv.toString('base64'), ct: enc.toString('base64'), tag: tag.toString('base64') }), 'utf8').toString('base64');
}
function decrypt(dataB64: string) {
  const raw = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf8')) as { iv: string; ct: string; tag: string };
  const d = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(raw.iv, 'base64'));
  d.setAuthTag(Buffer.from(raw.tag, 'base64'));
  const dec = Buffer.concat([d.update(Buffer.from(raw.ct, 'base64')), d.final()]).toString('utf8');
  return JSON.parse(dec);
}

export async function upsertCredential(input: any) {
  if (!prisma) return memUpsertCred(input);
  const id = input.id;
  const now = new Date();
  const payload = { id, name: input.name, kind: input.kind, ...(input || {}) };
  delete (payload as any).createdAt; delete (payload as any).updatedAt;
  const ciphertext = encrypt(payload);
  const typeMap: any = { api_key: 'API_KEY', basic: 'BASIC_AUTH', bearer: 'JWT' };
  if (id) {
    await prisma.credential.update({ where: { id }, data: { name: input.name || undefined, type: typeMap[input.kind] || 'CUSTOM', data: ciphertext, updatedAt: now } });
    return { id, name: input.name, kind: input.kind, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  }
  const r = await prisma.credential.create({ data: { name: input.name || (input.kind || 'CRED'), type: typeMap[input.kind] || 'CUSTOM', data: ciphertext, userId: process.env.SEED_USER_ID || 'seed-user' } });
  return { id: r.id, name: r.name, kind: input.kind || 'api_key', createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}

export async function listCredentials() {
  if (!prisma) return memListCred();
  const rows = await prisma.credential.findMany({ orderBy: { updatedAt: 'desc' } });
  return rows.map((r: any) => ({ id: r.id, name: r.name, kind: (String(r.type).toLowerCase().includes('api') ? 'api_key' : String(r.type).toLowerCase()).replace('basic_auth','basic').replace('jwt','bearer'), createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }));
}

export async function deleteCredential(id: string) {
  if (!prisma) return memDeleteCred(id);
  try { await prisma.credential.delete({ where: { id } }); return true; } catch { return false; }
}

export async function getCredentialDecrypted(id: string) {
  if (!prisma) return memGetCred(id);
  const r = await prisma.credential.findUnique({ where: { id } });
  if (!r) return null;
  return decrypt(r.data);
}
