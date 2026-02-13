/**
 * NodeBuilder Engine
 * Core engine for building custom nodes visually
 */

import {
  NodeBuilderConfig,
  ParameterDefinition,
  OperationDefinition,
  AuthenticationConfig,
  AuthType,
  NodeCategory,
  FieldType,
  ValidationRule,
  DisplayCondition,
  HttpMethod,
  BodyType,
} from '../types/nodebuilder';

export class NodeBuilder {
  private config: Partial<NodeBuilderConfig>;
  private version: string = '1.0.0';

  constructor(initialConfig?: Partial<NodeBuilderConfig>) {
    this.config = initialConfig || this.getDefaultConfig();
  }

  /**
   * Get default configuration for a new node
   */
  private getDefaultConfig(): Partial<NodeBuilderConfig> {
    return {
      id: this.generateId(),
      version: '1.0.0',
      author: 'Custom Node Builder',
      category: NodeCategory.CUSTOM,
      icon: 'Box',
      color: 'bg-gray-500',
      parameters: [],
      operations: [],
      tags: [],
      generationSettings: {
        language: 'typescript',
        includeTests: true,
        includeDocumentation: true,
        codingStyle: 'modern',
        errorHandling: 'try-catch',
        typescript: {
          strict: true,
          generateInterfaces: true,
        },
      },
    };
  }

