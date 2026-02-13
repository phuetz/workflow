/**
 * Enhanced Debugging & Profiling Type Definitions
 * Comprehensive types for step-by-step debugging, profiling, and logging
 */

import type { NodeExecution } from './workflowTypes';

// Extended type definitions
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type BreakpointType = 'standard' | 'conditional' | 'hitCount' | 'logPoint';
export type ExecutionState = 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
export type StepAction = 'stepOver' | 'stepInto' | 'stepOut' | 'continue' | 'pause' | 'stop';
export type NodeExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface BreakpointConfig {
  id: string;
  nodeId: string;
  workflowId: string;
  enabled: boolean;
  condition?: string; // JavaScript expression to evaluate
  hitCount?: number; // Break after N hits
  logMessage?: string; // Message to log when hit
  createdAt: Date;
  createdBy: string;
}

export interface VariableScope {
  nodeInput: Record<string, unknown>;
  nodeOutput: Record<string, unknown>;
  workflowVariables: Record<string, unknown>;
  environmentVariables: Record<string, string>;
  credentials: Record<string, string>;
}

export interface CallStackFrame {
  id: string;
  workflowId: string;
  workflowName: string;
  nodeId: string;
  nodeName: string;
  depth: number;
  variables: VariableScope;
  timestamp: number;
}

export interface WatchExpression {
  id: string;
  expression: string;
  value: unknown;
  error?: string;
  type: string;
  lastEvaluated: number;
}

export interface DebugSession {
  id: string;
  workflowId: string;
  workflowName?: string;
  executionId: string;
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  state: 'running' | 'paused' | 'stopped' | 'completed' | 'error';
  isPaused: boolean;
  currentNodeId?: string;
  breakpoints: Map<string, BreakpointConfig>;
  variables: VariableScope;
  callStack: CallStackFrame[];
  watchExpressions: WatchExpression[];
  stepMode: 'none' | 'step-over' | 'step-into' | 'step-out';
  startTime: Date;
  pausedAt?: Date;
  logs: DebugLog[];
}

export interface DebugFrame {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  variables: Record<string, unknown>;
  timestamp: Date;
  duration?: number;
  error?: Error;
}

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  data?: Record<string, unknown>;
  breakpointId?: string;
}

export interface DebuggerState {
  sessions: Map<string, DebugSession>;
  activeSessionId?: string;
  globalBreakpoints: Map<string, BreakpointConfig>;
  settings: DebuggerSettings;
}

export interface DebuggerSettings {
  pauseOnError: boolean;
  pauseOnWarning: boolean;
  logAllNodes: boolean;
  maxLogEntries: number;
  stepTimeout: number; // milliseconds
  enableConditionalBreakpoints: boolean;
  enableExpressionEvaluation: boolean;
}

export interface StepResult {
  sessionId: string;
  nodeId: string;
  action: 'stepped' | 'paused' | 'completed' | 'error';
  frame: DebugFrame;
  variables: Record<string, unknown>;
  logs: DebugLog[];
}

export interface VariableWatch {
  id: string;
  expression: string;
  value: unknown;
  error?: string;
  lastUpdated: Date;
}

export interface DebuggerCommand {
  type: 'start' | 'pause' | 'resume' | 'step' | 'stop' | 'set-breakpoint' | 'remove-breakpoint' | 'evaluate';
  sessionId: string;
  data?: Record<string, unknown>;
}

