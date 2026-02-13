/**
 * PLAN C PHASE 3 - Types Stricts
 * Remplace tous les types 'any' par des types stricts et bien définis
 * Améliore la sécurité des types et la maintenabilité
 */

import { Node, Edge, Connection, ReactFlowInstance } from '@xyflow/react';

// ============================================
// Types de base stricts
// ============================================

export type Primitive = string | number | boolean | null | undefined;
export type JsonValue = Primitive | JsonObject | JsonArray;
export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];

export type SafeAny = JsonValue;
export type UnknownObject = Record<string, unknown>;
export type StringRecord = Record<string, string>;
export type NumberRecord = Record<string, number>;

// ============================================
// Types pour les workflows
// ============================================

export interface WorkflowData extends UnknownObject {
  id: string;
  name: string;
  description?: string;
  type: string;
  config: WorkflowConfig;
  inputs?: WorkflowInputs;
  outputs?: WorkflowOutputs;
  metadata?: WorkflowMetadata;
}

export interface WorkflowConfig extends UnknownObject {
  [key: string]: JsonValue;
}

export interface WorkflowInputs extends UnknownObject {
  [inputName: string]: InputDefinition;
}

export interface WorkflowOutputs extends UnknownObject {
  [outputName: string]: OutputDefinition;
}

export interface WorkflowMetadata extends UnknownObject {
  createdAt?: string;
  updatedAt?: string;
  version?: string;
  author?: string;
  tags?: string[];
}

export interface InputDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: JsonValue;
  description?: string;
  validation?: ValidationRule;
}

export interface OutputDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface ValidationRule {
  pattern?: string;
  min?: number;
  max?: number;
  enum?: JsonValue[];
  custom?: (value: JsonValue) => boolean;
}

// ============================================
// Types pour les nodes
// ============================================

export interface StrictNode extends Omit<Node, 'data'> {
  data: WorkflowData;
}

export interface NodeExecutionData extends UnknownObject {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  inputs: JsonObject;
  outputs?: JsonObject;
  error?: ErrorInfo;
  startTime?: string;
  endTime?: string;
  duration?: number;
}

export interface ErrorInfo {
  message: string;
  code?: string;
  stack?: string;
  details?: JsonObject;
}

// ============================================
// Types pour les événements
// ============================================

export type EventPayload = JsonObject;

export interface StrictEvent {
  type: string;
  payload: EventPayload;
  timestamp: string;
  source?: string;
  metadata?: JsonObject;
}

export type EventHandler = (event: StrictEvent) => void | Promise<void>;
export type EventListener = {
  id: string;
  handler: EventHandler;
  once?: boolean;
};

// ============================================
// Types pour les API
// ============================================

export interface ApiRequest<T = JsonObject> {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: StringRecord;
  params?: StringRecord;
  data?: T;
  timeout?: number;
}

export interface ApiResponse<T = JsonObject> {
  status: number;
  statusText: string;
  headers: StringRecord;
  data: T;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  response?: ApiResponse;
}

// ============================================
// Types pour les formulaires
// ============================================

export interface FormData extends UnknownObject {
  [fieldName: string]: FormFieldValue;
}

export type FormFieldValue = string | number | boolean | string[] | File | File[] | null;

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'file' | 'textarea';
  value?: FormFieldValue;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  validation?: FieldValidation;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: FormFieldValue) => string | null;
}

// ============================================
// Types pour les callbacks
// ============================================

export type VoidCallback = () => void;
export type AsyncVoidCallback = () => Promise<void>;
export type DataCallback<T> = (data: T) => void;
export type AsyncDataCallback<T> = (data: T) => Promise<void>;
export type ErrorCallback = (error: Error) => void;
export type AsyncErrorCallback = (error: Error) => Promise<void>;

export type NodeCallback = (node: StrictNode) => void;
export type EdgeCallback = (edge: Edge) => void;
export type ConnectionCallback = (connection: Connection) => void;

// ============================================
// Types pour les états
// ============================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error | ApiError;
  message?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface FilterState extends UnknownObject {
  searchTerm?: string;
  category?: string;
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================
// Types pour les configurations
// ============================================

export interface AppConfig extends UnknownObject {
  apiUrl: string;
  wsUrl?: string;
  environment: 'development' | 'staging' | 'production';
  features: FeatureFlags;
  theme: ThemeConfig;
  auth: AuthConfig;
}

export interface FeatureFlags extends UnknownObject {
  [featureName: string]: boolean;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  accentColor: string;
  fontFamily?: string;
}

export interface AuthConfig {
  provider: 'local' | 'oauth' | 'saml';
  tokenKey: string;
  refreshTokenKey?: string;
  loginUrl: string;
  logoutUrl: string;
}

// ============================================
// Types pour les métriques
// ============================================

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  timestamp: string;
  tags?: StringRecord;
}

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiCallCount: number;
  errorCount: number;
  memoryUsage?: number;
}

// ============================================
// Utilitaires de type
// ============================================

// Type guard pour vérifier si une valeur est un objet
export function isObject(value: unknown): value is UnknownObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guard pour vérifier si une valeur est un tableau
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// Type guard pour vérifier si une valeur est une chaîne
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Type guard pour vérifier si une valeur est un nombre
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

// Type guard pour vérifier si une valeur est un booléen
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// Type guard pour vérifier si une valeur est nulle ou undefined
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// Type guard pour vérifier si une valeur est une fonction
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

// Type guard pour vérifier si une valeur est une promesse
export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise || (
    isObject(value) && 
    'then' in value && 
    isFunction(value.then)
  );
}

// Type guard pour vérifier si une valeur est une erreur
export function isError(value: unknown): value is Error {
  return value instanceof Error || (
    isObject(value) &&
    'message' in value &&
    isString(value.message)
  );
}

// ============================================
// Conversions de type sécurisées
// ============================================

export function toSafeString(value: unknown): string {
  if (isString(value)) return value;
  if (isNullish(value)) return '';
  return String(value);
}

export function toSafeNumber(value: unknown, defaultValue: number = 0): number {
  if (isNumber(value)) return value;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function toSafeBoolean(value: unknown): boolean {
  if (isBoolean(value)) return value;
  if (isString(value)) return value.toLowerCase() === 'true';
  return Boolean(value);
}

export function toSafeArray<T>(value: unknown): T[] {
  if (isArray(value)) return value as T[];
  if (isNullish(value)) return [];
  return [value as T];
}

export function toSafeObject(value: unknown): UnknownObject {
  if (isObject(value)) return value;
  if (isNullish(value)) return {};
  return { value };
}

// ============================================
// Types génériques stricts
// ============================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Export des types pour compatibilité
export type { Node, Edge, Connection, ReactFlowInstance };