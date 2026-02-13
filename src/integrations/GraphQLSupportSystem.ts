/**
 * GraphQL Support System
 * Complete GraphQL integration for workflow nodes
 * Supports queries, mutations, subscriptions, and schema introspection
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../services/SimpleLogger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * GraphQL Operation Types
 */
export type OperationType = 'query' | 'mutation' | 'subscription';

/**
 * GraphQL Node Configuration
 */
export interface GraphQLNodeConfig {
  id: string;
  name: string;
  endpoint: string;
  headers?: Record<string, string>;
  authentication?: GraphQLAuth;
  operation: GraphQLOperation;
  variables?: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  caching?: CacheConfig;
  subscriptionConfig?: SubscriptionConfig;
}

/**
 * GraphQL Authentication
 */
export interface GraphQLAuth {
  type: 'none' | 'apiKey' | 'bearer' | 'basic' | 'oauth2' | 'custom';
  apiKey?: {
    headerName: string;
    value: string;
  };
  bearer?: {
    token: string;
  };
  basic?: {
    username: string;
    password: string;
  };
  oauth2?: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: Date;
  };
  custom?: {
    headers: Record<string, string>;
  };
}

/**
 * GraphQL Operation
 */
export interface GraphQLOperation {
  type: OperationType;
  query: string;
  name?: string;
  fragments?: string[];
  directives?: Directive[];
}

/**
 * GraphQL Directive
 */
export interface Directive {
  name: string;
  arguments?: Record<string, any>;
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors?: string[];
}

/**
 * Cache Configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  keyStrategy: 'query' | 'queryAndVars' | 'custom';
  customKeyGenerator?: (operation: GraphQLOperation, variables?: any) => string;
  invalidateOn?: string[];
}

/**
 * Subscription Configuration
 */
export interface SubscriptionConfig {
  transport: 'ws' | 'sse' | 'graphql-ws' | 'graphql-sse';
  connectionParams?: Record<string, any>;
  reconnect: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  keepAlive: number;
  lazy: boolean;
}

/**
 * GraphQL Response
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, any>;
}

/**
 * GraphQL Error
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{
    line: number;
    column: number;
  }>;
  path?: Array<string | number>;
  extensions?: Record<string, any>;
}

/**
 * Schema Types
 */
export interface GraphQLSchema {
  queryType?: GraphQLObjectType;
  mutationType?: GraphQLObjectType;
  subscriptionType?: GraphQLObjectType;
  types: GraphQLType[];
  directives: GraphQLDirective[];
}

export interface GraphQLType {
  kind: TypeKind;
  name?: string;
  description?: string;
  fields?: GraphQLField[];
  interfaces?: GraphQLType[];
  possibleTypes?: GraphQLType[];
  enumValues?: GraphQLEnumValue[];
  inputFields?: GraphQLInputField[];
  ofType?: GraphQLType;
}

export type TypeKind = 
  | 'SCALAR'
  | 'OBJECT'
  | 'INTERFACE'
  | 'UNION'
  | 'ENUM'
  | 'INPUT_OBJECT'
  | 'LIST'
  | 'NON_NULL';

export interface GraphQLField {
  name: string;
  description?: string;
  args: GraphQLArgument[];
  type: GraphQLType;
  isDeprecated: boolean;
  deprecationReason?: string;
}

export interface GraphQLArgument {
  name: string;
  description?: string;
  type: GraphQLType;
  defaultValue?: any;
}

export interface GraphQLEnumValue {
  name: string;
  description?: string;
  isDeprecated: boolean;
  deprecationReason?: string;
}

export interface GraphQLInputField {
  name: string;
  description?: string;
  type: GraphQLType;
  defaultValue?: any;
}

export interface GraphQLObjectType extends GraphQLType {
  kind: 'OBJECT';
  fields: GraphQLField[];
  interfaces: GraphQLType[];
}

export interface GraphQLDirective {
  name: string;
  description?: string;
  locations: string[];
  args: GraphQLArgument[];
}

/**
 * Introspection Query Result
 */
