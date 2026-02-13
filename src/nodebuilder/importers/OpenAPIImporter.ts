/**
 * OpenAPI Importer
 * Import OpenAPI 3.0/3.1 specifications and generate nodes
 */

import {
  OpenAPISpec,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPISecurityScheme,
  NodeBuilderConfig,
  AuthType,
  HttpMethod,
  FieldType,
  ParameterDefinition,
  OperationDefinition,
  AuthenticationConfig,
  NodeCategory,
  BodyType,
} from '../../types/nodebuilder';
import { NodeBuilder } from '../NodeBuilder';

export class OpenAPIImporter {
  private spec: OpenAPISpec;
  private baseUrl: string;

  constructor(spec: OpenAPISpec | string) {
    if (typeof spec === 'string') {
      try {
        this.spec = JSON.parse(spec);
      } catch (error) {
        throw new Error(`Failed to parse OpenAPI spec: ${error}`);
      }
    } else {
      this.spec = spec;
    }

    this.baseUrl = this.extractBaseUrl();
    this.validateSpec();
  }

  /**
   * Validate OpenAPI specification
   */
  private validateSpec(): void {
    if (!this.spec.openapi) {
      throw new Error('Invalid OpenAPI specification: missing openapi version');
    }

    if (!this.spec.openapi.startsWith('3.0') && !this.spec.openapi.startsWith('3.1')) {
      throw new Error(`Unsupported OpenAPI version: ${this.spec.openapi}. Only 3.0 and 3.1 are supported.`);
    }

    if (!this.spec.info) {
      throw new Error('Invalid OpenAPI specification: missing info section');
    }

    if (!this.spec.paths || Object.keys(this.spec.paths).length === 0) {
      throw new Error('Invalid OpenAPI specification: no paths defined');
    }
  }

  /**
   * Extract base URL from servers
   */
  private extractBaseUrl(): string {
    if (this.spec.servers && this.spec.servers.length > 0) {
      return this.spec.servers[0].url;
    }
    return 'https://api.example.com';
  }

  /**
   * Import and generate node configuration
   */
  async import(): Promise<NodeBuilder> {
    const builder = new NodeBuilder();

    // Set basic info from OpenAPI spec
    builder.setBasicInfo({
      name: this.sanitizeName(this.spec.info.title),
      displayName: this.spec.info.title,
      description: this.spec.info.description || `API client for ${this.spec.info.title}`,
      category: NodeCategory.ACTION,
      icon: 'Globe',
      color: 'bg-blue-500',
      author: this.spec.info.contact?.name || 'OpenAPI Import',
    });

    // Extract and set authentication
    const auth = this.extractAuthentication();
    if (auth) {
      builder.setAuthentication(auth);
    }

    // Extract operations from paths
    const operations = this.extractOperations();
    operations.forEach((op) => builder.addOperation(op));

    // Add common parameters
    const commonParams = this.extractCommonParameters();
    commonParams.forEach((param) => builder.addParameter(param));

    // Add tags
    const tags = this.extractTags();
    builder.addTags(tags);

    return builder;
  }

  /**
   * Extract authentication configuration
   */
  private extractAuthentication(): AuthenticationConfig | null {
    if (!this.spec.components?.securitySchemes) {
      return null;
    }

    // Get the first security scheme
    const schemeName = Object.keys(this.spec.components.securitySchemes)[0];
    const scheme = this.spec.components.securitySchemes[schemeName];

    return this.convertSecurityScheme(schemeName, scheme);
  }

