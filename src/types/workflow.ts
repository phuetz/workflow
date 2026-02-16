export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  id: string;
  type: string;
  label: string;
  position: Position;
  icon: string;
  color: string;
  inputs: number;
  outputs: number;
  config?: Record<string, unknown>;
  credentialId?: string;
  enabled?: boolean;
  disabled?: boolean;
  /** Per-node timeout in milliseconds. Default is 30000 (30 seconds). */
  timeout?: number;
  /** User annotation/note attached to this node */
  annotation?: string;
  pinnedData?: {
    data: Record<string, unknown>;
    timestamp: string;
    source: 'manual' | 'execution' | 'import';
    description?: string;
  };
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  sourceHandle: string;
  targetHandle: string;
}

export interface EdgeData {
  condition?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: Position;
  data: NodeData;
  selected?: boolean;
  dragging?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  style?: Record<string, string | number>;
  data?: EdgeData;
  markerEnd?: {
    type: string;
    color: string;
    width: number;
    height: number;
  };
}

export interface NodeType {
  type: string;
  label: string;
  icon: string;
  color: string;
  category: string;
  inputs: number;
  outputs: number;
  description: string;
  /** Whether the node exposes an "on error" handle */
  errorHandle?: boolean;
}

export interface ExecutionStatus {
  nodeId: string;
  status: 'idle' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface StickyNote {
  id: string;
  content: string;
  position: Position;
  size: { width: number; height: number };
  color: string;
  rotation: number;
  attachedToNode?: string;
  zIndex?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
}

export interface ExecutionHistory {
  workflowId: string;
  timestamp: string;
  duration: number;
  status: 'success' | 'error' | 'cancelled';
  nodesExecuted: number;
  errors: string[];
  environment: string;
}

// NodeConfig is an alias for Record<string, unknown> used by node configuration components
export type NodeConfig = Record<string, unknown>;