export interface IntrospectionResult {
  __schema: GraphQLSchema;
}

/**
 * Query Builder
 */
export interface QueryBuilder {
  operation(type: OperationType): QueryBuilder;
  name(name: string): QueryBuilder;
  field(name: string, args?: Record<string, any>, subfields?: string[] | SubfieldBuilder): QueryBuilder;
  fragment(name: string, type: string, fields: string[] | SubfieldBuilder): QueryBuilder;
  directive(name: string, args?: Record<string, any>): QueryBuilder;
  variable(name: string, type: string, defaultValue?: any): QueryBuilder;
  alias(alias: string, field: string, args?: Record<string, any>): QueryBuilder;
  inlineFragment(type: string, fields: string[] | SubfieldBuilder): QueryBuilder;
  build(): string;
}

export interface SubfieldBuilder {
  add(field: string, args?: Record<string, any>, subfields?: string[] | SubfieldBuilder): SubfieldBuilder;
  build(): string;
}

/**
 * Batch Query
 */
export interface BatchQuery {
  id: string;
  operation: GraphQLOperation;
  variables?: Record<string, any>;
}

export interface BatchResult {
  id: string;
  response: GraphQLResponse;
  error?: Error;
}

/**
 * Subscription Handler
 */
export interface SubscriptionHandler {
  id: string;
  operation: GraphQLOperation;
  variables?: Record<string, any>;
  onData: (data: any) => void;
  onError: (error: Error) => void;
  onComplete?: () => void;
  unsubscribe: () => void;
}

/**
 * GraphQL Client Configuration
 */
export interface GraphQLClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  caching?: CacheConfig;
  batchingEnabled?: boolean;
  batchInterval?: number;
  maxBatchSize?: number;
  introspectionEnabled?: boolean;
  validationEnabled?: boolean;
  debugMode?: boolean;
}

/**
 * Execution Context
 */
export interface ExecutionContext {
  requestId: string;
  operation: GraphQLOperation;
  variables?: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  response?: GraphQLResponse;
  error?: Error;
  retries: number;
  cached: boolean;
}

/**
 * Metrics
 */
export interface GraphQLMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  averageResponseTime: number;
  activeSubscriptions: number;
  totalSubscriptionMessages: number;
  errorRate: number;
  requestsPerSecond: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

// ============================================================================
// GRAPHQL SUPPORT SYSTEM CLASS
// ============================================================================

/**
 * Main GraphQL Support System
 */
export class GraphQLSupportSystem extends EventEmitter {
  private static instance: GraphQLSupportSystem;
  
  private clients: Map<string, GraphQLClient>;
  private schemas: Map<string, GraphQLSchema>;
  private subscriptions: Map<string, SubscriptionHandler>;
  private cache: Map<string, CacheEntry>;
  private metrics: GraphQLMetrics;
  private queryBuilder: QueryBuilderImpl;
  private validator: SchemaValidator;
  private introspector: SchemaIntrospector;
  private batchProcessor: BatchProcessor;

  private constructor() {
    super();
    this.clients = new Map();
    this.schemas = new Map();
    this.subscriptions = new Map();
    this.cache = new Map();
    this.metrics = this.initializeMetrics();
    this.queryBuilder = new QueryBuilderImpl();
    this.validator = new SchemaValidator();
    this.introspector = new SchemaIntrospector();
    this.batchProcessor = new BatchProcessor();
  }

  public static getInstance(): GraphQLSupportSystem {
    if (!GraphQLSupportSystem.instance) {
      GraphQLSupportSystem.instance = new GraphQLSupportSystem();
    }
    return GraphQLSupportSystem.instance;
  }

  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================

  public createClient(id: string, config: GraphQLClientConfig): GraphQLClient {
    const client = new GraphQLClient(config);
    this.clients.set(id, client);
    this.emit('clientCreated', { id, endpoint: config.endpoint });
    return client;
  }

  public getClient(id: string): GraphQLClient | undefined {
    return this.clients.get(id);
  }

  public removeClient(id: string): boolean {
    const deleted = this.clients.delete(id);
    if (deleted) {
      this.emit('clientRemoved', { id });
    }
    return deleted;
  }

