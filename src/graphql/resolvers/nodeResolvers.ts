/**
 * Node Type GraphQL Resolvers
 * Provides node type catalog and metadata
 */

import type {
  NodeType as GraphQLNodeType,
  NodeFilter,
  NodeCategoryInfo,
  GraphQLContext
} from '../types/graphql';
import { NodeCategory } from '../types/graphql';
import type { NodeType as DataNodeType } from '../../types/workflow';
import { nodeTypes as nodeTypesRegistry } from '../../data/nodeTypes';

/**
 * Custom error classes for GraphQL
 */
class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class UserInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserInputError';
  }
}

/**
 * Convert category string to NodeCategory enum
 */
function normalizeCategory(category: string): NodeCategory {
  const categoryMap: Record<string, NodeCategory> = {
    'trigger': NodeCategory.TRIGGER,
    'action': NodeCategory.ACTION,
    'transform': NodeCategory.TRANSFORM,
    'control': NodeCategory.CONTROL,
    'database': NodeCategory.DATABASE,
    'communication': NodeCategory.COMMUNICATION,
    'cloud': NodeCategory.CLOUD,
    'ai': NodeCategory.AI,
    'analytics': NodeCategory.ANALYTICS,
    'integration': NodeCategory.INTEGRATION,
    'utility': NodeCategory.UTILITY
  };

  return categoryMap[category.toLowerCase()] || NodeCategory.UTILITY;
}

/**
 * Convert nodeTypes Record to Array
 */
const nodeTypesArray: DataNodeType[] = Object.values(nodeTypesRegistry);

/**
 * Query resolvers
 */
export const nodeQueries = {
  /**
   * Get a single node type by type identifier
   */
  nodeType: async (
    _parent: unknown,
    { type }: { type: string },
    context: GraphQLContext
  ): Promise<GraphQLNodeType | null> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const nodeType = nodeTypesArray.find(nt => nt.type === type);

    if (!nodeType) {
      return null;
    }

    return formatNodeType(nodeType);
  },

  /**
   * Get all node types with optional filtering
   */
  nodeTypes: async (
    _parent: unknown,
    { filter }: { filter?: NodeFilter },
    context: GraphQLContext
  ): Promise<GraphQLNodeType[]> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    let nodes = [...nodeTypesArray];

    // Apply filters
    if (filter) {
      if (filter.category) {
        nodes = nodes.filter(n => n.category === filter.category);
      }

      if (filter.tags && filter.tags.length > 0) {
        // Tags are not available in DataNodeType, skip this filter
        // nodes = nodes.filter(n =>
        //   filter.tags!.some(tag => n.tags?.includes(tag))
        // );
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        nodes = nodes.filter(n =>
          n.label.toLowerCase().includes(searchLower) ||
          n.description?.toLowerCase().includes(searchLower) ||
          n.type.toLowerCase().includes(searchLower)
        );
      }

      if (filter.deprecated !== undefined) {
        // Deprecated flag not available in DataNodeType, skip this filter
        // nodes = nodes.filter(n => n.deprecated === filter.deprecated);
      }
    }

    return nodes.map(formatNodeType);
  },

  /**
   * Get node categories with metadata
   */
  nodeCategories: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<NodeCategoryInfo[]> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    const categories = new Map<NodeCategory, NodeCategoryInfo>();

    // Count nodes by category
    for (const node of nodeTypesArray) {
      const category = normalizeCategory(node.category);
      const existing = categories.get(category);

      if (existing) {
        existing.count++;
      } else {
        categories.set(category, {
          category,
          displayName: getCategoryDisplayName(category),
          description: getCategoryDescription(category),
          count: 1,
          icon: getCategoryIcon(category)
        });
      }
    }

    return Array.from(categories.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  },

  /**
   * Get count of node types
   */
  nodeTypesCount: async (
    _parent: unknown,
    { filter }: { filter?: NodeFilter },
    context: GraphQLContext
  ): Promise<number> => {
    if (!context.user) {
      throw new AuthenticationError('Authentication required');
    }

    // Use the nodeTypes resolver and count results
    const nodes = await nodeQueries.nodeTypes(_parent, { filter }, context);
    return nodes.length;
  }
};

/**
 * Field resolvers
 */
export const nodeFieldResolvers = {
  NodeType: {
    /**
     * Resolve inputs with proper formatting
     */
    inputs: (nodeType: GraphQLNodeType) => {
      return nodeType.inputs || [];
    },

    /**
     * Resolve outputs with proper formatting
     */
    outputs: (nodeType: GraphQLNodeType) => {
      return nodeType.outputs || [];
    },

    /**
     * Resolve credentials requirements
     */
    credentials: (nodeType: GraphQLNodeType) => {
      return nodeType.credentials || [];
    },

    /**
     * Resolve properties
     */
    properties: (nodeType: GraphQLNodeType) => {
      return nodeType.properties || [];
    },

    /**
     * Resolve examples
     */
    examples: (nodeType: GraphQLNodeType) => {
      return nodeType.examples || [];
    },

    /**
     * Resolve tags
     */
    tags: (nodeType: GraphQLNodeType) => {
      return nodeType.tags || [];
    },

    /**
     * Resolve deprecated flag
     */
    deprecated: (nodeType: GraphQLNodeType) => {
      return nodeType.deprecated || false;
    }
  }
};

