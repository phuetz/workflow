/**
 * Workflow types for mobile app
 */

export interface WorkflowNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    config: Record<string, unknown>;
    inputs?: Record<string, unknown>;
    outputs?: Record<string, unknown>;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  style?: {
    stroke?: string;
    strokeWidth?: number;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: 'active' | 'paused' | 'draft';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, string | number | boolean | null>;
  settings?: {
    errorHandling?: 'stop' | 'continue';
    timeout?: number;
    retryCount?: number;
  };
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
  successRate: number;
  avgDuration: number;
  tags?: string[];
  version: number;
  isPublic?: boolean;
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
}