/**
 * credentialsSlice Unit Tests
 * Tests for the Zustand credentials slice - manages credentials, environments, collaborators
 *
 * Task: T4.2 - Tests Store Slices (credentialsSlice)
 * Created: 2026-01-19
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createCredentialsSlice,
  CredentialsSlice,
  Credentials,
  Collaborator,
  ScheduledJob,
  WebhookEndpoint
} from '../../store/slices/credentialsSlice';

// Helper to create a minimal Zustand-like store for testing
function createTestStore() {
  let state: CredentialsSlice;

  const setState = (partial: Partial<typeof state> | ((state: typeof state) => Partial<typeof state>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state);
      state = { ...state, ...newState };
    } else {
      state = { ...state, ...partial };
    }
  };

  const getState = () => state;

  // Initialize with the slice
  const slice = createCredentialsSlice(setState as any, getState as any, {} as any);
  state = { ...slice };

  return {
    getState,
    setState,
    reset: () => {
      const freshSlice = createCredentialsSlice(setState as any, getState as any, {} as any);
      state = { ...freshSlice };
    }
  };
}

describe('credentialsSlice', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('Initial State', () => {
    it('should have default credentials structure', () => {
      const creds = store.getState().credentials;

      expect(creds.google).toBeDefined();
      expect(creds.aws).toBeDefined();
      expect(creds.openai).toBeDefined();
      expect(creds.stripe).toBeDefined();
      expect(creds.slack).toBeDefined();
      expect(creds.github).toBeDefined();
    });

    it('should have default environments', () => {
      expect(store.getState().environments).toContain('dev');
      expect(store.getState().environments).toContain('staging');
      expect(store.getState().environments).toContain('production');
    });

    it('should have dev as current environment', () => {
      expect(store.getState().currentEnvironment).toBe('dev');
    });

    it('should have empty collaborators array', () => {
      expect(store.getState().collaborators).toEqual([]);
    });

    it('should have empty scheduledJobs object', () => {
      expect(store.getState().scheduledJobs).toEqual({});
    });

    it('should have empty webhookEndpoints object', () => {
      expect(store.getState().webhookEndpoints).toEqual({});
    });
  });

  // ============================================
  // CRUD Tests
  // ============================================
  describe('CRUD', () => {
    it('should add credential', () => {
      store.getState().updateCredentials('stripe', { apiKey: 'sk_test_123' });

      expect(store.getState().credentials.stripe?.apiKey).toBe('sk_test_123');
    });

    it('should update credential', () => {
      store.getState().updateCredentials('openai', { apiKey: 'initial-key' });
      store.getState().updateCredentials('openai', { apiKey: 'updated-key' });

      expect(store.getState().credentials.openai?.apiKey).toBe('updated-key');
    });

    it('should add new credential type', () => {
      store.getState().updateCredentials('custom', { token: 'custom-token', secret: 'secret' });

      expect(store.getState().credentials['custom']).toEqual({
        token: 'custom-token',
        secret: 'secret'
      });
    });

    it('should get credential by service', () => {
      store.getState().updateCredentials('github', { token: 'gh_token_123' });

      const githubCreds = store.getState().credentials.github;

      expect(githubCreds?.token).toBe('gh_token_123');
    });

    it('should preserve existing credential fields when updating', () => {
      store.getState().updateCredentials('google', {
        clientId: 'client-id',
        clientSecret: 'client-secret'
      });

      store.getState().updateCredentials('google', { refreshToken: 'refresh-token' });

      expect(store.getState().credentials.google?.clientId).toBe('client-id');
      expect(store.getState().credentials.google?.clientSecret).toBe('client-secret');
      expect(store.getState().credentials.google?.refreshToken).toBe('refresh-token');
    });
  });

  // ============================================
  // Global Variables Tests
  // ============================================
  describe('Global Variables', () => {
    it('should set global variable', () => {
      store.getState().setGlobalVariable('API_URL', 'https://api.example.com');

      expect(store.getState().globalVariables['API_URL']).toBe('https://api.example.com');
    });

    it('should update global variable', () => {
      store.getState().setGlobalVariable('DEBUG', false);
      store.getState().setGlobalVariable('DEBUG', true);

      expect(store.getState().globalVariables['DEBUG']).toBe(true);
    });

    it('should delete global variable', () => {
      store.getState().setGlobalVariable('TEMP', 'value');
      expect(store.getState().globalVariables['TEMP']).toBe('value');

      store.getState().deleteGlobalVariable('TEMP');

      expect(store.getState().globalVariables['TEMP']).toBeUndefined();
    });

    it('should handle complex variable values', () => {
      const complexValue = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3]
      };

      store.getState().setGlobalVariable('CONFIG', complexValue);

      expect(store.getState().globalVariables['CONFIG']).toEqual(complexValue);
    });
  });

  // ============================================
  // Environment Tests
  // ============================================
  describe('Environments', () => {
    it('should set current environment', () => {
      store.getState().setCurrentEnvironment('production');

      expect(store.getState().currentEnvironment).toBe('production');
    });

    it('should switch between environments', () => {
      store.getState().setCurrentEnvironment('staging');
      expect(store.getState().currentEnvironment).toBe('staging');

      store.getState().setCurrentEnvironment('production');
      expect(store.getState().currentEnvironment).toBe('production');

      store.getState().setCurrentEnvironment('dev');
      expect(store.getState().currentEnvironment).toBe('dev');
    });
  });

  // ============================================
  // Collaborators Tests
  // ============================================
  describe('Collaborators', () => {
    it('should add collaborator', () => {
      store.getState().addCollaborator('user@example.com', ['read', 'write']);

      expect(store.getState().collaborators).toHaveLength(1);
      expect(store.getState().collaborators[0].email).toBe('user@example.com');
      expect(store.getState().collaborators[0].permissions).toContain('read');
      expect(store.getState().collaborators[0].permissions).toContain('write');
    });

    it('should add collaborator with timestamp', () => {
      const beforeTime = new Date().toISOString();
      store.getState().addCollaborator('test@example.com', ['read']);

      const collaborator = store.getState().collaborators[0];
      expect(collaborator.addedAt).toBeDefined();
      expect(new Date(collaborator.addedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime() - 1000
      );
    });

    it('should add multiple collaborators', () => {
      store.getState().addCollaborator('user1@example.com', ['read']);
      store.getState().addCollaborator('user2@example.com', ['read', 'write']);
      store.getState().addCollaborator('admin@example.com', ['read', 'write', 'admin']);

      expect(store.getState().collaborators).toHaveLength(3);
    });
  });

  // ============================================
  // Scheduled Jobs Tests
  // ============================================
  describe('Scheduled Jobs', () => {
    it('should schedule workflow', () => {
      const jobId = store.getState().scheduleWorkflow('workflow-1', '0 9 * * *');

      expect(jobId).toBeDefined();
      expect(jobId).toContain('job_');
      expect(store.getState().scheduledJobs[jobId]).toBeDefined();
    });

    it('should create job with correct properties', () => {
      const jobId = store.getState().scheduleWorkflow('workflow-1', '0 9 * * *');

      const job = store.getState().scheduledJobs[jobId];
      expect(job.workflowId).toBe('workflow-1');
      expect(job.cronExpression).toBe('0 9 * * *');
      expect(job.enabled).toBe(true);
      expect(job.lastRun).toBeNull();
      expect(job.nextRun).toBeNull();
    });

    it('should schedule multiple jobs', async () => {
      const jobId1 = store.getState().scheduleWorkflow('workflow-1', '0 9 * * *');
      // Wait a tiny bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2));
      const jobId2 = store.getState().scheduleWorkflow('workflow-2', '0 18 * * *');

      // Job IDs should be different
      expect(jobId1).not.toBe(jobId2);
      expect(Object.keys(store.getState().scheduledJobs)).toHaveLength(2);
    });
  });

  // ============================================
  // Webhook Endpoints Tests
  // ============================================
  describe('Webhook Endpoints', () => {
    it('should generate webhook URL', () => {
      const url = store.getState().generateWebhookUrl('workflow-1');

      expect(url).toBeDefined();
      expect(url).toContain('/webhook/');
    });

    it('should store webhook endpoint', () => {
      store.getState().generateWebhookUrl('workflow-1');

      const endpoints = Object.values(store.getState().webhookEndpoints);
      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].workflowId).toBe('workflow-1');
    });

    it('should generate unique webhook URLs', () => {
      const url1 = store.getState().generateWebhookUrl('workflow-1');
      const url2 = store.getState().generateWebhookUrl('workflow-2');

      expect(url1).not.toBe(url2);
    });

    it('should store webhook creation timestamp', () => {
      const beforeTime = new Date().toISOString();
      store.getState().generateWebhookUrl('workflow-1');

      const endpoint = Object.values(store.getState().webhookEndpoints)[0];
      expect(endpoint.created).toBeDefined();
      expect(new Date(endpoint.created).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime() - 1000
      );
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================
  describe('Edge Cases', () => {
    it('should handle empty credentials update', () => {
      store.getState().updateCredentials('empty', {});

      expect(store.getState().credentials['empty']).toEqual({});
    });

    it('should handle special characters in variable names', () => {
      store.getState().setGlobalVariable('MY_VAR_123', 'value');
      store.getState().setGlobalVariable('var.with.dots', 'dotted');

      expect(store.getState().globalVariables['MY_VAR_123']).toBe('value');
      expect(store.getState().globalVariables['var.with.dots']).toBe('dotted');
    });

    it('should handle deleting non-existent variable', () => {
      // Should not throw
      store.getState().deleteGlobalVariable('non-existent');

      expect(store.getState().globalVariables['non-existent']).toBeUndefined();
    });

    it('should handle adding collaborator with empty permissions', () => {
      store.getState().addCollaborator('user@example.com', []);

      expect(store.getState().collaborators[0].permissions).toEqual([]);
    });
  });
});
