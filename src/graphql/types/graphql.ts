/**
 * GraphQL TypeScript Types
 * Complete type definitions for GraphQL schema and resolvers
 */

import type { Request } from 'express';

/**
 * GraphQL Context
 */
export interface GraphQLContext {
  user: User | null;
  services: Services;
  loaders: Loaders;
  requestId: string;
  req: Request;
}

/**
 * Services available in context
 */
export interface Services {
  workflow: WorkflowService;
  execution: ExecutionService;
  user: UserService;
  rbac: RBACService;
  audit: AuditService;
  analytics: AnalyticsService;
  queue: QueueService;
  versioning: VersioningService;
  session: SessionService;
  logging: LoggingService;
}

/**
 * DataLoaders for batching
 */
export interface Loaders {
  workflow: any;
  execution: any;
  user: any;
}

/**
 * Service interfaces (placeholder - actual implementations in backend)
 */
export interface WorkflowService {
  findUnique: (args: any) => Promise<Workflow | null>;
  findMany: (args: any) => Promise<Workflow[]>;
  count: (args: any) => Promise<number>;
  create: (args: any) => Promise<Workflow>;
  update: (args: any) => Promise<Workflow>;
  delete: (args: any) => Promise<void>;
}

export interface ExecutionService {
  findUnique: (args: any) => Promise<Execution | null>;
  findFirst: (args: any) => Promise<Execution | null>;
  findMany: (args: any) => Promise<Execution[]>;
  count: (args: any) => Promise<number>;
  create: (args: any) => Promise<Execution>;
  update: (args: any) => Promise<Execution>;
  delete: (args: any) => Promise<void>;
}

export interface UserService {
  findUnique: (args: any) => Promise<User | null>;
  findFirst: (args: any) => Promise<User | null>;
  findMany: (args: any) => Promise<User[]>;
  count: (args: any) => Promise<number>;
  update: (args: any) => Promise<User>;
  delete: (args: any) => Promise<void>;
}

export interface RBACService {
  checkPermission: (userId: string, resource: string, action: string, resourceId?: string) => Promise<boolean>;
  getResourcePermissions: (userId: string, resource: string, resourceId: string) => Promise<any>;
  getUserPermissions: (userId: string) => Promise<Permission[]>;
}

export interface AuditService {
  log: (entry: AuditEntry) => Promise<void>;
}

export interface AnalyticsService {
  recordAccess: (resource: string, resourceId: string, userId: string) => Promise<void>;
  getWorkflowStatistics: (workflowId: string) => Promise<WorkflowStatistics>;
}

export interface QueueService {
  enqueue: (queue: string, data: any) => Promise<void>;
  cancelJob: (jobId: string) => Promise<void>;
}

export interface VersioningService {
  saveVersion: (id: string, oldData: any, newData: any) => Promise<void>;
}

export interface SessionService {
  invalidateUserSessions: (userId: string) => Promise<void>;
}

export interface LoggingService {
  getExecutionLogs: (executionId: string, nodeId?: string) => Promise<ExecutionLog[]>;
}

/**
 * Workflow Types
 */
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  tags: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  schedule?: WorkflowSchedule;
  settings: WorkflowSettings;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: Position;
  config: Record<string, any>;
  disabled: boolean;
  notes?: string;
  retryPolicy?: RetryPolicy;
  timeout?: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated: boolean;
  style?: Record<string, any>;
}

export interface WorkflowVariable {
  key: string;
  value: any;
  type: VariableType;
  description?: string;
}

export interface WorkflowSchedule {
  enabled: boolean;
  cron: string;
  timezone: string;
  nextRun?: Date;
}

export interface WorkflowSettings {
  executionOrder: ExecutionOrder;
  errorWorkflow?: string;
  saveDataSuccessExecution: boolean;
  saveDataErrorExecution: boolean;
  saveDataManualExecution: boolean;
  saveExecutionProgress: boolean;
  timeout?: number;
}

export interface WorkflowStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
  lastExecutionStatus?: ExecutionStatus;
}

export interface Position {
  x: number;
  y: number;
}

export interface RetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  delay: number;
  backoffStrategy: BackoffStrategy;
}

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum VariableType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  SECRET = 'SECRET'
}

export enum ExecutionOrder {
  PARALLEL = 'PARALLEL',
  SEQUENTIAL = 'SEQUENTIAL',
  AUTO = 'AUTO'
}

export enum BackoffStrategy {
  FIXED = 'FIXED',
  LINEAR = 'LINEAR',
  EXPONENTIAL = 'EXPONENTIAL'
}

export interface WorkflowFilter {
  status?: WorkflowStatus;
  tags?: string[];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface WorkflowInput {
  name: string;
  description?: string;
  status?: WorkflowStatus;
  tags?: string[];
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: WorkflowVariable[];
  schedule?: WorkflowSchedule;
  settings?: WorkflowSettings;
}

/**
 * Execution Types
 */
export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  error?: ExecutionError;
  nodeExecutions: NodeExecution[];
  metrics: ExecutionMetrics;
  triggeredBy?: string;
  retryOf?: string;
}

export interface NodeExecution {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
  inputData?: any;
  outputData?: any;
  error?: NodeExecutionError;
  retryCount: number;
  logs: ExecutionLog[];
}

export interface ExecutionError {
  message: string;
  code?: string;
  nodeId?: string;
  stack?: string;
  timestamp: Date;
}

export interface NodeExecutionError {
  message: string;
  code?: string;
  type: string;
  stack?: string;
  timestamp: Date;
}

