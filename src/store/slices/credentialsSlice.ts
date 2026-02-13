import { StateCreator } from 'zustand';

export interface Credentials {
  google?: { clientId: string; clientSecret: string; refreshToken: string };
  aws?: { accessKeyId: string; secretAccessKey: string; region: string };
  openai?: { apiKey: string };
  stripe?: { apiKey: string };
  slack?: { webhookUrl: string };
  github?: { token: string };
  [key: string]: any;
}

export interface Collaborator {
  email: string;
  permissions: string[];
  addedAt: string;
}

export interface ScheduledJob {
  workflowId: string;
  cronExpression: string;
  enabled: boolean;
  lastRun: string | null;
  nextRun: string | null;
}

export interface WebhookEndpoint {
  workflowId: string;
  url: string;
  created: string;
}

export interface CredentialsSlice {
  // State
  credentials: Credentials;
  globalVariables: Record<string, any>;
  environments: string[];
  currentEnvironment: string;
  collaborators: Collaborator[];
  scheduledJobs: Record<string, ScheduledJob>;
  webhookEndpoints: Record<string, WebhookEndpoint>;
  // NOTE: expressions, customFunctions, testSessions moved to debugSlice (F1.3)

  // Actions
  updateCredentials: (service: string, credentials: any) => void;
  setGlobalVariable: (key: string, value: any) => void;
  deleteGlobalVariable: (key: string) => void;
  setCurrentEnvironment: (env: string) => void;
  addCollaborator: (email: string, permissions: string[]) => void;
  scheduleWorkflow: (workflowId: string, cronExpression: string) => string;
  generateWebhookUrl: (workflowId: string) => string;
}

export const createCredentialsSlice: StateCreator<
  CredentialsSlice,
  [],
  [],
  CredentialsSlice
> = (set) => ({
  // Initial state
  credentials: {
    google: { clientId: '', clientSecret: '', refreshToken: '' },
    aws: { accessKeyId: '', secretAccessKey: '', region: 'us-east-1' },
    openai: { apiKey: '' },
    stripe: { apiKey: '' },
    slack: { webhookUrl: '' },
    github: { token: '' },
  },
  globalVariables: {},
  environments: ['dev', 'staging', 'production'],
  currentEnvironment: 'dev',
  collaborators: [],
  scheduledJobs: {},
  webhookEndpoints: {},
  // NOTE: expressions, customFunctions, testSessions moved to debugSlice (F1.3)

  // Actions
  updateCredentials: (service, credentials) => set((state) => ({
    credentials: {
      ...state.credentials,
      [service]: { ...state.credentials[service], ...credentials }
    }
  })),

  setGlobalVariable: (key, value) => set((state) => ({
    globalVariables: { ...state.globalVariables, [key]: value }
  })),

  deleteGlobalVariable: (key) => set((state) => {
    const newVariables = { ...state.globalVariables };
    delete newVariables[key];
    return { globalVariables: newVariables };
  }),

  setCurrentEnvironment: (env) => set({ currentEnvironment: env }),

  addCollaborator: (email, permissions) => set((state) => ({
    collaborators: [...state.collaborators, {
      email,
      permissions,
      addedAt: new Date().toISOString()
    }]
  })),

  scheduleWorkflow: (workflowId, cronExpression) => {
    const jobId = `job_${Date.now()}`;
    set((state) => ({
      scheduledJobs: {
        ...state.scheduledJobs,
        [jobId]: {
          workflowId,
          cronExpression,
          enabled: true,
          lastRun: null,
          nextRun: null,
        }
      }
    }));
    return jobId;
  },

  generateWebhookUrl: (workflowId) => {
    const webhookId = `webhook_${Date.now()}`;
    const array = new Uint8Array(16);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    }
    const token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    const url = `/webhook/${token}`;

    set((state) => ({
      webhookEndpoints: {
        ...state.webhookEndpoints,
        [webhookId]: { workflowId, url, created: new Date().toISOString() }
      }
    }));
    return url;
  },
});