  /**
   * Generate a unique ID for the node
   */
  private generateId(): string {
    return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set basic node information
   */
  setBasicInfo(info: {
    name: string;
    displayName: string;
    description: string;
    category: NodeCategory;
    icon?: string;
    color?: string;
    author?: string;
  }): this {
    this.config = {
      ...this.config,
      name: info.name,
      displayName: info.displayName,
      description: info.description,
      category: info.category,
      icon: info.icon || this.config.icon,
      color: info.color || this.config.color,
      author: info.author || this.config.author,
    };
    return this;
  }

  /**
   * Set authentication configuration
   */
  setAuthentication(authConfig: AuthenticationConfig): this {
    this.config.authentication = authConfig;
    return this;
  }

  /**
   * Create API Key authentication template
   */
  createApiKeyAuth(config: {
    name: string;
    description: string;
    headerName?: string;
    queryName?: string;
  }): AuthenticationConfig {
    const isHeader = config.headerName !== undefined;
    return {
      type: isHeader ? AuthType.API_KEY : AuthType.QUERY_PARAM,
      name: config.name,
      description: config.description,
      fields: [
        {
          name: 'apiKey',
          displayName: 'API Key',
          type: FieldType.PASSWORD,
          required: true,
          description: 'Your API key for authentication',
          placeholder: 'Enter your API key',
          headerName: config.headerName,
          queryName: config.queryName,
        },
      ],
    };
  }

  /**
   * Create OAuth2 authentication template
   */
  createOAuth2Auth(config: {
    name: string;
    description: string;
    authUrl: string;
    tokenUrl: string;
    scopes?: string[];
  }): AuthenticationConfig {
    return {
      type: AuthType.OAUTH2,
      name: config.name,
      description: config.description,
      fields: [
        {
          name: 'clientId',
          displayName: 'Client ID',
          type: FieldType.STRING,
          required: true,
          description: 'OAuth2 Client ID',
          placeholder: 'Enter client ID',
        },
        {
          name: 'clientSecret',
          displayName: 'Client Secret',
          type: FieldType.PASSWORD,
          required: true,
          description: 'OAuth2 Client Secret',
          placeholder: 'Enter client secret',
        },
        {
          name: 'scopes',
          displayName: 'Scopes',
          type: FieldType.STRING,
          required: false,
          description: 'OAuth2 scopes (comma-separated)',
          placeholder: 'read,write',
          authUrl: config.authUrl,
          tokenUrl: config.tokenUrl,
          scopes: config.scopes,
        },
      ],
    };
  }

  /**
   * Create Bearer Token authentication template
   */
  createBearerAuth(config: {
    name: string;
    description: string;
  }): AuthenticationConfig {
    return {
      type: AuthType.BEARER_TOKEN,
      name: config.name,
      description: config.description,
      fields: [
        {
          name: 'token',
          displayName: 'Bearer Token',
          type: FieldType.PASSWORD,
          required: true,
          description: 'Bearer token for authentication',
          placeholder: 'Enter bearer token',
        },
      ],
    };
  }

  /**
   * Add a parameter to the node
   */
  addParameter(parameter: ParameterDefinition): this {
    if (!this.config.parameters) {
      this.config.parameters = [];
    }
    this.config.parameters.push(parameter);
    return this;
  }

  /**
   * Create a parameter with common defaults
   */
  createParameter(config: {
    name: string;
    displayName: string;
    type: FieldType;
    required?: boolean;
    description?: string;
    placeholder?: string;
    default?: unknown;
    options?: Array<{ label: string; value: unknown }>;
    validation?: ValidationRule[];
  }): ParameterDefinition {
    return {
      id: `param_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      displayName: config.displayName,
      type: config.type,
      required: config.required ?? false,
      description: config.description || '',
      placeholder: config.placeholder,
      default: config.default,
      options: config.options,
      validation: config.validation,
    };
  }

  /**
   * Add an operation to the node
   */
  addOperation(operation: OperationDefinition): this {
    if (!this.config.operations) {
      this.config.operations = [];
    }
    this.config.operations.push(operation);
    return this;
  }

  /**
   * Create an HTTP operation
   */
  createHttpOperation(config: {
    name: string;
    displayName: string;
    description: string;
    method: HttpMethod;
    endpoint: string;
    parameters?: ParameterDefinition[];
    bodyType?: BodyType;
    headers?: Array<{ name: string; value: string }>;
  }): OperationDefinition {
    return {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      httpConfig: {
        method: config.method,
        endpoint: config.endpoint,
        headers: config.headers?.map((h) => ({ ...h, dynamic: false })),
        bodyType: config.bodyType || BodyType.JSON,
      },
      parameters: config.parameters || [],
      responseHandling: {
        successCondition: {
          type: 'status_code',
          statusCodes: [200, 201, 204],
        },
      },
    };
  }

  /**
   * Remove a parameter by ID
   */
  removeParameter(parameterId: string): this {
    if (this.config.parameters) {
      this.config.parameters = this.config.parameters.filter(
        (p) => p.id !== parameterId
      );
    }
    return this;
  }

  /**
   * Update a parameter
   */
  updateParameter(parameterId: string, updates: Partial<ParameterDefinition>): this {
    if (this.config.parameters) {
      const index = this.config.parameters.findIndex((p) => p.id === parameterId);
      if (index !== -1) {
        this.config.parameters[index] = {
          ...this.config.parameters[index],
          ...updates,
        };
      }
    }
    return this;
  }

  /**
   * Remove an operation by ID
   */
  removeOperation(operationId: string): this {
    if (this.config.operations) {
      this.config.operations = this.config.operations.filter(
        (o) => o.id !== operationId
      );
    }
    return this;
  }

  /**
   * Update an operation
   */
  updateOperation(operationId: string, updates: Partial<OperationDefinition>): this {
    if (this.config.operations) {
      const index = this.config.operations.findIndex((o) => o.id === operationId);
      if (index !== -1) {
        this.config.operations[index] = {
          ...this.config.operations[index],
          ...updates,
        };
      }
    }
    return this;
  }

  /**
   * Add tags to the node
   */
  addTags(tags: string[]): this {
    if (!this.config.tags) {
      this.config.tags = [];
    }
    this.config.tags = [...new Set([...this.config.tags, ...tags])];
    return this;
  }

  /**
   * Set generation settings
   */
  setGenerationSettings(settings: Partial<NodeBuilderConfig['generationSettings']>): this {
    this.config.generationSettings = {
      ...this.config.generationSettings!,
      ...settings,
    };
    return this;
  }

  /**
   * Validate the current configuration
   */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.name) {
      errors.push('Node name is required');
    }

    if (!this.config.displayName) {
      errors.push('Display name is required');
    }

    if (!this.config.description) {
      errors.push('Description is required');
    }

    if (!this.config.category) {
      errors.push('Category is required');
    }

    if (!this.config.operations || this.config.operations.length === 0) {
      errors.push('At least one operation is required');
    }

    // Validate operation endpoints
    if (this.config.operations) {
      this.config.operations.forEach((op, index) => {
        if (!op.httpConfig.endpoint) {
          errors.push(`Operation ${index + 1} is missing an endpoint`);
        }
        if (!op.name) {
          errors.push(`Operation ${index + 1} is missing a name`);
        }
      });
    }

    // Validate parameters
    if (this.config.parameters) {
      this.config.parameters.forEach((param, index) => {
        if (!param.name) {
          errors.push(`Parameter ${index + 1} is missing a name`);
        }
        if (!param.displayName) {
          errors.push(`Parameter ${index + 1} is missing a display name`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): NodeBuilderConfig {
    const validation = this.validate();
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    return this.config as NodeBuilderConfig;
  }

  /**
   * Export configuration as JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importFromJSON(json: string): this {
    try {
      const config = JSON.parse(json) as NodeBuilderConfig;
      this.config = config;
      return this;
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  /**
   * Clone the current builder with its configuration
   */
  clone(): NodeBuilder {
    return new NodeBuilder(JSON.parse(JSON.stringify(this.config)));
  }

  /**
   * Reset to default configuration
   */
  reset(): this {
    this.config = this.getDefaultConfig();
    return this;
  }

  /**
   * Get a summary of the node configuration
   */
  getSummary(): {
    name: string;
    category: NodeCategory;
    operationCount: number;
    parameterCount: number;
    hasAuth: boolean;
    authType?: AuthType;
  } {
    return {
      name: this.config.displayName || 'Untitled Node',
      category: this.config.category || NodeCategory.CUSTOM,
      operationCount: this.config.operations?.length || 0,
      parameterCount: this.config.parameters?.length || 0,
      hasAuth: !!this.config.authentication,
      authType: this.config.authentication?.type,
    };
  }

  /**
   * Estimate complexity score (0-100)
   */
  estimateComplexity(): number {
    let score = 0;

    // Base complexity
    score += 10;

    // Operation complexity
    const operationCount = this.config.operations?.length || 0;
    score += Math.min(operationCount * 5, 30);

    // Parameter complexity
    const parameterCount = this.config.parameters?.length || 0;
    score += Math.min(parameterCount * 3, 20);

    // Auth complexity
    if (this.config.authentication) {
      switch (this.config.authentication.type) {
        case AuthType.OAUTH2:
          score += 20;
          break;
        case AuthType.API_KEY:
        case AuthType.BEARER_TOKEN:
          score += 10;
          break;
        case AuthType.BASIC_AUTH:
          score += 5;
          break;
      }
    }

    // Data mapping complexity
    const mappingRules =
      (this.config.inputMapping?.length || 0) + (this.config.outputMapping?.length || 0);
    score += Math.min(mappingRules * 2, 20);

    return Math.min(score, 100);
  }
}

/**
 * Factory functions for common node patterns
 */
export class NodeBuilderFactory {
  /**
   * Create a REST API node builder
   */
  static createRestApiNode(config: {
    name: string;
    displayName: string;
    description: string;
    baseUrl: string;
    authType?: 'apiKey' | 'bearer' | 'oauth2';
  }): NodeBuilder {
    const builder = new NodeBuilder();

    builder.setBasicInfo({
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      category: NodeCategory.ACTION,
      icon: 'Globe',
      color: 'bg-blue-500',
    });

    // Add authentication based on type
    if (config.authType === 'apiKey') {
      builder.setAuthentication(
        builder.createApiKeyAuth({
          name: `${config.displayName} API`,
          description: 'API Key authentication',
          headerName: 'X-API-Key',
        })
      );
    } else if (config.authType === 'bearer') {
      builder.setAuthentication(
        builder.createBearerAuth({
          name: `${config.displayName} API`,
          description: 'Bearer token authentication',
        })
      );
    }

    return builder;
  }

  /**
   * Create a webhook trigger node builder
   */
  static createWebhookNode(config: {
    name: string;
    displayName: string;
    description: string;
  }): NodeBuilder {
    const builder = new NodeBuilder();

    builder.setBasicInfo({
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      category: NodeCategory.TRIGGER,
      icon: 'Webhook',
      color: 'bg-green-500',
    });

    return builder;
  }

  /**
   * Create a database node builder
   */
  static createDatabaseNode(config: {
    name: string;
    displayName: string;
    description: string;
    databaseType: 'sql' | 'nosql';
  }): NodeBuilder {
    const builder = new NodeBuilder();

    builder.setBasicInfo({
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      category: NodeCategory.DATABASE,
      icon: 'Database',
      color: 'bg-purple-500',
    });

    return builder;
  }
}