  /**
   * Convert OpenAPI security scheme to AuthenticationConfig
   */
  private convertSecurityScheme(
    name: string,
    scheme: OpenAPISecurityScheme
  ): AuthenticationConfig {
    switch (scheme.type) {
      case 'apiKey':
        return {
          type: AuthType.API_KEY,
          name: name,
          description: `API Key authentication`,
          fields: [
            {
              name: 'apiKey',
              displayName: 'API Key',
              type: FieldType.PASSWORD,
              required: true,
              description: 'Your API key',
              placeholder: 'Enter your API key',
              headerName: scheme.in === 'header' ? scheme.name : undefined,
              queryName: scheme.in === 'query' ? scheme.name : undefined,
            },
          ],
        };

      case 'http':
        if (scheme.scheme === 'bearer') {
          return {
            type: AuthType.BEARER_TOKEN,
            name: name,
            description: `Bearer token authentication`,
            fields: [
              {
                name: 'token',
                displayName: 'Bearer Token',
                type: FieldType.PASSWORD,
                required: true,
                description: 'Your bearer token',
                placeholder: 'Enter your bearer token',
              },
            ],
          };
        } else if (scheme.scheme === 'basic') {
          return {
            type: AuthType.BASIC_AUTH,
            name: name,
            description: `Basic authentication`,
            fields: [
              {
                name: 'username',
                displayName: 'Username',
                type: FieldType.STRING,
                required: true,
                description: 'Your username',
                placeholder: 'Enter username',
              },
              {
                name: 'password',
                displayName: 'Password',
                type: FieldType.PASSWORD,
                required: true,
                description: 'Your password',
                placeholder: 'Enter password',
              },
            ],
          };
        }
        break;

      case 'oauth2':
        const flow = scheme.flows?.authorizationCode || scheme.flows?.implicit;
        return {
          type: AuthType.OAUTH2,
          name: name,
          description: `OAuth2 authentication`,
          fields: [
            {
              name: 'clientId',
              displayName: 'Client ID',
              type: FieldType.STRING,
              required: true,
              description: 'OAuth2 Client ID',
              placeholder: 'Enter client ID',
              authUrl: flow?.authorizationUrl,
              tokenUrl: flow?.tokenUrl,
              scopes: flow?.scopes ? Object.keys(flow.scopes) : [],
            },
            {
              name: 'clientSecret',
              displayName: 'Client Secret',
              type: FieldType.PASSWORD,
              required: true,
              description: 'OAuth2 Client Secret',
              placeholder: 'Enter client secret',
            },
          ],
        };
    }

    // Fallback to no auth
    return {
      type: AuthType.NONE,
      name: 'No Authentication',
      description: 'No authentication required',
      fields: [],
    };
  }

  /**
   * Extract operations from OpenAPI paths
   */
  private extractOperations(): OperationDefinition[] {
    const operations: OperationDefinition[] = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      const methods: Array<keyof typeof pathItem> = ['get', 'post', 'put', 'patch', 'delete'];

      for (const method of methods) {
        const operation = pathItem[method] as OpenAPIOperation | undefined;
        if (operation) {
          operations.push(this.convertOperation(path, method.toUpperCase() as HttpMethod, operation));
        }
      }
    }

