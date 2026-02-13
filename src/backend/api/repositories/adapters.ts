import type { Workflow as MemWorkflow, WorkflowStatus } from './workflows';
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
import type { PrismaClient, Workflow as PrismaWorkflow, WorkflowExecution as PrismaExecution } from '@prisma/client';
import { Prisma } from '@prisma/client';

// Helper to cast typed objects to Prisma InputJsonValue
const toJson = (val: unknown): Prisma.InputJsonValue => val as Prisma.InputJsonValue;
const toJsonOrNull = (val: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =>
  val === null || val === undefined ? Prisma.DbNull : (val as Prisma.InputJsonValue);

// Type definitions for Prisma rows
interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  status: string;
  nodes: unknown[];
  edges: unknown[];
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

interface ExecutionRow {
  id: string;
  workflowId: string;
  status: string;
  input: unknown | null;
  output: unknown | null;
  error: { message?: string } | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  duration: number | null;
}

// Execution update input type
interface ExecutionUpdateInput {
  status?: string;
  output?: unknown;
  error?: string;
  finishedAt?: Date;
  duration?: number;
}

// Prisma adapter (optional) - lazy-loaded using ES module dynamic import
let prisma: PrismaClient | null = null;
let prismaInitialized = false;

const initPrisma = async (): Promise<void> => {
  if (prismaInitialized) return;
  prismaInitialized = true;
  try {
    const { PrismaClient } = await import('@prisma/client');
    if (process.env.DATABASE_URL) prisma = new PrismaClient();
  } catch {
    prisma = null;
  }
};

// Initialize Prisma on module load
initPrisma();

// Workflows
export type Workflow = MemWorkflow;

// Helper function to map workflow row to domain object
function mapWorkflowRow(r: WorkflowRow): Workflow {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    tags: r.tags ?? [],
    status: String(r.status).toLowerCase() as WorkflowStatus,
    nodes: (r.nodes ?? []) as unknown as MemWorkflow['nodes'],
    edges: (r.edges ?? []) as unknown as MemWorkflow['edges'],
    settings: (r.settings ?? {}) as MemWorkflow['settings'],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// Helper function to map execution row to domain object
function mapExecutionRow(r: ExecutionRow) {
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

export async function listWorkflows(): Promise<Workflow[]> {
  if (!prisma) return memList();
  const rows = await prisma.workflow.findMany({ orderBy: { updatedAt: 'desc' } });
  return rows.map((r) => mapWorkflowRow(r as unknown as WorkflowRow));
}

export async function getWorkflow(id: string): Promise<Workflow | null> {
  if (!prisma) return memGet(id);
  const r = await prisma.workflow.findUnique({ where: { id } });
  if (!r) return null;
  return mapWorkflowRow(r as unknown as WorkflowRow);
}

export async function createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
  if (!prisma) return memCreate(data);
  const r = await prisma.workflow.create({ data: {
    name: data.name || 'Untitled',
    description: data.description ?? null,
    tags: data.tags ?? [],
    status: (data.status || 'draft').toUpperCase() as any,
    nodes: toJson(data.nodes ?? []),
    edges: toJson(data.edges ?? []),
    settings: toJson(data.settings ?? {}),
    userId: (data as Record<string, unknown>)['userId'] as string || (process.env.SEED_USER_ID || 'seed-user'),
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
    status: updates.status ? String(updates.status).toUpperCase() as any : undefined,
    nodes: updates.nodes ? toJson(updates.nodes) : undefined,
    edges: updates.edges ? toJson(updates.edges) : undefined,
    settings: updates.settings ? toJson(updates.settings) : undefined,
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
    trigger: toJson({ type: 'manual' }),
    input: toJsonOrNull(input ?? null),
    executionData: toJson({}),
  }});
  return await getExecution(r.id);
}

export async function getExecution(id: string) {
  if (!prisma) return memGetExec(id);
  const r = await prisma.workflowExecution.findUnique({ where: { id } });
  if (!r) return null;
  return mapExecutionRow(r as unknown as ExecutionRow);
}

export async function listExecutionsByWorkflow(workflowId: string) {
  if (!prisma) return memListExecByWf(workflowId);
  const rows = await prisma.workflowExecution.findMany({ where: { workflowId }, orderBy: { startedAt: 'desc' } });
  return rows.map((r) => mapExecutionRow(r as unknown as ExecutionRow));
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
    executions: items.map((r) => mapExecutionRow(r as unknown as ExecutionRow)),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

interface ExecutionUpdates {
  status?: string;
  startedAt?: string | Date;
  finishedAt?: string | Date;
  durationMs?: number;
  retryCount?: number;
  maxRetries?: number;
  output?: unknown;
  error?: string;
  logs?: unknown[];
}

export async function updateExecution(id: string, updates: ExecutionUpdates) {
  if (!prisma) return memUpdateExec(id, updates as any);
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

// Webhooks - Extended for multi-webhook support
export interface WebhookData {
  id: string;
  workflowId: string;
  name: string;
  path: string;
  url: string;
  method: string;
  isActive: boolean;
  secret?: string | null;
  description?: string | null;
  headers?: Record<string, unknown>;
  triggerCount: number;
  lastTriggeredAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebhookCreateInput {
  workflowId: string;
  name: string;
  path: string;
  method?: string;
  secret?: string | null;
  description?: string | null;
  headers?: Record<string, unknown>;
}

interface WebhookUpdateInput {
  name?: string;
  path?: string;
  method?: string;
  isActive?: boolean;
  secret?: string | null;
  description?: string | null;
  headers?: Record<string, unknown>;
}

// In-memory storage for webhooks (workflowId:path -> webhook)
const memWebhooks = new Map<string, WebhookData>();
const memWebhooksById = new Map<string, WebhookData>();

function generateWebhookId(): string {
  return `whk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * List all webhooks for a workflow
 */
export async function listWebhooksByWorkflow(workflowId: string): Promise<WebhookData[]> {
  if (!prisma) {
    const webhooks: WebhookData[] = [];
    const allWebhooks = Array.from(memWebhooks.values());
    for (const wh of allWebhooks) {
      if (wh.workflowId === workflowId) {
        webhooks.push(wh);
      }
    }
    return webhooks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const rows = await prisma.webhook.findMany({
    where: { workflowId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r: any) => ({
    id: r.id,
    workflowId: r.workflowId,
    name: r.name || 'default',
    path: r.path || 'default',
    url: r.url,
    method: r.method,
    isActive: r.isActive,
    secret: r.secret,
    description: r.description,
    headers: r.headers as Record<string, unknown>,
    triggerCount: r.triggerCount,
    lastTriggeredAt: r.lastTriggeredAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/**
 * Get a webhook by workflow ID and path
 */
export async function getWebhookByWorkflowAndPath(workflowId: string, path: string): Promise<WebhookData | null> {
  const key = `${workflowId}:${path}`;
  if (!prisma) {
    return memWebhooks.get(key) || null;
  }
  const r = await prisma.webhook.findFirst({
    where: { workflowId, path },
  }).catch(() => null);
  if (!r) return null;
  return {
    id: r.id,
    workflowId: r.workflowId,
    name: (r as any).name || 'default',
    path: (r as any).path || 'default',
    url: r.url,
    method: r.method,
    isActive: r.isActive,
    secret: r.secret,
    description: (r as any).description,
    headers: r.headers as Record<string, unknown>,
    triggerCount: r.triggerCount,
    lastTriggeredAt: r.lastTriggeredAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Get a webhook by ID
 */
export async function getWebhookById(id: string): Promise<WebhookData | null> {
  if (!prisma) {
    return memWebhooksById.get(id) || null;
  }
  const r = await prisma.webhook.findUnique({ where: { id } }).catch(() => null);
  if (!r) return null;
  return {
    id: r.id,
    workflowId: r.workflowId,
    name: (r as any).name || 'default',
    path: (r as any).path || 'default',
    url: r.url,
    method: r.method,
    isActive: r.isActive,
    secret: r.secret,
    description: (r as any).description,
    headers: r.headers as Record<string, unknown>,
    triggerCount: r.triggerCount,
    lastTriggeredAt: r.lastTriggeredAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Create a new webhook
 */
export async function createWebhook(input: WebhookCreateInput): Promise<WebhookData> {
  const now = new Date();
  const url = `/webhook/${input.workflowId}/${input.path}`;

  if (!prisma) {
    const id = generateWebhookId();
    const webhook: WebhookData = {
      id,
      workflowId: input.workflowId,
      name: input.name,
      path: input.path,
      url,
      method: input.method || 'POST',
      isActive: true,
      secret: input.secret,
      description: input.description,
      headers: input.headers || {},
      triggerCount: 0,
      lastTriggeredAt: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    const key = `${input.workflowId}:${input.path}`;
    memWebhooks.set(key, webhook);
    memWebhooksById.set(id, webhook);
    return webhook;
  }

  const r = await prisma.webhook.create({
    data: {
      workflowId: input.workflowId,
      name: input.name,
      path: input.path,
      url,
      method: (input.method || 'POST') as any,
      isActive: true,
      secret: input.secret,
      description: input.description,
      headers: (input.headers || {}) as any,
    },
  });

  return {
    id: r.id,
    workflowId: r.workflowId,
    name: (r as any).name || 'default',
    path: (r as any).path || 'default',
    url: r.url,
    method: r.method,
    isActive: r.isActive,
    secret: r.secret,
    description: (r as any).description,
    headers: r.headers as Record<string, unknown>,
    triggerCount: r.triggerCount,
    lastTriggeredAt: r.lastTriggeredAt?.toISOString() || null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Update an existing webhook
 */
export async function updateWebhook(id: string, updates: WebhookUpdateInput): Promise<WebhookData | null> {
  if (!prisma) {
    const webhook = memWebhooksById.get(id);
    if (!webhook) return null;

    const oldKey = `${webhook.workflowId}:${webhook.path}`;

    // Apply updates
    if (updates.name !== undefined) webhook.name = updates.name;
    if (updates.path !== undefined) {
      webhook.path = updates.path;
      webhook.url = `/webhook/${webhook.workflowId}/${updates.path}`;
    }
    if (updates.method !== undefined) webhook.method = updates.method;
    if (updates.isActive !== undefined) webhook.isActive = updates.isActive;
    if (updates.secret !== undefined) webhook.secret = updates.secret;
    if (updates.description !== undefined) webhook.description = updates.description;
    if (updates.headers !== undefined) webhook.headers = updates.headers;
    webhook.updatedAt = new Date().toISOString();

    // Update keys if path changed
    if (updates.path !== undefined) {
      memWebhooks.delete(oldKey);
      const newKey = `${webhook.workflowId}:${webhook.path}`;
      memWebhooks.set(newKey, webhook);
    }

    return webhook;
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.path !== undefined) {
    updateData.path = updates.path;
    // Get current webhook to update URL
    const current = await prisma.webhook.findUnique({ where: { id } });
    if (current) {
      updateData.url = `/webhook/${current.workflowId}/${updates.path}`;
    }
  }
  if (updates.method !== undefined) updateData.method = updates.method;
  if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
  if (updates.secret !== undefined) updateData.secret = updates.secret;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.headers !== undefined) updateData.headers = updates.headers;

  try {
    const r = await prisma.webhook.update({
      where: { id },
      data: updateData,
    });

    return {
      id: r.id,
      workflowId: r.workflowId,
      name: (r as any).name || 'default',
      path: (r as any).path || 'default',
      url: r.url,
      method: r.method,
      isActive: r.isActive,
      secret: r.secret,
      description: (r as any).description,
      headers: r.headers as Record<string, unknown>,
      triggerCount: r.triggerCount,
      lastTriggeredAt: r.lastTriggeredAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<boolean> {
  if (!prisma) {
    const webhook = memWebhooksById.get(id);
    if (!webhook) return false;

    const key = `${webhook.workflowId}:${webhook.path}`;
    memWebhooks.delete(key);
    memWebhooksById.delete(id);
    return true;
  }

  try {
    await prisma.webhook.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// Legacy webhook functions for backward compatibility
export async function upsertWebhookSecret(id: string, secret: string) {
  // For legacy API, treat 'id' as workflowId and use 'default' path
  if (!prisma) {
    // Check if a default webhook exists for this workflow
    const key = `${id}:default`;
    let webhook = memWebhooks.get(key);
    if (webhook) {
      webhook.secret = secret;
      webhook.updatedAt = new Date().toISOString();
    } else {
      // Create a default webhook
      webhook = {
        id: generateWebhookId(),
        workflowId: id,
        name: 'default',
        path: 'default',
        url: `/webhook/${id}/default`,
        method: 'POST',
        isActive: true,
        secret,
        description: 'Default webhook (legacy)',
        headers: {},
        triggerCount: 0,
        lastTriggeredAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memWebhooks.set(key, webhook);
      memWebhooksById.set(webhook.id, webhook);
    }
    return { id: webhook.id };
  }

  // Check for existing webhook with default path
  const exists = await prisma.webhook.findFirst({
    where: { workflowId: id, path: 'default' },
  }).catch(() => null);

  if (exists) {
    await prisma.webhook.update({ where: { id: exists.id }, data: { secret } });
    return { id: exists.id };
  } else {
    const r = await prisma.webhook.create({
      data: {
        workflowId: id,
        name: 'default',
        path: 'default',
        url: `/webhook/${id}/default`,
        method: 'POST',
        isActive: true,
        secret,
      },
    });
    return { id: r.id };
  }
}

export async function getWebhookSecret(id: string): Promise<string | null> {
  // For legacy API, first try to find webhook by ID, then by workflowId with default path
  if (!prisma) {
    // Try by webhook ID first
    const byId = memWebhooksById.get(id);
    if (byId) return byId.secret || null;

    // Then try by workflowId with default path
    const key = `${id}:default`;
    const webhook = memWebhooks.get(key);
    return webhook?.secret || null;
  }

  // Try by webhook ID first
  const byId = await prisma.webhook.findUnique({ where: { id } }).catch(() => null);
  if (byId) return byId.secret || null;

  // Then try by workflowId with default path
  const byPath = await prisma.webhook.findFirst({
    where: { workflowId: id, path: 'default' },
  }).catch(() => null);

  return byPath?.secret || null;
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
    output: toJsonOrNull(output ?? null),
    error: toJsonOrNull(error ? { message: error } : null),
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
import * as crypto from 'crypto';
function key(): Buffer {
  const raw = process.env.ENCRYPTION_MASTER_KEY || process.env.MASTER_KEY;
  if (!raw) {
    throw new Error('SECURITY ERROR: ENCRYPTION_MASTER_KEY environment variable is required.');
  }
  return crypto.createHash('sha256').update(raw).digest();
}
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