export interface DebuggerEvent {
  type: 'session-started' | 'session-paused' | 'session-resumed' | 'session-stopped' | 'breakpoint-hit' | 'step-completed' | 'error-occurred';
  sessionId: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface BreakpointHit {
  breakpointId: string;
  nodeId: string;
  sessionId: string;
  condition?: string;
  conditionResult?: boolean;
  hitCount: number;
  variables: Record<string, unknown>;
  timestamp: Date;
}

export interface NodeInspection {
  nodeId: string;
  nodeType: string;
  nodeName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  executionTime?: number;
  memoryUsage?: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'skipped';
  error?: Error;
  logs: DebugLog[];
  children?: NodeInspection[];
}

export interface WorkflowTrace {
  workflowId: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  totalDuration?: number;
  nodeExecutions: NodeExecution[];
  debugLogs: DebugLog[];
  performanceMetrics: {
    nodesExecuted: number;
    averageNodeTime: number;
    slowestNode: { nodeId: string; duration: number };
    fastestNode: { nodeId: string; duration: number };
    memoryPeak: number;
    errorCount: number;
  };
}

export interface DebuggerMetrics {
  totalSessions: number;
  activeSessions: number;
  totalBreakpoints: number;
  breakpointsHit: number;
  averageSessionDuration: number;
  mostDebuggedWorkflows: Array<{
    workflowId: string;
    sessionCount: number;
  }>;
  commonBreakpointNodes: Array<{
    nodeId: string;
    nodeType: string;
    breakpointCount: number;
  }>;
}

// Helper types for debugging UI components

export interface DebuggerPanelProps {
  session?: DebugSession;
  onCommand: (command: DebuggerCommand) => void;
  onBreakpointToggle: (nodeId: string, enabled: boolean) => void;
}

export interface BreakpointsPanelProps {
  breakpoints: BreakpointConfig[];
  onBreakpointUpdate: (breakpoint: BreakpointConfig) => void;
  onBreakpointDelete: (breakpointId: string) => void;
  onBreakpointCreate: (nodeId: string) => void;
}

export interface VariablesPanelProps {
  variables: Record<string, unknown>;
  watches: VariableWatch[];
  onWatchAdd: (expression: string) => void;
  onWatchRemove: (watchId: string) => void;
  onVariableEdit: (name: string, value: unknown) => void;
}

export interface CallStackPanelProps {
  frames: DebugFrame[];
  currentFrameIndex: number;
  onFrameSelect: (index: number) => void;
}

export interface LogsPanelProps {
  logs: DebugLog[];
  filters: {
    level?: string[];
    nodeId?: string;
    search?: string;
  };
  onFilterChange: (filters: {
    level?: string[];
    nodeId?: string;
    search?: string;
  }) => void;
  onLogClear: () => void;
}

// Utility functions

export function createBreakpoint(
  nodeId: string,
  workflowId: string,
  options: Partial<BreakpointConfig> = {}
): BreakpointConfig {
  return {
    id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    nodeId,
    workflowId,
    enabled: true,
    createdAt: new Date(),
    createdBy: 'user',
    ...options
  };
}

export function createDebugSession(
  workflowId: string,
  executionId: string
): DebugSession {
  return {
    id: `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    workflowId,
    executionId,
    status: 'running',
    state: 'running',
    isPaused: false,
    breakpoints: new Map(),
    variables: {
      nodeInput: {},
      nodeOutput: {},
      workflowVariables: {},
      environmentVariables: {},
      credentials: {}
    },
    callStack: [],
    watchExpressions: [],
    stepMode: 'none',
    startTime: new Date(),
    logs: []
  };
}

export function createDebugLog(
  level: DebugLog['level'],
  message: string,
  options: Partial<DebugLog> = {}
): DebugLog {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    level,
    message,
    ...options
  };
}

export function formatVariableValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

export function evaluateBreakpointCondition(
  condition: string,
  variables: Record<string, unknown>
): boolean {
  try {
    // Simple expression evaluation for conditions like:
    // variables.count > 5
    // input.status === 'error'
    // Boolean(output.result)
    const safeEval = new Function(
      'variables',
      'input',
      'output',
      `return ${condition}`
    );

    return Boolean(safeEval(variables, variables.input, variables.output));
  } catch {
    return false;
  }
}

// Additional extended types for profiling and logging

export interface VariableMetadata {
  name: string;
  value: unknown;
  type: string;
  size?: number;
  isExpandable: boolean;
  isEditable: boolean;
  path: string[];
}

export interface NodePerformanceMetrics {
  nodeId: string;
  nodeName: string;
  executionCount: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  medianTime: number;
  cpuUsage: number;
  memoryUsage: number;
  networkRequests: number;
  networkTime: number;
  databaseQueries: number;
  databaseTime: number;
}

export interface TimelineEvent {
  id: string;
  nodeId: string;
  nodeName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: NodeExecutionStatus;
  depth: number;
  parallel: boolean;
}

export interface MemorySnapshot {
  id: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  allocations: MemoryAllocation[];
}

export interface MemoryAllocation {
  id: string;
  nodeId: string;
  size: number;
  timestamp: number;
  type: string;
  retained: boolean;
}

export interface FlameGraphNode {
  name: string;
  value: number;
  children: FlameGraphNode[];
  nodeId?: string;
  color?: string;
}

export interface PerformanceRecommendation {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  nodeId: string;
  nodeName: string;
  type: 'slow-execution' | 'high-memory' | 'too-many-requests' | 'inefficient-query';
  message: string;
  suggestion: string;
  metrics: {
    current: number;
    threshold: number;
    unit: string;
  };
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  source: string;
  message: string;
  context: LogContext;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

export interface LogContext {
  workflowId: string;
  workflowName: string;
  executionId: string;
  nodeId?: string;
  nodeName?: string;
  userId?: string;
  sessionId?: string;
}

export interface LogFilter {
  levels?: LogLevel[];
  sources?: string[];
  startTime?: number;
  endTime?: number;
  searchText?: string;
  useRegex?: boolean;
}

export type LogExportFormat = 'json' | 'csv' | 'txt';

export interface DebugConfiguration {
  id: string;
  name: string;
  workflowId: string;
  breakpoints: BreakpointConfig[];
  watchExpressions: string[];
  logLevel: LogLevel;
  enableProfiling: boolean;
  enableMemoryProfiling: boolean;
  autoScrollLogs: boolean;
  soundOnError: boolean;
  created: number;
  updated: number;
}

export type DebuggerEventType =
  | { type: 'breakpoint-hit'; breakpoint: BreakpointConfig; variables: VariableScope }
  | { type: 'step-completed'; nodeId: string; variables: VariableScope }
  | { type: 'execution-paused'; nodeId: string }
  | { type: 'execution-resumed' }
  | { type: 'execution-stopped' }
  | { type: 'execution-completed'; duration: number }
  | { type: 'execution-failed'; error: Error }
  | { type: 'variable-changed'; path: string[]; value: unknown }
  | { type: 'log-entry'; entry: LogEntry };

export interface ProfilerStatistics {
  totalExecutionTime: number;
  totalCPUTime: number;
  totalMemoryUsed: number;
  totalNetworkRequests: number;
  totalDatabaseQueries: number;
  nodeMetrics: Map<string, NodePerformanceMetrics>;
  timeline: TimelineEvent[];
  bottlenecks: string[];
  recommendations: PerformanceRecommendation[];
}

export interface MemoryProfilerResults {
  snapshots: MemorySnapshot[];
  leaks: MemoryLeak[];
  gcEvents: GCEvent[];
  peakMemory: number;
  averageMemory: number;
}

export interface MemoryLeak {
  id: string;
  nodeId: string;
  nodeName: string;
  size: number;
  growthRate: number;
  allocations: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface GCEvent {
  id: string;
  timestamp: number;
  type: 'scavenge' | 'mark-sweep' | 'incremental';
  duration: number;
  freedMemory: number;
}

export interface DebuggerOptions {
  enableBreakpoints?: boolean;
  enableProfiling?: boolean;
  enableMemoryProfiling?: boolean;
  maxLogEntries?: number;
  logLevel?: LogLevel;
  profilingInterval?: number;
  memorySnapshotInterval?: number;
}

export interface StepControllerState {
  action: StepAction | null;
  targetNodeId: string | null;
  shouldPause: boolean;
  stepDepth: number;
}

export interface RemoteDebugConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  authToken?: string;
}

export interface DebugToolbarState {
  visible: boolean;
  position: 'top' | 'bottom';
  compact: boolean;
  showVariables: boolean;
  showLogs: boolean;
  showProfiler: boolean;
}