    return operations;
  }

  /**
   * Convert OpenAPI operation to OperationDefinition
   */
  private convertOperation(
    path: string,
    method: HttpMethod,
    operation: OpenAPIOperation
  ): OperationDefinition {
    const operationId = operation.operationId || `${method.toLowerCase()}${this.sanitizeName(path)}`;
    const parameters = this.extractOperationParameters(operation);

    return {
      id: `op_${operationId}`,
      name: operationId,
      displayName: operation.summary || operationId,
      description: operation.description || operation.summary || `${method} ${path}`,
      httpConfig: {
        method,
        endpoint: path,
        headers: [],
        queryParams: [],
        bodyType: method === 'GET' ? BodyType.NONE : BodyType.JSON,
      },
      parameters,
      responseHandling: {
        successCondition: {
          type: 'status_code',
          statusCodes: [200, 201, 204],
        },
      },
    };
  }

  /**
   * Extract parameters from OpenAPI operation
   */
  private extractOperationParameters(operation: OpenAPIOperation): ParameterDefinition[] {
    const parameters: ParameterDefinition[] = [];

    // Extract from parameters array
    if (operation.parameters) {
      for (const param of operation.parameters) {
        parameters.push(this.convertParameter(param));
      }
    }

    // Extract from request body
    if (operation.requestBody) {
      const jsonContent = operation.requestBody.content?.['application/json'];
      if (jsonContent?.schema) {
        const bodyParams = this.extractSchemaParameters(jsonContent.schema, 'body');
        parameters.push(...bodyParams);
      }
    }

    return parameters;
  }

  /**
   * Convert OpenAPI parameter to ParameterDefinition
   */
  private convertParameter(param: OpenAPIParameter): ParameterDefinition {
    return {
      id: `param_${param.name}`,
      name: param.name,
      displayName: param.name.charAt(0).toUpperCase() + param.name.slice(1),
      type: this.convertSchemaType(param.schema),
      required: param.required || false,
      description: param.description || '',
      placeholder: param.schema?.default?.toString(),
      default: param.schema?.default,
    };
  }

  /**
   * Extract parameters from OpenAPI schema
   */
  private extractSchemaParameters(schema: any, prefix: string): ParameterDefinition[] {
    const parameters: ParameterDefinition[] = [];

    if (schema.type === 'object' && schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const prop = propSchema as any;
        const isRequired = schema.required?.includes(propName) || false;

        parameters.push({
          id: `param_${prefix}_${propName}`,
          name: propName,
          displayName: propName.charAt(0).toUpperCase() + propName.slice(1),
          type: this.convertSchemaType(prop),
          required: isRequired,
          description: prop.description || '',
          placeholder: prop.default?.toString(),
          default: prop.default,
        });
      }
    }

    return parameters;
  }

  /**
   * Convert OpenAPI schema type to FieldType
   */
  private convertSchemaType(schema: any): FieldType {
    if (!schema || !schema.type) {
      return FieldType.STRING;
    }

    switch (schema.type) {
      case 'string':
        if (schema.format === 'email') return FieldType.EMAIL;
        if (schema.format === 'uri') return FieldType.URL;
        if (schema.format === 'password') return FieldType.PASSWORD;
        if (schema.enum) return FieldType.SELECT;
        return FieldType.STRING;

      case 'number':
      case 'integer':
        return FieldType.NUMBER;

      case 'boolean':
        return FieldType.BOOLEAN;

      case 'array':
        return FieldType.MULTI_SELECT;

      case 'object':
        return FieldType.JSON;

      default:
        return FieldType.STRING;
    }
  }

  /**
   * Extract common parameters used across operations
   */
  private extractCommonParameters(): ParameterDefinition[] {
    // For now, return empty array
    // Could be extended to find parameters that appear in multiple operations
    return [];
  }

  /**
   * Extract tags from OpenAPI spec
   */
  private extractTags(): string[] {
    const tags = new Set<string>();

    // Add tags from spec metadata
    if (this.spec.info.title) {
      tags.add(this.spec.info.title.toLowerCase());
    }

    // Add tags from operations
    for (const pathItem of Object.values(this.spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete'];
      for (const method of methods) {
        const operation = (pathItem as any)[method] as OpenAPIOperation | undefined;
        if (operation?.tags) {
          operation.tags.forEach((tag) => tags.add(tag.toLowerCase()));
        }
      }
    }

    return Array.from(tags);
  }

  /**
   * Sanitize name for use as identifier
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Get import statistics
   */
  getStatistics(): {
    totalOperations: number;
    totalParameters: number;
    hasAuth: boolean;
    authType?: string;
    apiVersion: string;
  } {
    const operations = this.extractOperations();
    const totalParameters = operations.reduce(
      (sum, op) => sum + op.parameters.length,
      0
    );

    const auth = this.extractAuthentication();

    return {
      totalOperations: operations.length,
      totalParameters,
      hasAuth: !!auth,
      authType: auth?.type,
      apiVersion: this.spec.openapi,
    };
  }
}
