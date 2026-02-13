import { randomUUID } from 'crypto';

export type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface WorkflowNodeData {
  type: string;
  label?: string;
  config?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  position?: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  data?: { condition?: string };
}

export interface WorkflowSettings {
  timeout?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  continueOnError?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: WorkflowSettings;
  createdAt: string;
  updatedAt: string;
}

const workflows = new Map<string, Workflow>();

export function listWorkflows(): Workflow[] {
  return Array.from(workflows.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getWorkflow(id: string): Workflow | null {
  return workflows.get(id) || null;
}

export function createWorkflow(data: Partial<Workflow>): Workflow {
  const now = new Date().toISOString();
  const wf: Workflow = {
    id: randomUUID(),
    name: data.name || 'Untitled workflow',
    description: data.description || '',
    tags: data.tags || [],
    status: (data.status as WorkflowStatus) || 'draft',
    nodes: (data.nodes as WorkflowNode[]) || [],
    edges: (data.edges as WorkflowEdge[]) || [],
    settings: data.settings || { retryOnFailure: true, maxRetries: 3, retryDelay: 1000 },
    createdAt: now,
    updatedAt: now,
  };
  workflows.set(wf.id, wf);
  return wf;
}

export function updateWorkflow(id: string, updates: Partial<Workflow>): Workflow | null {
  const existing = workflows.get(id);
  if (!existing) return null;
  const updated: Workflow = {
    ...existing,
    ...updates,
    // ensure arrays are arrays
    nodes: (updates.nodes as WorkflowNode[]) ?? existing.nodes,
    edges: (updates.edges as WorkflowEdge[]) ?? existing.edges,
    settings: { ...existing.settings, ...(updates.settings || {}) },
    updatedAt: new Date().toISOString(),
  };
  workflows.set(id, updated);
  return updated;
}

export function deleteWorkflow(id: string): boolean {
  return workflows.delete(id);
}

