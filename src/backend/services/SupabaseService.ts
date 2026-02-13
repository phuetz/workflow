/**
 * Supabase Service
 * Handles Supabase operations: Database, Storage, Auth, and RPC functions
 */

import { logger } from '../../services/SimpleLogger';
import axios, { AxiosInstance } from 'axios';

interface SupabaseCredentials {
  projectUrl: string;
  apiKey: string; // anon or service_role key
}

interface SupabaseFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in';
  value: any;
}

export class SupabaseService {
  private axiosInstance: AxiosInstance;
  private credentials: SupabaseCredentials;
  private baseURL: string;

  constructor(credentials: SupabaseCredentials) {
    this.credentials = credentials;
    this.baseURL = credentials.projectUrl;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'apikey': credentials.apiKey,
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
  }

  /**
   * DATABASE OPERATIONS
   */

  /**
   * Select records from table
   */
  async select(
    table: string,
    columns = '*',
    filters?: SupabaseFilter[],
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      ascending?: boolean;
    }
  ): Promise<any[]> {
    try {
      logger.info(`Selecting from Supabase table: ${table}`);

      let url = `/rest/v1/${table}?select=${columns}`;

      // Apply filters
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          url += `&${filter.column}=${filter.operator}.${filter.value}`;
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        const direction = options.ascending === false ? 'desc' : 'asc';
        url += `&order=${options.orderBy}.${direction}`;
      }

      // Apply pagination
      if (options?.limit) {
        url += `&limit=${options.limit}`;
      }
      if (options?.offset) {
        url += `&offset=${options.offset}`;
      }

      const response = await this.axiosInstance.get(url);

      logger.info(`Found ${response.data.length} records`);
      return response.data;
    } catch (error) {
      logger.error(`Failed to select from ${table}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Insert record(s)
   */
  async insert(table: string, data: any | any[]): Promise<any> {
    try {
      logger.info(`Inserting into Supabase table: ${table}`);

      const response = await this.axiosInstance.post(
        `/rest/v1/${table}`,
        data
      );

      logger.info('Insert successful');
      return response.data;
    } catch (error) {
      logger.error(`Failed to insert into ${table}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Update records
   */
  async update(
    table: string,
    data: any,
    filters: SupabaseFilter[]
  ): Promise<any> {
    try {
      logger.info(`Updating Supabase table: ${table}`);

      let url = `/rest/v1/${table}?`;

      // Build filter query
      filters.forEach((filter, index) => {
        if (index > 0) url += '&';
        url += `${filter.column}=${filter.operator}.${filter.value}`;
      });

      const response = await this.axiosInstance.patch(url, data);

      logger.info('Update successful');
      return response.data;
    } catch (error) {
      logger.error(`Failed to update ${table}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete records
   */
  async delete(table: string, filters: SupabaseFilter[]): Promise<any> {
    try {
      logger.info(`Deleting from Supabase table: ${table}`);

      let url = `/rest/v1/${table}?`;

      // Build filter query
      filters.forEach((filter, index) => {
        if (index > 0) url += '&';
        url += `${filter.column}=${filter.operator}.${filter.value}`;
      });

      const response = await this.axiosInstance.delete(url);

      logger.info('Delete successful');
      return response.data;
    } catch (error) {
      logger.error(`Failed to delete from ${table}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Upsert (insert or update)
   */
  async upsert(
    table: string,
    data: any | any[],
    options?: {
      onConflict?: string;
      ignoreDuplicates?: boolean;
    }
  ): Promise<any> {
    try {
      logger.info(`Upserting into Supabase table: ${table}`);

      const headers: any = {
        'Prefer': 'resolution=merge-duplicates',
      };

      if (options?.ignoreDuplicates) {
        headers['Prefer'] = 'resolution=ignore-duplicates';
      }

      let url = `/rest/v1/${table}`;

      if (options?.onConflict) {
        url += `?on_conflict=${options.onConflict}`;
      }

      const response = await this.axiosInstance.post(url, data, { headers });

      logger.info('Upsert successful');
      return response.data;
    } catch (error) {
      logger.error(`Failed to upsert into ${table}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * STORAGE OPERATIONS
   */

  /**
   * Upload file to storage bucket
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer | string,
    options?: {
      contentType?: string;
      cacheControl?: string;
      upsert?: boolean;
    }
  ): Promise<any> {
    try {
      logger.info(`Uploading file to Supabase storage: ${bucket}/${path}`);

      const fileData = typeof file === 'string'
        ? Buffer.from(file.replace(/^data:.*?;base64,/, ''), 'base64')
        : file;

      const headers: any = {
        'Content-Type': options?.contentType || 'application/octet-stream',
      };

      if (options?.cacheControl) {
        headers['Cache-Control'] = options.cacheControl;
      }

      let url = `/storage/v1/object/${bucket}/${path}`;

      if (options?.upsert) {
        url += '?upsert=true';
      }

      const response = await this.axiosInstance.post(url, fileData, { headers });

      logger.info('File uploaded successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to upload file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Download file from storage
   */
  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    try {
      logger.info(`Downloading file from Supabase storage: ${bucket}/${path}`);

      const response = await this.axiosInstance.get(
        `/storage/v1/object/${bucket}/${path}`,
        {
          responseType: 'arraybuffer',
        }
      );

      logger.info('File downloaded successfully');
      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download file:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(bucket: string, paths: string[]): Promise<any> {
    try {
      logger.info(`Deleting files from Supabase storage: ${bucket}`);

      const response = await this.axiosInstance.delete(
        `/storage/v1/object/${bucket}`,
        {
          data: { prefixes: paths },
        }
      );

      logger.info('Files deleted successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to delete files:', error);
      throw this.handleError(error);
    }
  }

  /**
   * List files in bucket
   */
  async listFiles(
    bucket: string,
    path?: string,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: { column: string; order: 'asc' | 'desc' };
    }
  ): Promise<any> {
    try {
      logger.info(`Listing files in Supabase bucket: ${bucket}`);

      const payload: any = {
        prefix: path || '',
        limit: options?.limit || 100,
        offset: options?.offset || 0,
      };

      if (options?.sortBy) {
        payload.sortBy = options.sortBy;
      }

      const response = await this.axiosInstance.post(
        `/storage/v1/object/list/${bucket}`,
        payload
      );

      logger.info(`Found ${response.data.length} files`);
      return response.data;
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get public URL for file
   */
  getPublicUrl(bucket: string, path: string): string {
    return `${this.baseURL}/storage/v1/object/public/${bucket}/${path}`;
  }

  /**
   * Create signed URL for file (temporary access)
   */
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number
  ): Promise<string> {
    try {
      logger.info(`Creating signed URL for: ${bucket}/${path}`);

      const response = await this.axiosInstance.post(
        `/storage/v1/object/sign/${bucket}/${path}`,
        {
          expiresIn,
        }
      );

      const signedUrl = `${this.baseURL}${response.data.signedURL}`;
      logger.info('Signed URL created successfully');
      return signedUrl;
    } catch (error) {
      logger.error('Failed to create signed URL:', error);
      throw this.handleError(error);
    }
  }

  /**
   * AUTH OPERATIONS
   */

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, metadata?: any): Promise<any> {
    try {
      logger.info(`Creating new Supabase user: ${email}`);

      const response = await this.axiosInstance.post(
        '/auth/v1/signup',
        {
          email,
          password,
          data: metadata,
        }
      );

      logger.info('User created successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to sign up user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<any> {
    try {
      logger.info(`Signing in user: ${email}`);

      const response = await this.axiosInstance.post(
        '/auth/v1/token?grant_type=password',
        {
          email,
          password,
        }
      );

      logger.info('User signed in successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to sign in user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sign out user
   */
  async signOut(accessToken: string): Promise<void> {
    try {
      logger.info('Signing out user');

      await this.axiosInstance.post(
        '/auth/v1/logout',
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      logger.info('User signed out successfully');
    } catch (error) {
      logger.error('Failed to sign out user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user by access token
   */
  async getUser(accessToken: string): Promise<any> {
    try {
      logger.info('Fetching user info');

      const response = await this.axiosInstance.get(
        '/auth/v1/user',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update user
   */
  async updateUser(accessToken: string, updates: any): Promise<any> {
    try {
      logger.info('Updating user');

      const response = await this.axiosInstance.put(
        '/auth/v1/user',
        updates,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      logger.info('User updated successfully');
      return response.data;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw this.handleError(error);
    }
  }

  /**
   * RPC OPERATIONS
   */

  /**
   * Call Supabase Edge Function or Database Function
   */
  async rpc(functionName: string, params: any = {}): Promise<any> {
    try {
      logger.info(`Calling Supabase RPC function: ${functionName}`);

      const response = await this.axiosInstance.post(
        `/rest/v1/rpc/${functionName}`,
        params
      );

      logger.info('RPC function executed successfully');
      return response.data;
    } catch (error) {
      logger.error(`Failed to call RPC function ${functionName}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Call Supabase Edge Function (separate endpoint)
   */
  async callEdgeFunction(functionName: string, payload: any = {}): Promise<any> {
    try {
      logger.info(`Calling Supabase Edge Function: ${functionName}`);

      const response = await this.axiosInstance.post(
        `/functions/v1/${functionName}`,
        payload
      );

      logger.info('Edge function executed successfully');
      return response.data;
    } catch (error) {
      logger.error(`Failed to call edge function ${functionName}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * UTILITY METHODS
   */

  /**
   * Build filter query helper
   */
  buildFilterQuery(filters: SupabaseFilter[]): string {
    return filters
      .map(f => `${f.column}=${f.operator}.${f.value}`)
      .join('&');
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const sbError = error.response?.data;
      if (sbError?.message) {
        return new Error(`Supabase API Error: ${sbError.message}`);
      }
      if (sbError?.error_description) {
        return new Error(`Supabase API Error: ${sbError.error_description}`);
      }
      return new Error(`Supabase API Error: ${error.message}`);
    }
    return error instanceof Error ? error : new Error('Unknown Supabase error');
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    return {
      service: 'Supabase',
      projectUrl: this.credentials.projectUrl,
      authenticated: this.credentials.apiKey ? true : false,
    };
  }
}

// Export factory function
export function createSupabaseService(credentials: SupabaseCredentials): SupabaseService {
  return new SupabaseService(credentials);
}