export interface ExecutionMetrics {
  totalNodes: number;
  successfulNodes: number;
  failedNodes: number;
  skippedNodes: number;
  totalInputBytes: number;
  totalOutputBytes: number;
  peakMemoryUsage: number;
  cpuTime: number;
}

export interface ExecutionLog {
  level: LogLevel;
  message: string;
  timestamp: Date;
  nodeId?: string;
  metadata?: Record<string, any>;
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  CANCELLED = 'CANCELLED',
  TIMEOUT = 'TIMEOUT'
}

export enum ExecutionMode {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  WEBHOOK = 'WEBHOOK',
  TRIGGER = 'TRIGGER',
  TEST = 'TEST'
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}

export interface ExecutionFilter {
  workflowId?: string;
  status?: ExecutionStatus;
  mode?: ExecutionMode;
  startedAfter?: Date;
  startedBefore?: Date;
  finishedAfter?: Date;
  finishedBefore?: Date;
}

export interface ExecutionInput {
  mode?: ExecutionMode;
  inputData?: any;
  startNodeId?: string;
}

/**
 * Node Type Definitions
 */
export interface NodeType {
  type: string;
  name: string;
  category: NodeCategory;
  description: string;
  icon?: string;
  color?: string;
  version: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  credentials: CredentialRequirement[];
  properties: NodeProperty[];
  documentation?: NodeDocumentation;
  examples: NodeExample[];
  deprecated: boolean;
  deprecationMessage?: string;
  tags: string[];
}

export interface NodeInput {
  name: string;
  type: NodeInputType;
  displayName: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: NodeInputOption[];
  validation?: NodeValidation;
  placeholder?: string;
  hint?: string;
}

export interface NodeOutput {
  name: string;
  type: NodeOutputType;
  displayName: string;
  description?: string;
  schema?: any;
}

export interface CredentialRequirement {
  type: string;
  displayName: string;
  required: boolean;
  description?: string;
  documentationUrl?: string;
}

export interface NodeProperty {
  name: string;
  type: PropertyType;
  displayName: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: PropertyOption[];
  validation?: PropertyValidation;
  displayOptions?: DisplayOptions;
}

export interface NodeDocumentation {
  description: string;
  examples?: string;
  notes?: string;
  url?: string;
}

export interface NodeExample {
  name: string;
  description: string;
  workflow: any;
}

export interface NodeInputOption {
  name: string;
  value: string;
  description?: string;
}

export interface NodeValidation {
  type: ValidationType;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface PropertyOption {
  name: string;
  value: any;
  description?: string;
}

export interface PropertyValidation {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: string;
}

export interface DisplayOptions {
  show?: any;
  hide?: any;
}

export enum NodeCategory {
  TRIGGER = 'TRIGGER',
  ACTION = 'ACTION',
  TRANSFORM = 'TRANSFORM',
  CONTROL = 'CONTROL',
  DATABASE = 'DATABASE',
  COMMUNICATION = 'COMMUNICATION',
  CLOUD = 'CLOUD',
  AI = 'AI',
  ANALYTICS = 'ANALYTICS',
  INTEGRATION = 'INTEGRATION',
  UTILITY = 'UTILITY'
}

export enum NodeInputType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  OPTIONS = 'OPTIONS',
  COLLECTION = 'COLLECTION',
  CREDENTIALS = 'CREDENTIALS'
}

export enum NodeOutputType {
  JSON = 'JSON',
  BINARY = 'BINARY',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN'
}

export enum PropertyType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  OPTIONS = 'OPTIONS',
  MULTI_OPTIONS = 'MULTI_OPTIONS',
  CREDENTIALS = 'CREDENTIALS',
  RESOURCE_LOCATOR = 'RESOURCE_LOCATOR',
  COLOR = 'COLOR',
  DATETIME = 'DATETIME',
  CODE = 'CODE',
  JSON = 'JSON'
}

export enum ValidationType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  EMAIL = 'EMAIL',
  URL = 'URL',
  REGEX = 'REGEX',
  CUSTOM = 'CUSTOM'
}

export interface NodeFilter {
  category?: NodeCategory;
  tags?: string[];
  search?: string;
  deprecated?: boolean;
}

export interface NodeCategoryInfo {
  category: NodeCategory;
  displayName: string;
  description: string;
  count: number;
  icon?: string;
}

/**
 * User Types
 */
export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  preferences: UserPreferences;
  statistics?: UserStatistics;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserPreferences {
  theme: Theme;
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  editor: EditorPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  executionSuccess: boolean;
  executionFailure: boolean;
  workflowUpdates: boolean;
}

export interface EditorPreferences {
  snapToGrid: boolean;
  gridSize: number;
  showMinimap: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

export interface UserStatistics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  lastExecutionTime?: Date;
}

export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
  GUEST = 'GUEST'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING'
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  AUTO = 'AUTO'
}

export interface UserFilter {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface UserInput {
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UserPreferencesInput {
  theme?: Theme;
  language?: string;
  timezone?: string;
  notifications?: NotificationPreferencesInput;
  editor?: EditorPreferencesInput;
}

export interface NotificationPreferencesInput {
  email?: boolean;
  push?: boolean;
  executionSuccess?: boolean;
  executionFailure?: boolean;
  workflowUpdates?: boolean;
}

export interface EditorPreferencesInput {
  snapToGrid?: boolean;
  gridSize?: number;
  showMinimap?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

/**
 * Audit Entry
 */
export interface AuditEntry {
  userId: string;
  action: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}