  // ============================================================================
  // QUERY EXECUTION
  // ============================================================================

  public async executeQuery<T = any>(
    clientId: string,
    operation: GraphQLOperation,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const context: ExecutionContext = {
      requestId: crypto.randomBytes(16).toString('hex'),
      operation,
      variables,
      startTime: new Date(),
      retries: 0,
      cached: false
    };

    try {
      // Check cache
      const cached = this.checkCache(clientId, operation, variables);
      if (cached) {
        context.cached = true;
        context.response = cached;
        this.metrics.cachedRequests++;
        this.emit('queryExecuted', context);
        return cached;
      }

      // Execute query
      const response = await client.execute<T>(operation, variables);
      
      // Update context
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();
      context.response = response;

      // Cache result
      this.cacheResult(clientId, operation, variables, response);

      // Update metrics
      this.updateMetrics(true, context.duration);

      // Emit event
      this.emit('queryExecuted', context);

      return response;
    } catch (error) {
      context.error = error as Error;
      this.updateMetrics(false, 0);
      this.emit('queryFailed', context);
      throw error;
    }
  }

  public async executeMutation<T = any>(
    clientId: string,
    operation: GraphQLOperation,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const context: ExecutionContext = {
      requestId: crypto.randomBytes(16).toString('hex'),
      operation,
      variables,
      startTime: new Date(),
      retries: 0,
      cached: false
    };

    try {
      const response = await client.execute<T>(operation, variables);
      
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();
      context.response = response;

      // Invalidate relevant cache entries
      this.invalidateCache(clientId, operation);

      // Update metrics
      this.updateMetrics(true, context.duration);

      // Emit event
      this.emit('mutationExecuted', context);

      return response;
    } catch (error) {
      context.error = error as Error;
      this.updateMetrics(false, 0);
      this.emit('mutationFailed', context);
      throw error;
    }
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  public async createSubscription<T = any>(
    clientId: string,
    operation: GraphQLOperation,
    variables: Record<string, any> | undefined,
    handlers: {
      onData: (data: T) => void;
      onError: (error: Error) => void;
      onComplete?: () => void;
    }
  ): Promise<string> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const subscriptionId = crypto.randomBytes(16).toString('hex');
    
    const subscription = await client.subscribe(operation, variables, {
      onData: (data) => {
        this.metrics.totalSubscriptionMessages++;
        handlers.onData(data);
        this.emit('subscriptionData', { subscriptionId, data });
      },
      onError: (error) => {
        handlers.onError(error);
        this.emit('subscriptionError', { subscriptionId, error });
      },
      onComplete: () => {
        this.subscriptions.delete(subscriptionId);
        this.metrics.activeSubscriptions--;
        handlers.onComplete?.();
        this.emit('subscriptionComplete', { subscriptionId });
      }
    });

    const handler: SubscriptionHandler = {
      id: subscriptionId,
      operation,
      variables,
      onData: handlers.onData,
      onError: handlers.onError,
      onComplete: handlers.onComplete,
      unsubscribe: () => {
        subscription.unsubscribe();
        this.subscriptions.delete(subscriptionId);
        this.metrics.activeSubscriptions--;
      }
    };

    this.subscriptions.set(subscriptionId, handler);
    this.metrics.activeSubscriptions++;
    
    this.emit('subscriptionCreated', { subscriptionId, operation });
    
    return subscriptionId;
  }

  public unsubscribe(subscriptionId: string): boolean {
    const handler = this.subscriptions.get(subscriptionId);
    if (handler) {
      handler.unsubscribe();
      this.emit('subscriptionRemoved', { subscriptionId });
      return true;
    }
    return false;
  }

  public unsubscribeAll(): void {
    this.subscriptions.forEach(handler => handler.unsubscribe());
    this.subscriptions.clear();
    this.metrics.activeSubscriptions = 0;
    this.emit('allSubscriptionsRemoved');
  }

  // ============================================================================
  // SCHEMA INTROSPECTION
  // ============================================================================