/**
 * Helper functions
 */

function formatNodeType(node: DataNodeType): GraphQLNodeType {
  // Get node data with proper defaults
  const inputs = (node as any).inputs || [];
  const outputs = (node as any).outputs || [];
  const credentials = (node as any).credentials || [];
  const properties = (node as any).properties || [];
  const documentation = (node as any).documentation;
  const examples = (node as any).examples || [];
  const deprecated = (node as any).deprecated || false;
  const deprecationMessage = (node as any).deprecationMessage;
  const tags = (node as any).tags || [];

  return {
    type: node.type,
    name: node.label,
    category: normalizeCategory(node.category),
    description: node.description || '',
    icon: node.icon,
    color: node.color,
    version: '1.0.0',
    inputs: formatInputs(inputs),
    outputs: formatOutputs(outputs),
    credentials: formatCredentials(credentials),
    properties: formatProperties(properties),
    documentation,
    examples,
    deprecated,
    deprecationMessage,
    tags
  };
}

function formatInputs(inputs: any[]): any[] {
  return inputs.map(input => ({
    name: input.name,
    type: input.type || 'STRING',
    displayName: input.displayName || input.name,
    description: input.description,
    required: input.required || false,
    default: input.default,
    options: input.options,
    validation: input.validation,
    placeholder: input.placeholder,
    hint: input.hint
  }));
}

function formatOutputs(outputs: any[]): any[] {
  return outputs.map(output => ({
    name: output.name,
    type: output.type || 'JSON',
    displayName: output.displayName || output.name,
    description: output.description,
    schema: output.schema
  }));
}

function formatCredentials(credentials: any[]): any[] {
  return credentials.map(cred => ({
    type: cred.type,
    displayName: cred.displayName || cred.type,
    required: cred.required || false,
    description: cred.description,
    documentationUrl: cred.documentationUrl
  }));
}

function formatProperties(properties: any[]): any[] {
  return properties.map(prop => ({
    name: prop.name,
    type: prop.type || 'STRING',
    displayName: prop.displayName || prop.name,
    description: prop.description,
    required: prop.required || false,
    default: prop.default,
    options: prop.options,
    validation: prop.validation,
    displayOptions: prop.displayOptions
  }));
}

function getCategoryDisplayName(category: NodeCategory): string {
  const names: Record<NodeCategory, string> = {
    TRIGGER: 'Triggers',
    ACTION: 'Actions',
    TRANSFORM: 'Data Transform',
    CONTROL: 'Flow Control',
    DATABASE: 'Databases',
    COMMUNICATION: 'Communication',
    CLOUD: 'Cloud Services',
    AI: 'AI & Machine Learning',
    ANALYTICS: 'Analytics',
    INTEGRATION: 'Integrations',
    UTILITY: 'Utilities'
  };

  return names[category] || category;
}

function getCategoryDescription(category: NodeCategory): string {
  const descriptions: Record<NodeCategory, string> = {
    TRIGGER: 'Start workflows based on events, schedules, or webhooks',
    ACTION: 'Perform actions like sending emails, making API calls, or updating records',
    TRANSFORM: 'Transform, filter, and manipulate data flowing through workflows',
    CONTROL: 'Control workflow execution with conditions, loops, and branches',
    DATABASE: 'Connect to databases and perform CRUD operations',
    COMMUNICATION: 'Send messages via email, SMS, chat platforms, and more',
    CLOUD: 'Interact with cloud services like AWS, Azure, and Google Cloud',
    AI: 'Leverage AI models for text generation, image processing, and predictions',
    ANALYTICS: 'Analyze data and generate insights',
    INTEGRATION: 'Integrate with third-party services and APIs',
    UTILITY: 'Utility nodes for common operations'
  };

  return descriptions[category] || '';
}

function getCategoryIcon(category: NodeCategory): string {
  const icons: Record<NodeCategory, string> = {
    TRIGGER: '⚡',
    ACTION: '🎯',
    TRANSFORM: '🔄',
    CONTROL: '🔀',
    DATABASE: '💾',
    COMMUNICATION: '💬',
    CLOUD: '☁️',
    AI: '🤖',
    ANALYTICS: '📊',
    INTEGRATION: '🔌',
    UTILITY: '🔧'
  };

  return icons[category] || '📦';
}

export const nodeResolvers = {
  Query: nodeQueries,
  ...nodeFieldResolvers
};
