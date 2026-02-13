import { randomUUID } from 'crypto';

export type ExecutionStatus = 'queued' | 'running' | 'success' | 'failure' | 'cancelled' | 'timeout';

export interface ExecutionLog {
  ts: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  logs: ExecutionLog[];
}

const executions = new Map<string, ExecutionRecord>();

export function createExecution(workflowId: string, input?: unknown): ExecutionRecord {
  const rec: ExecutionRecord = {
    id: randomUUID(),
    workflowId,
    status: 'queued',
    input,
    createdAt: new Date().toISOString(),
    logs: [],
  };
  executions.set(rec.id, rec);
  return rec;
}

export function getExecution(id: string): ExecutionRecord | null {
  return executions.get(id) || null;
}

export function listExecutionsByWorkflow(workflowId: string): ExecutionRecord[] {
  return Array.from(executions.values()).filter(e => e.workflowId === workflowId);
}

export function updateExecution(id: string, updates: Partial<ExecutionRecord>): ExecutionRecord | null {
  const ex = executions.get(id);
  if (!ex) return null;
  const updated: ExecutionRecord = { ...ex, ...updates };
  executions.set(id, updated);
  return updated;
}

