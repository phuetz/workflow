/**
 * Credentials Management Service
 * Handles secure storage and retrieval of service credentials
 */

import { BaseService } from './BaseService';
import { useWorkflowStore } from '../store/workflowStore';
import { logger } from './SimpleLogger';

export interface Credentials {
  id: string;
  name: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
  isValid: boolean;
}

export interface ServiceCredentials {
  google?: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  };
  aws?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  openai?: {
    apiKey: string;
  };
  slack?: {
    token: string;
    webhookUrl?: string;
  };
  github?: {
    token: string;
  };
  custom?: Record<string, unknown>;
}

export class CredentialsService extends BaseService {
  private static instance: CredentialsService;
  private credentials: Map<string, Credentials> = new Map();
  
  public static getInstance(): CredentialsService {
    if (!CredentialsService.instance) {
      CredentialsService.instance = new CredentialsService();
    }
    return CredentialsService.instance;
  }

  constructor() {
    super('CredentialsService');
    this.initializeService();
  }

  protected async initializeService(): Promise<void> {
    // Load credentials from store
    this.loadCredentialsFromStore();
  }

  private loadCredentialsFromStore(): void {
    try {
      const store = useWorkflowStore.getState();
      const storedCredentials = store.credentials;

      // Convert store format to service format
      if (storedCredentials) {
        Object.entries(storedCredentials).forEach(([service, creds]) => {
          const credential: Credentials = {
            id: `cred_${service}_${Date.now()}`,
            name: `${service} Credentials`,
            type: service,
            data: creds as Record<string, unknown>,
            createdAt: new Date(),
            updatedAt: new Date(),
            isValid: this.validateCredentials(service, creds)
          };
          this.credentials.set(credential.id, credential);
        });
      }
    } catch (error) {
      logger.error('Failed to load credentials from store', error);
    }
  }

  async listCredentials(): Promise<Credentials[]> {
    return Array.from(this.credentials.values()).map(cred => ({
      ...cred,
      // Mask sensitive data for listing
      data: this.maskSensitiveData(cred.data)
    }));
  }

  async getCredential(id: string): Promise<Credentials | null> {
    const credential = this.credentials.get(id);
    if (credential) {
      // Update last used timestamp
      credential.lastUsed = new Date();
      this.credentials.set(id, credential);
    }
    return credential || null;
  }

  async getCredentialsByType(type: string): Promise<Credentials[]> {
    return Array.from(this.credentials.values())
      .filter(cred => cred.type === type);
  }

  async createCredential(credential: Omit<Credentials, 'id' | 'createdAt' | 'updatedAt'>): Promise<Credentials> {
    const newCredential: Credentials = {
      ...credential,
      id: `cred_${credential.type}_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isValid: this.validateCredentials(credential.type, credential.data)
    };

    this.credentials.set(newCredential.id, newCredential);
    
    // Update store
    this.updateStore(credential.type, credential.data);
    
    logger.info(`Created credential: ${newCredential.id}`);
    return newCredential;
  }

  async updateCredential(id: string, updates: Partial<Credentials>): Promise<Credentials | null> {
    const credential = this.credentials.get(id);
    if (!credential) {
      return null;
    }

    const updatedCredential: Credentials = {
      ...credential,
      ...updates,
      updatedAt: new Date(),
      isValid: updates.data ? this.validateCredentials(credential.type, updates.data) : credential.isValid
    };

    this.credentials.set(id, updatedCredential);

    // Update store if data changed
    if (updates.data) {
      this.updateStore(credential.type, updates.data);
    }

    logger.info(`Updated credential: ${id}`);
    return updatedCredential;
  }

  async deleteCredential(id: string): Promise<boolean> {
    const credential = this.credentials.get(id);
    if (!credential) {
      return false;
    }

    this.credentials.delete(id);

    // Clear from store
    this.updateStore(credential.type, {});

    logger.info(`Deleted credential: ${id}`);
    return true;
  }

  async validateCredential(id: string): Promise<boolean> {
    const credential = this.credentials.get(id);
    if (!credential) {
      return false;
    }

    const isValid = this.validateCredentials(credential.type, credential.data);
    credential.isValid = isValid;
    credential.updatedAt = new Date();

    this.credentials.set(id, credential);
    return isValid;
  }

  private validateCredentials(type: string, data: Record<string, unknown>): boolean {
    switch (type) {
      case 'google':
        return !!(data.clientId && data.clientSecret);
      case 'aws':
        return !!(data.accessKeyId && data.secretAccessKey && data.region);
      case 'openai':
        return !!(data.apiKey);
      case 'slack':
        return !!(data.token || data.webhookUrl);
      case 'github':
        return !!(data.token);
      default:
        // For custom credentials, just check if there's any data
        return Object.keys(data).length > 0;
    }
  }

  private maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    const masked: Record<string, unknown> = {};
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        // Show first 4 and last 4 characters for keys/tokens
        if (value.length > 8) {
          masked[key] = `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
        } else {
          masked[key] = '****';
        }
      } else {
        masked[key] = value;
      }
    });
    
    return masked;
  }

  private updateStore(service: string, data: Record<string, unknown>): void {
    try {
      const store = useWorkflowStore.getState();
      store.updateCredentials(service, data);
    } catch (error) {
      logger.error('Failed to update credentials in store', error);
    }
  }

  // Utility method for backup service
  async exportCredentials(includeSecrets = false): Promise<Record<string, unknown>> {
    const exported: Record<string, unknown> = {};
    
    this.credentials.forEach((credential, id) => {
      exported[id] = {
        ...credential,
        data: includeSecrets ? credential.data : this.maskSensitiveData(credential.data)
      };
    });
    
    return exported;
  }

  async importCredentials(data: Record<string, unknown>): Promise<void> {
    Object.entries(data).forEach(([id, credential]) => {
      this.credentials.set(id, credential as Credentials);
    });
    
    logger.info(`Imported ${Object.keys(data).length} credentials`);
  }
}

// Export singleton instance
export const credentialsService = CredentialsService.getInstance();