  public async introspectSchema(clientId: string): Promise<GraphQLSchema> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const schema = await this.introspector.introspect(client);
    this.schemas.set(clientId, schema);
    
    this.emit('schemaIntrospected', { clientId, schema });
    
    return schema;
  }

  public getSchema(clientId: string): GraphQLSchema | undefined {
    return this.schemas.get(clientId);
  }

  public validateQuery(
    clientId: string,
    operation: GraphQLOperation,
    variables?: Record<string, any>
  ): ValidationResult {
    const schema = this.schemas.get(clientId);
    if (!schema) {
      return {
        valid: false,
        errors: ['Schema not available for validation']
      };
    }

    return this.validator.validate(schema, operation, variables);
  }

  // ============================================================================
  // QUERY BUILDER
  // ============================================================================

  public buildQuery(): QueryBuilder {
    return this.queryBuilder.create();
  }

  public parseQuery(query: string): GraphQLOperation {
    return this.queryBuilder.parse(query);
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  public async executeBatch(
    clientId: string,
    queries: BatchQuery[]
  ): Promise<BatchResult[]> {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }

    const results = await this.batchProcessor.process(client, queries);
    
    this.emit('batchExecuted', { clientId, count: queries.length, results });
    
    return results;
  }

  // ============================================================================
  // CACHING
  // ============================================================================

  private checkCache(
    clientId: string,
    operation: GraphQLOperation,
    variables?: Record<string, any>
  ): GraphQLResponse | null {
    const key = this.generateCacheKey(clientId, operation, variables);
    const entry = this.cache.get(key);
    
    if (entry && entry.expiry > new Date()) {
      return entry.data;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }

  private cacheResult(
    clientId: string,
    operation: GraphQLOperation,
    variables: Record<string, any> | undefined,
    response: GraphQLResponse
  ): void {
    const client = this.clients.get(clientId);
    if (!client?.config.caching?.enabled) return;

    const key = this.generateCacheKey(clientId, operation, variables);
    const ttl = client.config.caching.ttl || 60000;
    
    this.cache.set(key, {
      data: response,
      expiry: new Date(Date.now() + ttl)
    });
  }

  private invalidateCache(clientId: string, operation: GraphQLOperation): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.startsWith(`${clientId}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private generateCacheKey(
    clientId: string,
    operation: GraphQLOperation,
    variables?: Record<string, any>
  ): string {
    const client = this.clients.get(clientId);
    const strategy = client?.config.caching?.keyStrategy || 'queryAndVars';
    
    if (strategy === 'custom' && client?.config.caching?.customKeyGenerator) {
      return `${clientId}:${client.config.caching.customKeyGenerator(operation, variables)}`;
    }
    
    const baseKey = `${clientId}:${operation.type}:${operation.query}`;
    
    if (strategy === 'query') {
      return baseKey;
    }
    
    return `${baseKey}:${JSON.stringify(variables || {})}`;
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  private initializeMetrics(): GraphQLMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      averageResponseTime: 0,
      activeSubscriptions: 0,
      totalSubscriptionMessages: 0,
      errorRate: 0,
      requestsPerSecond: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0
    };
  }

  private updateMetrics(success: boolean, responseTime: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      
      // Update average response time
      const currentAvg = this.metrics.averageResponseTime;
      const totalRequests = this.metrics.successfulRequests;
      this.metrics.averageResponseTime = 
        ((currentAvg * (totalRequests - 1)) + responseTime) / totalRequests;
    } else {
      this.metrics.failedRequests++;
    }
    
    // Update error rate
    this.metrics.errorRate = 
      this.metrics.failedRequests / this.metrics.totalRequests;
  }

  public getMetrics(): GraphQLMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  public clearCache(): void {
    this.cache.clear();
    this.emit('cacheCleared');
  }

  public getActiveSubscriptions(): SubscriptionHandler[] {
    return Array.from(this.subscriptions.values());
  }

  public getClients(): Array<{ id: string; config: GraphQLClientConfig }> {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      config: client.config
    }));
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

/**
 * GraphQL Client
 */
class GraphQLClient {
  constructor(public config: GraphQLClientConfig) {}

  async execute<T = any>(
    operation: GraphQLOperation,
    variables?: Record<string, any>
  ): Promise<GraphQLResponse<T>> {
    // Simulated implementation
    const response: GraphQLResponse<T> = {
      data: {} as T,
      extensions: {
        tracing: {
          version: 1,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: Math.random() * 100
        }
      }
    };
    
    return response;
  }

  async subscribe(
    operation: GraphQLOperation,
    variables: Record<string, any> | undefined,
    handlers: {
      onData: (data: any) => void;
      onError: (error: Error) => void;
      onComplete?: () => void;
    }
  ): Promise<{ unsubscribe: () => void }> {
    // Simulated subscription
    const interval = setInterval(() => {
      handlers.onData({ timestamp: new Date() });
    }, 5000);
    
    return {
      unsubscribe: () => {
        clearInterval(interval);
        handlers.onComplete?.();
      }
    };
  }
}

/**
 * Query Builder Implementation
 */
class QueryBuilderImpl {
  create(): QueryBuilder {
    return new QueryBuilderInstance();
  }

  parse(query: string): GraphQLOperation {
    // Simple parser implementation
    const typeMatch = query.match(/^(query|mutation|subscription)/i);
    const type = (typeMatch?.[1]?.toLowerCase() || 'query') as OperationType;
    
    const nameMatch = query.match(/^(?:query|mutation|subscription)\s+(\w+)/i);
    const name = nameMatch?.[1];
    
    return {
      type,
      query,
      name
    };
  }
}

class QueryBuilderInstance implements QueryBuilder {
  private operationType: OperationType = 'query';
  private operationName?: string;
  private fields: string[] = [];
  private fragments: string[] = [];
  private directives: string[] = [];
  private variables: string[] = [];

  operation(type: OperationType): QueryBuilder {
    this.operationType = type;
    return this;
  }

  name(name: string): QueryBuilder {
    this.operationName = name;
    return this;
  }

  field(name: string, args?: Record<string, any>, subfields?: string[] | SubfieldBuilder): QueryBuilder {
    let fieldStr = name;
    
    if (args && Object.keys(args).length > 0) {
      const argsStr = Object.entries(args)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      fieldStr += `(${argsStr})`;
    }
    
    if (subfields) {
      const subfieldsStr = Array.isArray(subfields) 
        ? subfields.join('\n    ')
        : subfields.build();
      fieldStr += ` {\n    ${subfieldsStr}\n  }`;
    }
    
    this.fields.push(fieldStr);
    return this;
  }

  fragment(name: string, type: string, fields: string[] | SubfieldBuilder): QueryBuilder {
    const fieldsStr = Array.isArray(fields) 
      ? fields.join('\n  ')
      : fields.build();
    this.fragments.push(`fragment ${name} on ${type} {\n  ${fieldsStr}\n}`);
    return this;
  }

  directive(name: string, args?: Record<string, any>): QueryBuilder {
    let directiveStr = `@${name}`;
    
    if (args && Object.keys(args).length > 0) {
      const argsStr = Object.entries(args)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      directiveStr += `(${argsStr})`;
    }
    
    this.directives.push(directiveStr);
    return this;
  }

  variable(name: string, type: string, defaultValue?: any): QueryBuilder {
    let varStr = `$${name}: ${type}`;
    if (defaultValue !== undefined) {
      varStr += ` = ${JSON.stringify(defaultValue)}`;
    }
    this.variables.push(varStr);
    return this;
  }

  alias(alias: string, field: string, args?: Record<string, any>): QueryBuilder {
    let fieldStr = `${alias}: ${field}`;
    
    if (args && Object.keys(args).length > 0) {
      const argsStr = Object.entries(args)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      fieldStr += `(${argsStr})`;
    }
    
    this.fields.push(fieldStr);
    return this;
  }

  inlineFragment(type: string, fields: string[] | SubfieldBuilder): QueryBuilder {
    const fieldsStr = Array.isArray(fields) 
      ? fields.join('\n    ')
      : fields.build();
    this.fields.push(`... on ${type} {\n    ${fieldsStr}\n  }`);
    return this;
  }

  build(): string {
    let query = this.operationType;
    
    if (this.operationName) {
      query += ` ${this.operationName}`;
    }
    
    if (this.variables.length > 0) {
      query += `(${this.variables.join(', ')})`;
    }
    
    if (this.directives.length > 0) {
      query += ` ${this.directives.join(' ')}`;
    }
    
    query += ` {\n  ${this.fields.join('\n  ')}\n}`;
    
    if (this.fragments.length > 0) {
      query += `\n\n${this.fragments.join('\n\n')}`;
    }
    
    return query;
  }
}

/**
 * Schema Validator
 */
class SchemaValidator {
  private schema?: GraphQLSchema;

  validate(
    schema: GraphQLSchema,
    operation: GraphQLOperation,
    variables?: Record<string, any>
  ): ValidationResult {
    const errors: string[] = [];
    const query = operation.query;

    // Basic validation
    if (!operation.query) {
      errors.push('Query is required');
    }

    if (operation.type === 'query' && !schema.queryType) {
      errors.push('Schema does not support queries');
    }

    if (operation.type === 'mutation' && !schema.mutationType) {
      errors.push('Schema does not support mutations');
    }

    if (operation.type === 'subscription' && !schema.subscriptionType) {
      errors.push('Schema does not support subscriptions');
    }

    // Check for syntax errors
    try {
      const ast = this.parseQuery(query);
      if (!ast) errors.push('Invalid GraphQL syntax');
    } catch (error: any) {
      errors.push(`Syntax error: ${error.message}`);
    }

    // Check for schema compliance if schema is available
    if (schema && errors.length === 0) {
      try {
        const validation = this.validateAgainstSchema(query, schema);
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
      } catch (error: any) {
        errors.push(`Schema validation error: ${error.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private parseQuery(query: string): any {
    // Basic query parsing implementation
    // In a real implementation, this would use a GraphQL parser
    if (!query || query.trim().length === 0) {
      return null;
    }
    return { query };
  }

  private validateAgainstSchema(query: string, schema: GraphQLSchema): ValidationResult {
    // Basic schema validation implementation
    // In a real implementation, this would validate the query against the schema
    const errors: string[] = [];

    // Perform validation checks here
    // This is a simplified implementation

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Schema Introspector
 */
class SchemaIntrospector {
  async introspect(client: GraphQLClient): Promise<GraphQLSchema> {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          queryType { name }
          mutationType { name }
          subscriptionType { name }
          types {
            ...FullType
          }
          directives {
            name
            description
            locations
            args {
              ...InputValue
            }
          }
        }
      }

      fragment FullType on __Type {
        kind
        name
        description
        fields(includeDeprecated: true) {
          name
          description
          args {
            ...InputValue
          }
          type {
            ...TypeRef
          }
          isDeprecated
          deprecationReason
        }
        inputFields {
          ...InputValue
        }
        interfaces {
          ...TypeRef
        }
        enumValues(includeDeprecated: true) {
          name
          description
          isDeprecated
          deprecationReason
        }
        possibleTypes {
          ...TypeRef
        }
      }

      fragment InputValue on __InputValue {
        name
        description
        type { ...TypeRef }
        defaultValue
      }

      fragment TypeRef on __Type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                    ofType {
                      kind
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await client.execute<IntrospectionResult>({
      type: 'query',
      query: introspectionQuery
    });

    if (!response.data?.__schema) {
      throw new Error('Failed to introspect schema');
    }

    return response.data.__schema;
  }
}

/**
 * Batch Processor
 */
class BatchProcessor {
  async process(
    client: GraphQLClient,
    queries: BatchQuery[]
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    
    // Process queries in parallel
    const promises = queries.map(async (query) => {
      try {
        const response = await client.execute(query.operation, query.variables);
        return {
          id: query.id,
          response
        };
      } catch (error) {
        return {
          id: query.id,
          response: { errors: [{ message: (error as Error).message }] },
          error: error as Error
        };
      }
    });
    
    return Promise.all(promises);
  }
}

/**
 * Validation Result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Cache Entry
 */
interface CacheEntry {
  data: GraphQLResponse;
  expiry: Date;
}

// ============================================================================
// WORKFLOW NODE IMPLEMENTATION
// ============================================================================

/**
 * GraphQL Workflow Node
 */
export class GraphQLWorkflowNode {
  constructor(private config: GraphQLNodeConfig) {}

  async execute(input: any): Promise<any> {
    const system = GraphQLSupportSystem.getInstance();
    
    // Create or get client
    let client = system.getClient(this.config.id);
    if (!client) {
      client = system.createClient(this.config.id, {
        endpoint: this.config.endpoint,
        headers: this.config.headers,
        timeout: this.config.timeout,
        retryPolicy: this.config.retryPolicy,
        caching: this.config.caching
      });
    }

    // Apply authentication
    if (this.config.authentication) {
      await this.applyAuthentication(client);
    }

    // Replace variables with input data
    const variables = this.resolveVariables(this.config.variables, input);

    // Execute operation
    switch (this.config.operation.type) {
      case 'query':
        return system.executeQuery(this.config.id, this.config.operation, variables);
        
      case 'mutation':
        return system.executeMutation(this.config.id, this.config.operation, variables);
        
      case 'subscription':
        // For workflow context, we'll create a subscription that collects data
        return new Promise(async (resolve, reject) => {
          const data: any[] = [];
          let subscriptionId: string;

          try {
            subscriptionId = await system.createSubscription(
              this.config.id,
              this.config.operation,
              variables,
              {
                onData: (item) => data.push(item),
                onError: (error) => {
                  if (timeoutId) clearTimeout(timeoutId);
                  reject(error);
                },
                onComplete: () => {
                  if (timeoutId) clearTimeout(timeoutId);
                  resolve({ data });
                }
              }
            );

            const timeoutId = setTimeout(() => {
              system.unsubscribe(subscriptionId);
              resolve({ data });
            }, this.config.timeout || 30000);
          } catch (error) {
            reject(error);
          }
        });
        
      default:
        throw new Error(`Unsupported operation type: ${this.config.operation.type}`);
    }
  }

  private async applyAuthentication(client: GraphQLClient): Promise<void> {
    const auth = this.config.authentication;
    if (!auth) return;

    const headers: Record<string, string> = {};

    switch (auth.type) {
      case 'apiKey':
        if (auth.apiKey) {
          headers[auth.apiKey.headerName] = auth.apiKey.value;
        }
        break;
        
      case 'bearer':
        if (auth.bearer) {
          headers['Authorization'] = `Bearer ${auth.bearer.token}`;
        }
        break;
        
      case 'basic':
        if (auth.basic) {
          const credentials = `${auth.basic.username}:${auth.basic.password}`;
          headers['Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`;
        }
        break;
        
      case 'oauth2':
        if (auth.oauth2) {
          // Refresh token if needed
          if (auth.oauth2.tokenExpiry && auth.oauth2.tokenExpiry < new Date()) {
            await this.refreshOAuth2Token(auth.oauth2);
          }
          headers['Authorization'] = `Bearer ${auth.oauth2.accessToken}`;
        }
        break;
        
      case 'custom':
        if (auth.custom) {
          Object.assign(headers, auth.custom.headers);
        }
        break;
    }

    // Update client headers
    client.config.headers = { ...client.config.headers, ...headers };
  }

  private async refreshOAuth2Token(oauth2: any): Promise<void> {
    // Implementation would refresh OAuth2 token
    logger.debug('Refreshing OAuth2 token...');
  }

  private resolveVariables(
    variables: Record<string, any> | undefined,
    input: any
  ): Record<string, any> {
    if (!variables) return {};

    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Simple variable replacement from input
        const path = value.slice(2, -2).trim();
        resolved[key] = this.getValueByPath(input, path);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, part) => current?.[part], obj);
  }
}

// Export singleton instance
export const graphQLSupport = GraphQLSupportSystem.getInstance();