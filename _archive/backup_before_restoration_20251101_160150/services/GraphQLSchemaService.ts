import { logger } from './LoggingService';
/**
 * GraphQL Schema Service
 * Real schema introspection and management for GraphQL operations
 */

export interface GraphQLSchemaField {
  name: string;
  type: string;
  description: string;
  args?: GraphQLSchemaArgument[];
  fields?: GraphQLSchemaField[];
  selected: boolean;
  isDeprecated?: boolean;
  deprecationReason?: string;
}

export interface GraphQLSchemaArgument {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  value?: unknown;
  description?: string;
}

export interface GraphQLSchemaType {
  name: string;
  kind: string;
  description?: string;
  fields: GraphQLSchemaField[];
  inputFields?: GraphQLSchemaField[];
  possibleTypes?: string[];
  enumValues?: Array<{
    name: string;
    description?: string;
    isDeprecated?: boolean;
  }>;
}

export interface GraphQLIntrospectionResult {
  types: { [key: string]: GraphQLSchemaField[] };
  directives: Array<{
    name: string;
    description?: string;
    locations: string[];
    args: GraphQLSchemaArgument[];
  }>;
  queryType?: string;
  mutationType?: string;
  subscriptionType?: string;
}

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class GraphQLSchemaService {
  private schemaCache: Map<string, GraphQLIntrospectionResult> = new Map();
  private executionCache: Map<string, unknown> = new Map();

  // Introspection query for fetching schema
  private readonly introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
        types {
          ...FullType
        }
        directives {
          name
          description
          locations
          args {
            ...InputValue
          }
        }
      }
    }

    fragment FullType on __Type {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          ...InputValue
        }
        type {
          ...TypeRef
        }
        isDeprecated
        deprecationReason
      }
      inputFields {
        ...InputValue
      }
      interfaces {
        ...TypeRef
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes {
        ...TypeRef
      }
    }

    fragment InputValue on __InputValue {
      name
      description
      type { ...TypeRef }
      defaultValue
    }

    fragment TypeRef on __Type {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // Fetch schema from URL
  async fetchSchemaFromUrl(url: string, headers: Record<string, string> = {}): Promise<GraphQLIntrospectionResult> {
    try {
      // Check cache first
      if (cached) {
        return cached;
      }

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          query: this.introspectionQuery
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      
      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL errors: ${result.errors.map((e: unknown) => e.message).join(', ')}`);
      }

      if (!result.data || !result.data.__schema) {
        throw new Error('Invalid introspection response: missing schema data');
      }

      
      // Cache the result
      this.schemaCache.set(url, introspection);
      
      return introspection;
    } catch (error) {
      logger.error('Schema fetch error:', error);
      throw new Error(`Failed to fetch schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get schema from GraphQL service
  async getSchemaFromService(): Promise<GraphQLIntrospectionResult> {
    try {
      // Import GraphQL service dynamically to avoid circular dependencies
      const { _GraphQLService } = await import('./GraphQLService');
      
      // Create mock services for the GraphQL service (in real app, these would be injected)
        rbac: null as unknown,
        secrets: null as unknown,
        llm: null as unknown,
        marketplace: null as unknown,
        plugins: null as unknown
      };

        mockServices.rbac,
        mockServices.secrets,
        mockServices.llm,
        mockServices.marketplace,
        mockServices.plugins
      );

      
      if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL errors: ${result.errors.map((e: unknown) => e.message).join(', ')}`);
      }

      return this.processIntrospectionResult(result.data.__schema);
    } catch (error) {
      logger.error('Service schema error:', error);
      throw new Error(`Failed to get service schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process raw introspection result
  private processIntrospectionResult(schema: unknown): GraphQLIntrospectionResult {
    const types: { [key: string]: GraphQLSchemaField[] } = {};

    // Process types
    if (schema.types) {
      schema.types.forEach((type: unknown) => {
        if (type.name.startsWith('__')) return; // Skip introspection types

        if (type.kind === 'OBJECT' && type.fields) {
          
          // Add root types to the main types object
          if (type.name === schema.queryType?.name || 
              type.name === schema.mutationType?.name || 
              type.name === schema.subscriptionType?.name) {
            types[type.name] = fields;
          }
        }
      });
    }

    // Process directives
    if (schema.directives) {
      schema.directives.forEach((directive: unknown) => {
        directives.push({
          name: directive.name,
          description: directive.description,
          locations: directive.locations || [],
          args: directive.args ? directive.args.map((arg: unknown) => this.processArgument(arg)) : []
        });
      });
    }

    // Ensure we have at least Query
    if (!types.Query && schema.queryType) {
      types.Query = this.getTypeFields(schema, schema.queryType.name);
    }

    // Add Mutation if it exists
    if (schema.mutationType && !types.Mutation) {
      types.Mutation = this.getTypeFields(schema, schema.mutationType.name);
    }

    // Add Subscription if it exists
    if (schema.subscriptionType && !types.Subscription) {
      types.Subscription = this.getTypeFields(schema, schema.subscriptionType.name);
    }

    return {
      types,
      directives,
      queryType: schema.queryType?.name,
      mutationType: schema.mutationType?.name,
      subscriptionType: schema.subscriptionType?.name
    };
  }

  private getTypeFields(schema: unknown, typeName: string): GraphQLSchemaField[] {
    if (!type || !type.fields) return [];

    return type.fields.map((field: unknown) => this.processField(field));
  }

  private processField(field: unknown): GraphQLSchemaField {
    return {
      name: field.name,
      type: this.formatType(field.type),
      description: field.description || '',
      args: field.args ? field.args.map((arg: unknown) => this.processArgument(arg)) : [],
      fields: this.getFieldSubfields(field),
      selected: false,
      isDeprecated: field.isDeprecated || false,
      deprecationReason: field.deprecationReason
    };
  }

  private processArgument(arg: unknown): GraphQLSchemaArgument {
    return {
      name: arg.name,
      type: this.formatType(arg.type),
      required: arg.type.kind === 'NON_NULL',
      defaultValue: arg.defaultValue,
      description: arg.description
    };
  }

  private formatType(type: unknown): string {
    if (!type) return 'Unknown';

    if (type.kind === 'NON_NULL') {
      return this.formatType(type.ofType) + '!';
    }

    if (type.kind === 'LIST') {
      return '[' + this.formatType(type.ofType) + ']';
    }

    return type.name || 'Unknown';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getFieldSubfields(field: unknown): GraphQLSchemaField[] | undefined {
    // This would require more complex type resolution
    // For now, return undefined as subfields need the full type system
    return undefined;
  }

  // Execute GraphQL query
  async executeQuery(
    url: string, 
    query: string, 
    variables?: unknown, 
    headers: Record<string, string> = {}
  ): Promise<unknown> {
    try {
      
      // Check execution cache
      if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
        return cached.result;
      }

        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      
      // Cache successful results
      if (!result.errors || result.errors.length === 0) {
        this.executionCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      logger.error('Query execution error:', error);
      throw new Error(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate GraphQL query
  validateQuery(query: string, schema?: GraphQLIntrospectionResult): SchemaValidationResult {
    const result: SchemaValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    try {
      // Basic syntax validation
      if (!query.trim()) {
        result.errors.push('Query cannot be empty');
        result.isValid = false;
        return result;
      }

      // Check for basic GraphQL syntax
      if (!['query', 'mutation', 'subscription', '{'].includes(queryType)) {
        result.errors.push('Query must start with query, mutation, subscription, or {');
        result.isValid = false;
      }

      // Check for balanced braces
      if (openBraces !== closeBraces) {
        result.errors.push('Unbalanced braces in query');
        result.isValid = false;
      }

      // Schema-based validation
      if (schema && result.isValid) {
        // Basic field validation (simplified)
                        queryType === 'subscription' ? 'Subscription' : 'Query';
        
        if (schema.types[rootType]) {
          
          queryFields.forEach(field => {
            if (!availableFields.includes(field)) {
              result.warnings.push(`Field '${field}' may not exist in ${rootType} type`);
            }
          });
        }
      }

      // Performance suggestions
      if (query.length > 5000) {
        result.suggestions.push('Consider breaking down large queries for better performance');
      }

      if (fieldCount > 50) {
        result.suggestions.push('Query has many fields. Consider using fragments to reduce complexity');
      }

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.isValid = false;
    }

    return result;
  }

  private extractFieldsFromQuery(query: string): string[] {
    // Simple field extraction (could be improved with proper parsing)
    return fieldMatches.filter(field => 
      !['query', 'mutation', 'subscription'].includes(field.toLowerCase())
    );
  }

  // Schema comparison and diff
  compareSchemas(schema1: GraphQLIntrospectionResult, schema2: GraphQLIntrospectionResult): {
    added: string[];
    removed: string[];
    modified: string[];
    compatible: boolean;
  } {
      added: [] as string[],
      removed: [] as string[],
      modified: [] as string[],
      compatible: true
    };

    // Compare types

    result.added = types2.filter(type => !types1.includes(type));
    result.removed = types1.filter(type => !types2.includes(type));

    // Check for breaking changes
    if (result.removed.length > 0) {
      result.compatible = false;
    }

    // Check for field changes in existing types
    types1.forEach(typeName => {
      if (types2.includes(typeName)) {
        
        
        if (removedFields.length > 0 || addedFields.length > 0) {
          result.modified.push(`${typeName}: ${removedFields.length} fields removed, ${addedFields.length} fields added`);
        }

        if (removedFields.length > 0) {
          result.compatible = false;
        }
      }
    });

    return result;
  }

  // Generate sample queries
  generateSampleQueries(schema: GraphQLIntrospectionResult): Array<{
    name: string;
    description: string;
    query: string;
    type: 'query' | 'mutation' | 'subscription';
  }> {
    const samples: Array<{
      name: string;
      description: string;
      query: string;
      type: 'query' | 'mutation' | 'subscription';
    }> = [];

    // Generate query samples
    if (schema.types.Query) {
      schema.types.Query.slice(0, 3).forEach(field => {
          ? `(${field.args.map(arg => `${arg.name}: ${this.getDefaultValue(arg.type)}`).join(', ')})`
          : '';
        
        samples.push({
          name: `Get ${field.name}`,
          description: field.description || `Fetch ${field.name} data`,
          query: `query {\n  ${field.name}${args} {\n    # Add fields here\n  }\n}`,
          type: 'query'
        });
      });
    }

    // Generate mutation samples
    if (schema.types.Mutation) {
      schema.types.Mutation.slice(0, 2).forEach(field => {
        samples.push({
          name: `Execute ${field.name}`,
          description: field.description || `Execute ${field.name} mutation`,
          query: `mutation {\n  ${field.name} {\n    # Add fields here\n  }\n}`,
          type: 'mutation'
        });
      });
    }

    // Generate subscription samples
    if (schema.types.Subscription) {
      schema.types.Subscription.slice(0, 1).forEach(field => {
        samples.push({
          name: `Subscribe to ${field.name}`,
          description: field.description || `Subscribe to ${field.name} updates`,
          query: `subscription {\n  ${field.name} {\n    # Add fields here\n  }\n}`,
          type: 'subscription'
        });
      });
    }

    return samples;
  }

  private getDefaultValue(type: string): string {
    if (type.includes('String')) return '"example"';
    if (type.includes('Int')) return '1';
    if (type.includes('Float')) return '1.0';
    if (type.includes('Boolean')) return 'true';
    if (type.includes('ID')) return '"1"';
    return '""';
  }

  // Clear caches
  clearCache(): void {
    this.schemaCache.clear();
    this.executionCache.clear();
  }

  // Get popular GraphQL endpoints for examples
  getPopularEndpoints(): Array<{
    name: string;
    url: string;
    description: string;
    requiresAuth: boolean;
    authType?: string;
  }> {
    return [
      {
        name: 'GitHub API',
        url: 'https://api.github.com/graphql',
        description: 'GitHub GraphQL API for repositories, users, and more',
        requiresAuth: true,
        authType: 'Bearer token'
      },
      {
        name: 'SpaceX API',
        url: 'https://api.spacex.land/graphql',
        description: 'SpaceX missions, rockets, and launch data',
        requiresAuth: false
      },
      {
        name: 'Rick and Morty API',
        url: 'https://rickandmortyapi.com/graphql',
        description: 'Characters, episodes, and locations from Rick and Morty',
        requiresAuth: false
      },
      {
        name: 'Countries API',
        url: 'https://countries.trevorblades.com',
        description: 'World countries with details and statistics',
        requiresAuth: false
      },
      {
        name: 'GraphQL Jobs',
        url: 'https://api.graphql.jobs',
        description: 'GraphQL job listings and companies',
        requiresAuth: false
      }
    ];
  }

  // Create demo schema for testing
  createDemoSchema(): GraphQLIntrospectionResult {
    return {
      types: {
        Query: [
          {
            name: 'user',
            type: 'User',
            description: 'Get user by ID',
            selected: false,
            args: [
              { name: 'id', type: 'ID!', required: true, description: 'User ID' }
            ]
          },
          {
            name: 'users',
            type: '[User]',
            description: 'Get all users with pagination',
            selected: false,
            args: [
              { name: 'limit', type: 'Int', required: false, defaultValue: 10, description: 'Number of users to return' },
              { name: 'offset', type: 'Int', required: false, defaultValue: 0, description: 'Offset for pagination' }
            ]
          },
          {
            name: 'workflows',
            type: '[Workflow]',
            description: 'Get workflows for current user',
            selected: false,
            args: [
              { name: 'status', type: 'WorkflowStatus', required: false, description: 'Filter by status' }
            ]
          }
        ],
        Mutation: [
          {
            name: 'createUser',
            type: 'User',
            description: 'Create a new user',
            selected: false,
            args: [
              { name: 'input', type: 'CreateUserInput!', required: true, description: 'User creation input' }
            ]
          },
          {
            name: 'executeWorkflow',
            type: 'WorkflowExecution',
            description: 'Execute a workflow',
            selected: false,
            args: [
              { name: 'workflowId', type: 'ID!', required: true, description: 'Workflow to execute' },
              { name: 'input', type: 'JSON', required: false, description: 'Input parameters' }
            ]
          }
        ],
        Subscription: [
          {
            name: 'workflowExecutionUpdates',
            type: 'WorkflowExecution',
            description: 'Subscribe to workflow execution updates',
            selected: false,
            args: [
              { name: 'workflowId', type: 'ID!', required: true, description: 'Workflow to monitor' }
            ]
          }
        ]
      },
      directives: [
        {
          name: 'deprecated',
          description: 'Marks an element as deprecated',
          locations: ['FIELD_DEFINITION', 'ENUM_VALUE'],
          args: [
            { name: 'reason', type: 'String', required: false, description: 'Reason for deprecation' }
          ]
        }
      ],
      queryType: 'Query',
      mutationType: 'Mutation',
      subscriptionType: 'Subscription'
    };
  }
}

// Singleton instance
export const graphqlSchemaService = new GraphQLSchemaService();