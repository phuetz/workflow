/**
 * PLAN C PHASE 3 - Refactoring: Workflow Metadata Store
 * Extracted from monolithic workflowStore.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../../services/LoggingService';
import { eventNotificationService } from '../../services/EventNotificationService';

export interface WorkflowMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author: string;
  isPublic: boolean;
  isTemplate: boolean;
  settings: Record<string, any>;
}

export interface WorkflowVariable {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  isSecret?: boolean;
  scope: 'global' | 'workflow' | 'local';
}

export interface WorkflowEnvironment {
  name: string;
  variables: Record<string, any>;
  apiUrl?: string;
  webhookUrl?: string;
  isActive: boolean;
}

export interface WorkflowMetadataState {
  // Current workflow
  currentWorkflowId: string | null;
  workflowName: string;
  workflowDescription: string;
  workflowVersion: string;
  workflowTags: string[];
  
  // Metadata
  isSaved: boolean;
  lastSaved: number | null;
  isDirty: boolean;
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // milliseconds
  
  // Variables & Environment
  globalVariables: Record<string, WorkflowVariable>;
  workflowVariables: Record<string, WorkflowVariable>;
  environments: Record<string, WorkflowEnvironment>;
  currentEnvironment: string;
  
  // Credentials
  credentials: Record<string, Record<string, any>>;
  
  // Webhooks
  webhookEndpoints: Record<string, {
    id: string;
    url: string;
    method: string;
    headers?: Record<string, string>;
    createdAt: string;
  }>;
  
  // Actions
  setCurrentWorkflowId: (id: string | null) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;
  setWorkflowVersion: (version: string) => void;
  addWorkflowTag: (tag: string) => void;
  removeWorkflowTag: (tag: string) => void;
  
  markAsSaved: () => void;
  markAsDirty: () => void;
  setAutoSave: (enabled: boolean, interval?: number) => void;
  
  // Variables
  setGlobalVariable: (key: string, variable: WorkflowVariable) => void;
  deleteGlobalVariable: (key: string) => void;
  setWorkflowVariable: (key: string, variable: WorkflowVariable) => void;
  deleteWorkflowVariable: (key: string) => void;
  getVariable: (key: string) => WorkflowVariable | undefined;
  
  // Environments
  addEnvironment: (name: string, env: WorkflowEnvironment) => void;
  updateEnvironment: (name: string, updates: Partial<WorkflowEnvironment>) => void;
  deleteEnvironment: (name: string) => void;
  setCurrentEnvironment: (name: string) => void;
  getCurrentEnvironmentVariables: () => Record<string, any>;
  
  // Credentials
  updateCredentials: (service: string, credentials: Record<string, any>) => void;
  deleteCredentials: (service: string) => void;
  getCredentials: (service: string) => Record<string, any> | undefined;
  
  // Webhooks
  generateWebhookUrl: (workflowId: string) => string;
  registerWebhook: (webhook: any) => void;
  deleteWebhook: (id: string) => void;
  
  // Export/Import
  exportMetadata: () => WorkflowMetadata;
  importMetadata: (metadata: Partial<WorkflowMetadata>) => void;
  
  // Helpers
  generateWorkflowId: () => string;
  validateWorkflowName: (name: string) => boolean;
}

export const useWorkflowMetadataStore = create<WorkflowMetadataState>()(
  persist(
    (set, get) => ({
      currentWorkflowId: null,
      workflowName: 'Untitled Workflow',
      workflowDescription: '',
      workflowVersion: '1.0.0',
      workflowTags: [],
      
      isSaved: true,
      lastSaved: null,
      isDirty: false,
      autoSaveEnabled: true,
      autoSaveInterval: 30000, // 30 seconds
      
      globalVariables: {},
      workflowVariables: {},
      environments: {
        development: {
          name: 'development',
          variables: {},
          isActive: true
        },
        staging: {
          name: 'staging',
          variables: {},
          isActive: false
        },
        production: {
          name: 'production',
          variables: {},
          isActive: false
        }
      },
      currentEnvironment: 'development',
      
      credentials: {},
      webhookEndpoints: {},
      
      setCurrentWorkflowId: (id) => {
        set({ currentWorkflowId: id });
        
        if (id) {
          eventNotificationService.notify('workflow.opened', { id });
          logger.info(`Opened workflow: ${id}`);
        }
      },
      
      setWorkflowName: (name) => {
        set({ 
          workflowName: name,
          isDirty: true 
        });
      },
      
      setWorkflowDescription: (description) => {
        set({ 
          workflowDescription: description,
          isDirty: true 
        });
      },
      
      setWorkflowVersion: (version) => {
        set({ 
          workflowVersion: version,
          isDirty: true 
        });
      },
      
      addWorkflowTag: (tag) => {
        set((state) => {
          if (state.workflowTags.includes(tag)) {
            return state;
          }
          
          return {
            workflowTags: [...state.workflowTags, tag],
            isDirty: true
          };
        });
      },
      
      removeWorkflowTag: (tag) => {
        set((state) => ({
          workflowTags: state.workflowTags.filter(t => t !== tag),
          isDirty: true
        }));
      },
      
      markAsSaved: () => {
        set({
          isSaved: true,
          isDirty: false,
          lastSaved: Date.now()
        });
        
        logger.info('Workflow marked as saved');
      },
      
      markAsDirty: () => {
        set({ isDirty: true });
      },
      
      setAutoSave: (enabled, interval) => {
        set({
          autoSaveEnabled: enabled,
          autoSaveInterval: interval || 30000
        });
        
        logger.info(`Auto-save ${enabled ? 'enabled' : 'disabled'}`);
      },
      
      setGlobalVariable: (key, variable) => {
        set((state) => ({
          globalVariables: {
            ...state.globalVariables,
            [key]: { ...variable, scope: 'global' }
          },
          isDirty: true
        }));
        
        eventNotificationService.notify('variable.set', { key, scope: 'global' });
        logger.debug(`Set global variable: ${key}`);
      },
      
      deleteGlobalVariable: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.globalVariables;
          return {
            globalVariables: rest,
            isDirty: true
          };
        });
        
        eventNotificationService.notify('variable.deleted', { key, scope: 'global' });
        logger.debug(`Deleted global variable: ${key}`);
      },
      
      setWorkflowVariable: (key, variable) => {
        set((state) => ({
          workflowVariables: {
            ...state.workflowVariables,
            [key]: { ...variable, scope: 'workflow' }
          },
          isDirty: true
        }));
        
        eventNotificationService.notify('variable.set', { key, scope: 'workflow' });
        logger.debug(`Set workflow variable: ${key}`);
      },
      
      deleteWorkflowVariable: (key) => {
        set((state) => {
          const { [key]: _, ...rest } = state.workflowVariables;
          return {
            workflowVariables: rest,
            isDirty: true
          };
        });
        
        eventNotificationService.notify('variable.deleted', { key, scope: 'workflow' });
        logger.debug(`Deleted workflow variable: ${key}`);
      },
      
      getVariable: (key) => {
        const state = get();
        
        // Check workflow variables first, then global
        return state.workflowVariables[key] || state.globalVariables[key];
      },
      
      addEnvironment: (name, env) => {
        set((state) => ({
          environments: {
            ...state.environments,
            [name]: env
          },
          isDirty: true
        }));
        
        logger.info(`Added environment: ${name}`);
      },
      
      updateEnvironment: (name, updates) => {
        set((state) => {
          const existing = state.environments[name];
          if (!existing) {
            logger.warn(`Environment ${name} not found`);
            return state;
          }
          
          return {
            environments: {
              ...state.environments,
              [name]: { ...existing, ...updates }
            },
            isDirty: true
          };
        });
      },
      
      deleteEnvironment: (name) => {
        set((state) => {
          const { [name]: _, ...rest } = state.environments;
          return {
            environments: rest,
            isDirty: true
          };
        });
        
        logger.info(`Deleted environment: ${name}`);
      },
      
      setCurrentEnvironment: (name) => {
        set({ currentEnvironment: name });
        
        eventNotificationService.notify('environment.changed', { name });
        logger.info(`Switched to environment: ${name}`);
      },
      
      getCurrentEnvironmentVariables: () => {
        const state = get();
        const env = state.environments[state.currentEnvironment];
        
        return env?.variables || {};
      },
      
      updateCredentials: (service, credentials) => {
        set((state) => ({
          credentials: {
            ...state.credentials,
            [service]: {
              ...credentials,
              updatedAt: new Date().toISOString()
            }
          },
          isDirty: true
        }));
        
        logger.info(`Updated credentials for service: ${service}`);
      },
      
      deleteCredentials: (service) => {
        set((state) => {
          const { [service]: _, ...rest } = state.credentials;
          return {
            credentials: rest,
            isDirty: true
          };
        });
        
        logger.info(`Deleted credentials for service: ${service}`);
      },
      
      getCredentials: (service) => {
        return get().credentials[service];
      },
      
      generateWebhookUrl: (workflowId) => {
        const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/api/webhooks/${workflowId}/${webhookId}`;
        
        return url;
      },
      
      registerWebhook: (webhook) => {
        set((state) => ({
          webhookEndpoints: {
            ...state.webhookEndpoints,
            [webhook.id]: {
              ...webhook,
              createdAt: new Date().toISOString()
            }
          },
          isDirty: true
        }));
        
        logger.info(`Registered webhook: ${webhook.id}`);
      },
      
      deleteWebhook: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.webhookEndpoints;
          return {
            webhookEndpoints: rest,
            isDirty: true
          };
        });
        
        logger.info(`Deleted webhook: ${id}`);
      },
      
      exportMetadata: () => {
        const state = get();
        
        return {
          id: state.currentWorkflowId || state.generateWorkflowId(),
          name: state.workflowName,
          description: state.workflowDescription,
          version: state.workflowVersion,
          category: '',
          tags: state.workflowTags,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: '',
          isPublic: false,
          isTemplate: false,
          settings: {
            autoSave: state.autoSaveEnabled,
            autoSaveInterval: state.autoSaveInterval
          }
        };
      },
      
      importMetadata: (metadata) => {
        set({
          currentWorkflowId: metadata.id || get().currentWorkflowId,
          workflowName: metadata.name || get().workflowName,
          workflowDescription: metadata.description || get().workflowDescription,
          workflowVersion: metadata.version || get().workflowVersion,
          workflowTags: metadata.tags || get().workflowTags,
          isDirty: false
        });
        
        logger.info('Imported workflow metadata');
      },
      
      generateWorkflowId: () => {
        return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      },
      
      validateWorkflowName: (name) => {
        if (!name || name.trim().length === 0) {
          return false;
        }
        
        if (name.length > 100) {
          return false;
        }
        
        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(name)) {
          return false;
        }
        
        return true;
      }
    }),
    {
      name: 'workflow-metadata-storage',
      partialize: (state) => ({
        globalVariables: state.globalVariables,
        environments: state.environments,
        currentEnvironment: state.currentEnvironment,
        credentials: state.credentials,
        autoSaveEnabled: state.autoSaveEnabled,
        autoSaveInterval: state.autoSaveInterval
      })
    }
  )
);