/**
 * Postman Importer
 * Import Postman Collection v2.1 and generate nodes
 */

import {
  PostmanCollection,
  PostmanItem,
  PostmanRequest,
  PostmanAuth,
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

export class PostmanImporter {
  private collection: PostmanCollection;

  constructor(collection: PostmanCollection | string) {
    if (typeof collection === 'string') {
      try {
        this.collection = JSON.parse(collection);
      } catch (error) {
        throw new Error(`Failed to parse Postman collection: ${error}`);
      }
    } else {
      this.collection = collection;
    }

    this.validateCollection();
  }

  /**
   * Validate Postman collection
   */
  private validateCollection(): void {
    if (!this.collection.info) {
      throw new Error('Invalid Postman collection: missing info section');
    }

    if (!this.collection.info.schema?.includes('v2.1')) {
      throw new Error('Only Postman Collection v2.1 format is supported');
    }

    if (!this.collection.item || this.collection.item.length === 0) {
      throw new Error('Invalid Postman collection: no items defined');
    }
  }

  /**
   * Import and generate node configuration
   */
  async import(): Promise<NodeBuilder> {
    const builder = new NodeBuilder();

    // Set basic info from Postman collection
    builder.setBasicInfo({
      name: this.sanitizeName(this.collection.info.name),
      displayName: this.collection.info.name,
      description: this.collection.info.description || `API client for ${this.collection.info.name}`,
      category: NodeCategory.ACTION,
      icon: 'Send',
      color: 'bg-orange-500',
      author: 'Postman Import',
    });

    // Extract and set authentication
    const auth = this.extractAuthentication();
    if (auth) {
      builder.setAuthentication(auth);
    }

    // Extract operations from items
    const operations = this.extractOperations(this.collection.item);
    operations.forEach((op) => builder.addOperation(op));

    // Add collection variables as tags
    const tags = this.extractTags();
    builder.addTags(tags);

    return builder;
  }

  /**
   * Extract authentication from collection
   */
  private extractAuthentication(): AuthenticationConfig | null {
    if (!this.collection.auth) {
      return null;
    }

    return this.convertPostmanAuth(this.collection.auth);
  }

  /**
   * Convert Postman auth to AuthenticationConfig
   */
  private convertPostmanAuth(auth: PostmanAuth): AuthenticationConfig {
    switch (auth.type) {
      case 'apikey':
        const apikeyData = this.parseAuthData(auth.apikey);
        const keyLocation = apikeyData.in || 'header';
        const keyName = apikeyData.key || 'X-API-Key';

        return {
          type: keyLocation === 'header' ? AuthType.API_KEY : AuthType.QUERY_PARAM,
          name: 'API Key Authentication',
          description: 'API Key authentication',
          fields: [
            {
              name: 'apiKey',
              displayName: 'API Key',
              type: FieldType.PASSWORD,
              required: true,
              description: 'Your API key',
              placeholder: 'Enter your API key',
              headerName: keyLocation === 'header' ? keyName : undefined,
              queryName: keyLocation === 'query' ? keyName : undefined,
            },
          ],
        };

      case 'bearer':
        return {
          type: AuthType.BEARER_TOKEN,
          name: 'Bearer Token Authentication',
          description: 'Bearer token authentication',
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

      case 'basic':
        return {
          type: AuthType.BASIC_AUTH,
          name: 'Basic Authentication',
          description: 'Basic authentication',
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

      case 'oauth2':
        const oauth2Data = this.parseAuthData(auth.oauth2);
        return {
          type: AuthType.OAUTH2,
          name: 'OAuth2 Authentication',
          description: 'OAuth2 authentication',
          fields: [
            {
              name: 'clientId',
              displayName: 'Client ID',
              type: FieldType.STRING,
              required: true,
              description: 'OAuth2 Client ID',
              placeholder: 'Enter client ID',
              authUrl: oauth2Data.authUrl,
              tokenUrl: oauth2Data.tokenUrl,
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

      default:
        return {
          type: AuthType.NONE,
          name: 'No Authentication',
          description: 'No authentication required',
          fields: [],
        };
    }
  }

  /**
   * Parse Postman auth data array into object
   */
  private parseAuthData(data?: Array<{ key: string; value: string }>): Record<string, string> {
    if (!data) return {};
    return data.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, string>);
  }

  /**
   * Extract operations from Postman items
   */
  private extractOperations(items: PostmanItem[], prefix = ''): OperationDefinition[] {
    const operations: OperationDefinition[] = [];

    for (const item of items) {
      // If item has request, it's an operation
      if (item.request) {
        operations.push(this.convertRequest(item, prefix));
      }

      // If item has nested items (folder), recurse
      if (item.item) {
        const nestedOps = this.extractOperations(
          item.item,
          prefix ? `${prefix}_${item.name}` : item.name
        );
        operations.push(...nestedOps);
      }
    }

    return operations;
  }

  /**
   * Convert Postman request to OperationDefinition
   */
  private convertRequest(item: PostmanItem, prefix: string): OperationDefinition {
    const request = item.request!;
    const operationId = this.sanitizeName(`${prefix ? prefix + '_' : ''}${item.name}`);

    // Parse URL
    const { endpoint, queryParams } = this.parseUrl(request.url);

    // Extract method
    const method = this.parseMethod(request.method);

    // Extract parameters
    const parameters = this.extractRequestParameters(request);

    // Extract body type
    const bodyType = this.parseBodyType(request.body?.mode);

    return {
      id: `op_${operationId}`,
      name: operationId,
      displayName: item.name,
      description: item.description || request.description || item.name,
      httpConfig: {
        method,
        endpoint,
        headers: request.header?.map((h) => ({
          name: h.key,
          value: h.value,
          dynamic: h.value.includes('{{'),
        })) || [],
        queryParams: queryParams.map((q) => ({
          name: q.key,
          value: q.value,
          dynamic: q.value.includes('{{'),
          required: !q.disabled,
        })),
        bodyType,
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
   * Parse Postman URL
   */
  private parseUrl(url: string | any): {
    endpoint: string;
    queryParams: Array<{ key: string; value: string; disabled?: boolean }>;
  } {
    if (typeof url === 'string') {
      try {
        const urlObj = new URL(url);
        const queryParams: Array<{ key: string; value: string }> = [];

        urlObj.searchParams.forEach((value, key) => {
          queryParams.push({ key, value });
        });

        return {
          endpoint: urlObj.pathname,
          queryParams,
        };
      } catch {
        return {
          endpoint: url,
          queryParams: [],
        };
      }
    }

    // URL object format
    const path = url.path?.join('/') || '';
    const queryParams = url.query || [];

    return {
      endpoint: `/${path}`,
      queryParams,
    };
  }

  /**
   * Parse HTTP method
   */
  private parseMethod(method: string): HttpMethod {
    const upperMethod = method.toUpperCase();
    if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(upperMethod)) {
      return upperMethod as HttpMethod;
    }
    return HttpMethod.GET;
  }

  /**
   * Parse body type
   */
  private parseBodyType(mode?: string): BodyType {
    switch (mode) {
      case 'raw':
        return BodyType.JSON;
      case 'formdata':
        return BodyType.FORM_DATA;
      case 'urlencoded':
        return BodyType.FORM_URLENCODED;
      default:
        return BodyType.NONE;
    }
  }

  /**
   * Extract parameters from request
   */
  private extractRequestParameters(request: PostmanRequest): ParameterDefinition[] {
    const parameters: ParameterDefinition[] = [];

    // Extract from query params
    if (typeof request.url !== 'string') {
      const queryParams = request.url.query || [];
      queryParams.forEach((param) => {
        if (!param.disabled) {
          parameters.push({
            id: `param_query_${param.key}`,
            name: param.key,
            displayName: this.toDisplayName(param.key),
            type: FieldType.STRING,
            required: false,
            description: param.description || `Query parameter: ${param.key}`,
            default: param.value,
          });
        }
      });
    }

    // Extract from body
    if (request.body?.mode === 'raw') {
      try {
        const bodyData = JSON.parse(request.body.raw || '{}');
        Object.entries(bodyData).forEach(([key, value]) => {
          parameters.push({
            id: `param_body_${key}`,
            name: key,
            displayName: this.toDisplayName(key),
            type: this.inferType(value),
            required: false,
            description: `Body parameter: ${key}`,
            default: value,
          });
        });
      } catch {
        // If JSON parsing fails, add a generic body parameter
        parameters.push({
          id: 'param_body',
          name: 'body',
          displayName: 'Request Body',
          type: FieldType.JSON,
          required: false,
          description: 'Request body data',
        });
      }
    }

    return parameters;
  }

  /**
   * Infer field type from value
   */
  private inferType(value: unknown): FieldType {
    if (typeof value === 'number') return FieldType.NUMBER;
    if (typeof value === 'boolean') return FieldType.BOOLEAN;
    if (Array.isArray(value)) return FieldType.MULTI_SELECT;
    if (typeof value === 'object') return FieldType.JSON;
    return FieldType.STRING;
  }

  /**
   * Convert name to display format
   */
  private toDisplayName(name: string): string {
    return name
      .split(/[_-]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract tags from collection
   */
  private extractTags(): string[] {
    const tags = new Set<string>();

    tags.add(this.collection.info.name.toLowerCase());

    // Add folder names as tags
    const addFolderTags = (items: PostmanItem[]) => {
      for (const item of items) {
        if (item.item) {
          tags.add(this.sanitizeName(item.name));
          addFolderTags(item.item);
        }
      }
    };

    addFolderTags(this.collection.item);

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
    totalRequests: number;
    totalFolders: number;
    totalParameters: number;
    hasAuth: boolean;
    authType?: string;
  } {
    let requestCount = 0;
    let folderCount = 0;
    let parameterCount = 0;

    const countItems = (items: PostmanItem[]) => {
      for (const item of items) {
        if (item.request) {
          requestCount++;
          const params = this.extractRequestParameters(item.request);
          parameterCount += params.length;
        }
        if (item.item) {
          folderCount++;
          countItems(item.item);
        }
      }
    };

    countItems(this.collection.item);

    const auth = this.extractAuthentication();

    return {
      totalRequests: requestCount,
      totalFolders: folderCount,
      totalParameters: parameterCount,
      hasAuth: !!auth,
      authType: auth?.type,
    };
  }
}
