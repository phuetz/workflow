/**
 * GraphQL Importer
 * Import GraphQL schema and generate nodes
 */

import {
  GraphQLSchema,
  GraphQLOperation,
  GraphQLType,
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

export class GraphQLImporter {
  private schema: GraphQLSchema | string;
  private parsedSchema: GraphQLSchema | null = null;

  constructor(schema: GraphQLSchema | string) {
    this.schema = schema;
    this.parseSchema();
  }

  /**
   * Parse GraphQL schema
   */
  private parseSchema(): void {
    if (typeof this.schema === 'string') {
      try {
        // If it's a JSON string with pre-parsed structure
        this.parsedSchema = JSON.parse(this.schema);
      } catch {
        // If it's a raw GraphQL schema string, parse it
        this.parsedSchema = this.parseGraphQLSchemaString(this.schema);
      }
    } else {
      this.parsedSchema = this.schema;
    }

    if (!this.parsedSchema) {
      throw new Error('Failed to parse GraphQL schema');
    }
  }

  /**
   * Parse raw GraphQL schema string
   * This is a simplified parser for demo purposes
   */
  private parseGraphQLSchemaString(schemaString: string): GraphQLSchema {
    const queries: GraphQLOperation[] = [];
    const mutations: GraphQLOperation[] = [];
    const types: GraphQLType[] = [];

    // Extract queries
    const queryMatch = schemaString.match(/type Query \{([^}]+)\}/);
    if (queryMatch) {
      const queryFields = this.extractFields(queryMatch[1]);
      queries.push(...queryFields.map((f) => this.fieldToOperation(f, 'query')));
    }

    // Extract mutations
    const mutationMatch = schemaString.match(/type Mutation \{([^}]+)\}/);
    if (mutationMatch) {
      const mutationFields = this.extractFields(mutationMatch[1]);
      mutations.push(...mutationFields.map((f) => this.fieldToOperation(f, 'mutation')));
    }

    return {
      schema: schemaString,
      queries,
      mutations,
      subscriptions: [],
      types,
    };
  }

  /**
   * Extract fields from GraphQL type definition
   */
  private extractFields(typeBody: string): any[] {
    const fields: any[] = [];
    const lines = typeBody.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const match = line.match(/(\w+)(\([^)]*\))?\s*:\s*(.+)/);
      if (match) {
        const [, name, args, returnType] = match;
        fields.push({
          name,
          arguments: args ? this.parseArguments(args) : [],
          returnType: returnType.trim(),
        });
      }
    }

    return fields;
  }

  /**
   * Parse GraphQL arguments
   */
  private parseArguments(argsString: string): any[] {
    const args: any[] = [];
    const argsBody = argsString.replace(/[()]/g, '');

    argsBody.split(',').forEach((arg) => {
      const match = arg.trim().match(/(\w+)\s*:\s*(.+)/);
      if (match) {
        const [, name, type] = match;
        const required = type.endsWith('!');
        args.push({
          name,
          type: type.replace('!', ''),
          required,
        });
      }
    });

    return args;
  }

  /**
   * Convert field to GraphQL operation
   */
  private fieldToOperation(field: any, operationType: 'query' | 'mutation'): GraphQLOperation {
    return {
      name: field.name,
      description: '',
      arguments: field.arguments.map((arg: any) => ({
        name: arg.name,
        type: arg.type,
        description: '',
        required: arg.required || false,
      })),
      returnType: field.returnType,
    };
  }

  /**
   * Import and generate node configuration
   */
  async import(config: {
    name: string;
    endpoint: string;
    authType?: 'apiKey' | 'bearer' | 'oauth2';
  }): Promise<NodeBuilder> {
    if (!this.parsedSchema) {
      throw new Error('Schema not parsed');
    }

    const builder = new NodeBuilder();

    // Set basic info
    builder.setBasicInfo({
      name: this.sanitizeName(config.name),
      displayName: config.name,
      description: `GraphQL client for ${config.name}`,
      category: NodeCategory.ACTION,
      icon: 'Database',
      color: 'bg-pink-500',
      author: 'GraphQL Import',
    });

    // Add authentication if specified
    if (config.authType) {
      const auth = this.createAuth(config.authType, config.name);
      builder.setAuthentication(auth);
    }

    // Extract operations from queries
    if (this.parsedSchema.queries) {
      this.parsedSchema.queries.forEach((query) => {
        const operation = this.convertQueryToOperation(query, config.endpoint);
        builder.addOperation(operation);
      });
    }

    // Extract operations from mutations
    if (this.parsedSchema.mutations) {
      this.parsedSchema.mutations.forEach((mutation) => {
        const operation = this.convertMutationToOperation(mutation, config.endpoint);
        builder.addOperation(operation);
      });
    }

    // Add GraphQL tag
    builder.addTags(['graphql', this.sanitizeName(config.name)]);

    return builder;
  }

  /**
   * Create authentication configuration
   */
  private createAuth(authType: 'apiKey' | 'bearer' | 'oauth2', name: string): AuthenticationConfig {
    switch (authType) {
      case 'apiKey':
        return {
          type: AuthType.API_KEY,
          name: `${name} API`,
          description: 'API Key authentication',
          fields: [
            {
              name: 'apiKey',
              displayName: 'API Key',
              type: FieldType.PASSWORD,
              required: true,
              description: 'Your API key',
              placeholder: 'Enter your API key',
              headerName: 'X-API-Key',
            },
          ],
        };

      case 'bearer':
        return {
          type: AuthType.BEARER_TOKEN,
          name: `${name} API`,
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

      case 'oauth2':
        return {
          type: AuthType.OAUTH2,
          name: `${name} API`,
          description: 'OAuth2 authentication',
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
   * Convert GraphQL query to operation definition
   */
  private convertQueryToOperation(
    query: GraphQLOperation,
    endpoint: string
  ): OperationDefinition {
    const parameters = this.convertGraphQLArguments(query.arguments || []);

    return {
      id: `query_${query.name}`,
      name: query.name,
      displayName: this.toDisplayName(query.name),
      description: query.description || `GraphQL query: ${query.name}`,
      httpConfig: {
        method: HttpMethod.POST,
        endpoint,
        headers: [
          { name: 'Content-Type', value: 'application/json', dynamic: false },
        ],
        bodyType: BodyType.JSON,
        bodyTemplate: this.generateQueryTemplate(query),
      },
      parameters,
      responseHandling: {
        dataPath: 'data',
        errorPath: 'errors',
        successCondition: {
          type: 'status_code',
          statusCodes: [200],
        },
      },
    };
  }

  /**
   * Convert GraphQL mutation to operation definition
   */
  private convertMutationToOperation(
    mutation: GraphQLOperation,
    endpoint: string
  ): OperationDefinition {
    const parameters = this.convertGraphQLArguments(mutation.arguments || []);

    return {
      id: `mutation_${mutation.name}`,
      name: mutation.name,
      displayName: this.toDisplayName(mutation.name),
      description: mutation.description || `GraphQL mutation: ${mutation.name}`,
      httpConfig: {
        method: HttpMethod.POST,
        endpoint,
        headers: [
          { name: 'Content-Type', value: 'application/json', dynamic: false },
        ],
        bodyType: BodyType.JSON,
        bodyTemplate: this.generateMutationTemplate(mutation),
      },
      parameters,
      responseHandling: {
        dataPath: 'data',
        errorPath: 'errors',
        successCondition: {
          type: 'status_code',
          statusCodes: [200],
        },
      },
    };
  }

  /**
   * Convert GraphQL arguments to parameters
   */
  private convertGraphQLArguments(args: any[]): ParameterDefinition[] {
    return args.map((arg) => ({
      id: `param_${arg.name}`,
      name: arg.name,
      displayName: this.toDisplayName(arg.name),
      type: this.mapGraphQLTypeToFieldType(arg.type),
      required: arg.required || false,
      description: arg.description || `Argument: ${arg.name}`,
      default: arg.defaultValue,
    }));
  }

  /**
   * Map GraphQL type to FieldType
   */
  private mapGraphQLTypeToFieldType(graphqlType: string): FieldType {
    const baseType = graphqlType.replace(/[!\[\]]/g, '');

    switch (baseType) {
      case 'String':
      case 'ID':
        return FieldType.STRING;
      case 'Int':
      case 'Float':
        return FieldType.NUMBER;
      case 'Boolean':
        return FieldType.BOOLEAN;
      default:
        if (graphqlType.includes('[')) {
          return FieldType.MULTI_SELECT;
        }
        return FieldType.JSON;
    }
  }

  /**
   * Generate GraphQL query template
   */
  private generateQueryTemplate(query: GraphQLOperation): string {
    const args = query.arguments || [];
    const argsList = args.map((arg) => `$${arg.name}: ${arg.type}`).join(', ');
    const argsUsage = args.map((arg) => `${arg.name}: $${arg.name}`).join(', ');

    return JSON.stringify({
      query: `query ${query.name}${argsList ? `(${argsList})` : ''} {
  ${query.name}${argsUsage ? `(${argsUsage})` : ''} {
    # Add fields here
  }
}`,
      variables: args.reduce((acc, arg) => {
        acc[arg.name] = `{{$node.parameter.${arg.name}}}`;
        return acc;
      }, {} as Record<string, string>),
    });
  }

  /**
   * Generate GraphQL mutation template
   */
  private generateMutationTemplate(mutation: GraphQLOperation): string {
    const args = mutation.arguments || [];
    const argsList = args.map((arg) => `$${arg.name}: ${arg.type}`).join(', ');
    const argsUsage = args.map((arg) => `${arg.name}: $${arg.name}`).join(', ');

    return JSON.stringify({
      query: `mutation ${mutation.name}${argsList ? `(${argsList})` : ''} {
  ${mutation.name}${argsUsage ? `(${argsUsage})` : ''} {
    # Add fields here
  }
}`,
      variables: args.reduce((acc, arg) => {
        acc[arg.name] = `{{$node.parameter.${arg.name}}}`;
        return acc;
      }, {} as Record<string, string>),
    });
  }

  /**
   * Convert name to display format
   */
  private toDisplayName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
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
    totalQueries: number;
    totalMutations: number;
    totalSubscriptions: number;
    totalParameters: number;
  } {
    if (!this.parsedSchema) {
      return {
        totalQueries: 0,
        totalMutations: 0,
        totalSubscriptions: 0,
        totalParameters: 0,
      };
    }

    const queries = this.parsedSchema.queries || [];
    const mutations = this.parsedSchema.mutations || [];
    const subscriptions = this.parsedSchema.subscriptions || [];

    const totalParameters =
      queries.reduce((sum, q) => sum + (q.arguments?.length || 0), 0) +
      mutations.reduce((sum, m) => sum + (m.arguments?.length || 0), 0) +
      subscriptions.reduce((sum, s) => sum + (s.arguments?.length || 0), 0);

    return {
      totalQueries: queries.length,
      totalMutations: mutations.length,
      totalSubscriptions: subscriptions.length,
      totalParameters,
    };
  }
}
