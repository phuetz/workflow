/**
 * OpenAPI Exporter
 * Generate OpenAPI 3.0 specifications for webhook endpoints
 */

import type { WorkflowAnalysis, OpenAPISpec } from '../../types/workflowDocumentation';
import YAML from 'yaml';

export class OpenAPIExporter {
  /**
   * Export to OpenAPI JSON
   */
  exportJSON(analysis: WorkflowAnalysis, baseUrl: string = 'https://api.example.com'): string {
    const spec = this.generateSpec(analysis, baseUrl);
    return JSON.stringify(spec, null, 2);
  }

  /**
   * Export to OpenAPI YAML
   */
  exportYAML(analysis: WorkflowAnalysis, baseUrl: string = 'https://api.example.com'): string {
    const spec = this.generateSpec(analysis, baseUrl);
    return YAML.stringify(spec);
  }

  /**
   * Generate OpenAPI specification
   */
  private generateSpec(analysis: WorkflowAnalysis, baseUrl: string): OpenAPISpec {
    const webhookNodes = analysis.nodes.filter((n) =>
      n.type.toLowerCase().includes('webhook') ||
      n.type.toLowerCase().includes('trigger')
    );

    const spec: OpenAPISpec = {
      openapi: '3.0.0',
      info: {
        title: analysis.metadata.name,
        version: analysis.metadata.version,
        description: analysis.metadata.description,
        contact: analysis.metadata.author
          ? {
              name: analysis.metadata.author,
            }
          : undefined,
      },
      servers: [
        {
          url: baseUrl,
          description: 'Production server',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
      },
    };

    // Generate paths from webhook nodes
    webhookNodes.forEach((node) => {
      const path = this.getNodePath(node);
      const method = this.getNodeMethod(node);

      if (!spec.paths[path]) {
        spec.paths[path] = {};
      }

      spec.paths[path][method.toLowerCase()] = this.generateOperation(node, analysis);

      // Generate schema if examples exist
      if (node.exampleInput) {
        spec.components!.schemas![`${node.id}Request`] = this.generateSchemaFromExample(
          node.exampleInput
        );
      }
      if (node.exampleOutput) {
        spec.components!.schemas![`${node.id}Response`] = this.generateSchemaFromExample(
          node.exampleOutput
        );
      }
    });

    // Add security schemes if credentials are used
    if (analysis.dependencies.credentials.length > 0) {
      spec.components!.securitySchemes = this.generateSecuritySchemes(analysis);
    }

    return spec;
  }

  /**
   * Generate operation for a webhook node
   */
  private generateOperation(node: any, analysis: WorkflowAnalysis): any {
    const operation: any = {
      summary: node.name,
      description: node.description || `${node.name} webhook endpoint`,
      operationId: node.id,
      tags: [node.category],
    };

    // Parameters
    const params = this.extractParameters(node);
    if (params.length > 0) {
      operation.parameters = params;
    }

    // Request body
    if (node.exampleInput) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/${node.id}Request`,
            },
          },
        },
      };
    }

    // Responses
    operation.responses = {
      '200': {
        description: 'Successful response',
        content: node.exampleOutput
          ? {
              'application/json': {
                schema: {
                  $ref: `#/components/schemas/${node.id}Response`,
                },
              },
            }
          : undefined,
      },
      '400': {
        description: 'Bad request',
      },
      '500': {
        description: 'Internal server error',
      },
    };

    // Security
    if (this.requiresAuth(node)) {
      operation.security = [{ bearerAuth: [] }];
    }

    return operation;
  }

  /**
   * Extract parameters from node config
   */
  private extractParameters(node: any): any[] {
    const params: any[] = [];

    // Check for query parameters in config
    if (node.config.queryParams) {
      Object.entries(node.config.queryParams).forEach(([name, value]: [string, any]) => {
        params.push({
          name,
          in: 'query',
          required: value.required || false,
          schema: {
            type: this.inferType(value.type || 'string'),
          },
          description: value.description,
        });
      });
    }

    // Check for path parameters
    const path = this.getNodePath(node);
    const pathParams = path.match(/\{([^}]+)\}/g);
    if (pathParams) {
      pathParams.forEach((param) => {
        const name = param.slice(1, -1);
        params.push({
          name,
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
        });
      });
    }

    // Check for headers
    if (node.config.headers) {
      Object.entries(node.config.headers).forEach(([name, value]: [string, any]) => {
        if (!name.toLowerCase().startsWith('x-')) return; // Skip standard headers

        params.push({
          name,
          in: 'header',
          required: value.required || false,
          schema: {
            type: 'string',
          },
          description: value.description,
        });
      });
    }

    return params;
  }

  /**
   * Generate schema from example data
   */
  private generateSchemaFromExample(example: any): any {
    if (typeof example !== 'object' || example === null) {
      return {
        type: this.inferType(typeof example),
        example,
      };
    }

    if (Array.isArray(example)) {
      return {
        type: 'array',
        items: example.length > 0 ? this.generateSchemaFromExample(example[0]) : { type: 'object' },
        example,
      };
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    Object.entries(example).forEach(([key, value]) => {
      properties[key] = this.generateSchemaFromExample(value);
      if (value !== null && value !== undefined) {
        required.push(key);
      }
    });

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      example,
    };
  }

  /**
   * Generate security schemes
   */
  private generateSecuritySchemes(analysis: WorkflowAnalysis): Record<string, any> {
    const schemes: Record<string, any> = {};

    // Add common authentication schemes
    schemes.bearerAuth = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    };

    schemes.apiKey = {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    };

    return schemes;
  }

  /**
   * Get path from node config
   */
  private getNodePath(node: any): string {
    return node.config.path || `/webhook/${node.id}`;
  }

  /**
   * Get HTTP method from node config
   */
  private getNodeMethod(node: any): string {
    return (node.config.method || 'POST').toUpperCase();
  }

  /**
   * Check if node requires authentication
   */
  private requiresAuth(node: any): boolean {
    return !!(
      node.config.authentication ||
      node.config.requireAuth ||
      node.config.credentialId
    );
  }

  /**
   * Infer OpenAPI type from value
   */
  private inferType(type: string): string {
    const typeMap: Record<string, string> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      object: 'object',
      array: 'array',
    };

    return typeMap[type.toLowerCase()] || 'string';
  }

  /**
   * Validate OpenAPI spec
   */
  validate(spec: OpenAPISpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!spec.openapi) {
      errors.push('Missing openapi version');
    }
    if (!spec.info?.title) {
      errors.push('Missing info.title');
    }
    if (!spec.info?.version) {
      errors.push('Missing info.version');
    }
    if (!spec.paths || Object.keys(spec.paths).length === 0) {
      errors.push('No paths defined');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default OpenAPIExporter;
