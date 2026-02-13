// Mobile-specific type definitions
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
  tags?: string[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'success' | 'error' | 'waiting' | 'queued';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  error?: string;
  nodeResults: Record<string, NodeExecutionResult>;
  triggeredBy?: string;
}

export interface NodeExecutionResult {
  status: 'success' | 'error' | 'waiting' | 'running';
  data?: unknown;
  error?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface AuthState {
  token?: string;
  refreshToken?: string;
  user?: User;
  isAuthenticated: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'execute';
  entity: 'workflow' | 'execution';
  data: unknown;
  timestamp: string;
  retryCount: number;
  error?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    enabled: boolean;
    executionComplete: boolean;
    executionFailed: boolean;
    workflowUpdated: boolean;
  };
  biometricAuth: boolean;
  offlineMode: boolean;
  syncInterval: number; // in minutes
  autoExecute: boolean;
}

export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  failedExecutions: number;
  avgExecutionTime: number;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Navigation types
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  WorkflowEditor: { workflowId?: string };
  ExecutionDetails: { executionId: string };
  NodeConfig: { nodeId: string; nodeType: string };
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Workflows: undefined;
  Executions: undefined;
  Profile: undefined;
};
