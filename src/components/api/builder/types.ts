import { APIEndpoint, APIGateway, APIParameter } from '../../../services/APIBuilderService';

export interface APIBuilderState {
  endpoints: APIEndpoint[];
  gateways: APIGateway[];
  selectedEndpoint: APIEndpoint | null;
  isCreatingEndpoint: boolean;
  isLoading: boolean;
  activeTab: APIBuilderTab;
}

export type APIBuilderTab = 'endpoints' | 'gateway' | 'testing' | 'docs' | 'monitoring';

export interface EndpointFormData {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  enabled: boolean;
  authentication: {
    required: boolean;
    type: 'api_key' | 'bearer' | 'basic' | 'oauth2' | 'none';
    config: Record<string, unknown>;
  };
  rateLimit: {
    enabled: boolean;
    requests: number;
    window: number;
  };
  request: {
    headers: APIParameter[];
    queryParams: APIParameter[];
    bodySchema?: Record<string, unknown>;
  };
  response: {
    successSchema: Record<string, unknown>;
    errorSchemas: Record<string, unknown>;
  };
  workflow: {
    transformations: unknown[];
  };
  validation: {
    enabled: boolean;
    rules: unknown[];
  };
  caching: {
    enabled: boolean;
    ttl: number;
    strategy: string;
  };
  monitoring: {
    enabled: boolean;
    logRequests: boolean;
    logResponses: boolean;
    alerts: unknown[];
  };
  documentation: {
    summary: string;
    description: string;
    tags: string[];
    examples: unknown[];
  };
}

export interface TestRequest {
  headers: string;
  query: string;
  body: string;
}

export interface TestResponse {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
  responseTime?: number;
  error?: string;
  timestamp?: string;
}

export interface APIBuilderActions {
  setEndpoints: (endpoints: APIEndpoint[]) => void;
  setGateways: (gateways: APIGateway[]) => void;
  setSelectedEndpoint: (endpoint: APIEndpoint | null) => void;
  setIsCreatingEndpoint: (isCreating: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setActiveTab: (tab: APIBuilderTab) => void;
  loadData: () => Promise<void>;
  handleSave: (formData: Partial<APIEndpoint>) => Promise<void>;
}

export const DEFAULT_FORM_DATA: EndpointFormData = {
  name: '',
  description: '',
  method: 'GET',
  path: '/api/',
  enabled: true,
  authentication: {
    required: false,
    type: 'none',
    config: {}
  },
  rateLimit: {
    enabled: false,
    requests: 100,
    window: 60
  },
  request: {
    headers: [],
    queryParams: [],
    bodySchema: undefined
  },
  response: {
    successSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        data: { type: 'object' }
      }
    },
    errorSchemas: {}
  },
  workflow: {
    transformations: []
  },
  validation: {
    enabled: true,
    rules: []
  },
  caching: {
    enabled: false,
    ttl: 300,
    strategy: 'memory'
  },
  monitoring: {
    enabled: true,
    logRequests: true,
    logResponses: true,
    alerts: []
  },
  documentation: {
    summary: '',
    description: '',
    tags: [],
    examples: []
  }
};

export { APIEndpoint, APIGateway, APIParameter };
