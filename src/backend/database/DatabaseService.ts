/**
 * Database Service with PostgreSQL/Supabase integration
 * Handles all database operations with connection pooling and transactions
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-service-key';

export interface DatabaseConfig {
  maxConnections?: number;
  connectionTimeout?: number;
  statementTimeout?: number;
  idleTimeout?: number;
}

export interface QueryOptions {
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface Transaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}

export class DatabaseService {
  private supabase: SupabaseClient;
  private config: DatabaseConfig;
  private queryCache: Map<string, { data: any; expiresAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(config?: DatabaseConfig) {
    this.config = {
      maxConnections: 20,
      connectionTimeout: 30000,
      statementTimeout: 60000,
      idleTimeout: 10000,
      ...config
    };

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      }
    });

    // Cleanup cache every minute
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 60000);

    console.log('✅ Database service initialized');
  }

  /**
   * Workflows
   */
  async createWorkflow(workflow: {
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
    settings?: any;
    userId: string;
    organizationId?: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('workflows')
      .insert({
        name: workflow.name,
        description: workflow.description,
        nodes: workflow.nodes,
        edges: workflow.edges,
        settings: workflow.settings || {},
        user_id: workflow.userId,
        organization_id: workflow.organizationId,
        status: 'draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWorkflow(id: string, userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .or(`user_id.eq.${userId},shared_with.cs.{${userId}}`)
      .single();

    if (error) throw error;
    return data;
  }

  async listWorkflows(userId: string, filters?: {
    status?: string;
    organizationId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; count: number }> {
    let query = this.supabase
      .from('workflows')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${userId},shared_with.cs.{${userId}}`);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query
      .order('updated_at', { ascending: false })
      .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  async updateWorkflow(id: string, userId: string, updates: {
    name?: string;
    description?: string;
    nodes?: any[];
    edges?: any[];
    settings?: any;
    status?: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('workflows')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteWorkflow(id: string, userId: string, soft: boolean = true): Promise<void> {
    if (soft) {
      // Soft delete
      const { error } = await this.supabase
        .from('workflows')
        .update({
          deleted_at: new Date().toISOString(),
          status: 'deleted'
        })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } else {
      // Hard delete
      const { error } = await this.supabase
        .from('workflows')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    }
  }

  /**
   * Executions
   */
  async createExecution(execution: {
    workflowId: string;
    userId: string;
    status: string;
    mode?: string;
    input?: any;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('executions')
      .insert({
        workflow_id: execution.workflowId,
        user_id: execution.userId,
        status: execution.status,
        mode: execution.mode || 'manual',
        input: execution.input || {},
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateExecution(id: string, updates: {
    status?: string;
    output?: any;
    error?: any;
    finishedAt?: string;
    nodeExecutions?: any[];
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('executions')
      .update({
        status: updates.status,
        output: updates.output,
        error: updates.error,
        finished_at: updates.finishedAt,
        node_executions: updates.nodeExecutions,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async listExecutions(workflowId: string, userId: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[]; count: number }> {
    let query = this.supabase
      .from('executions')
      .select('*', { count: 'exact' })
      .eq('workflow_id', workflowId)
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count: count || 0 };
  }

  /**
   * Credentials
   */
  async createCredential(credential: {
    name: string;
    type: string;
    encryptedData: any;
    userId: string;
    organizationId?: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('credentials')
      .insert({
        name: credential.name,
        type: credential.type,
        encrypted_data: credential.encryptedData,
        user_id: credential.userId,
        organization_id: credential.organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCredential(id: string, userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('credentials')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async listCredentials(userId: string, type?: string): Promise<any[]> {
    let query = this.supabase
      .from('credentials')
      .select('id, name, type, created_at, updated_at')
      .eq('user_id', userId);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async updateCredential(id: string, userId: string, updates: {
    name?: string;
    encryptedData?: any;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('credentials')
      .update({
        name: updates.name,
        encrypted_data: updates.encryptedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCredential(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('credentials')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * User Profiles
   */
  async getUserProfile(userId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateUserProfile(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    role?: string;
    status?: string;
    metadata?: any;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        first_name: updates.firstName,
        last_name: updates.lastName,
        avatar_url: updates.avatarUrl,
        role: updates.role,
        status: updates.status,
        metadata: updates.metadata,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Webhooks
   */
  async createWebhook(webhook: {
    workflowId: string;
    path: string;
    method: string;
    userId: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .insert({
        workflow_id: webhook.workflowId,
        path: webhook.path,
        method: webhook.method,
        user_id: webhook.userId,
        enabled: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWebhookByPath(path: string, method: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('path', path)
      .eq('method', method)
      .eq('enabled', true)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Global Variables
   */
  async setGlobalVariable(key: string, value: any, userId: string, scope: 'user' | 'organization' = 'user'): Promise<void> {
    const { error } = await this.supabase
      .from('global_variables')
      .upsert({
        key,
        value,
        user_id: scope === 'user' ? userId : null,
        scope,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }

  async getGlobalVariable(key: string, userId: string, scope: 'user' | 'organization' = 'user'): Promise<any> {
    const { data, error } = await this.supabase
      .from('global_variables')
      .select('value')
      .eq('key', key)
      .eq('scope', scope)
      .eq('user_id', scope === 'user' ? userId : null)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data?.value;
  }

  /**
   * Audit Logs
   */
  async createAuditLog(log: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        user_id: log.userId,
        action: log.action,
        resource_type: log.resourceType,
        resource_id: log.resourceId,
        metadata: log.metadata || {},
        ip_address: log.ipAddress,
        user_agent: log.userAgent,
        created_at: new Date().toISOString()
      });

    if (error) console.error('Failed to create audit log:', error);
  }

  /**
   * Query caching
   */
  private getCachedQuery(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    this.queryCache.delete(key);
    return null;
  }

  private setCachedQuery(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      data,
      expiresAt: Date.now() + ttl
    });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.queryCache.entries()) {
      if (value.expiresAt <= now) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency: number }> {
    const start = Date.now();
    try {
      const { error } = await this.supabase
        .from('workflows')
        .select('id')
        .limit(1);

      const latency = Date.now() - start;

      return {
        status: error ? 'unhealthy' : 'healthy',
        latency
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start
      };
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.queryCache.clear();
  }

  /**
   * Direct Supabase client access
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
