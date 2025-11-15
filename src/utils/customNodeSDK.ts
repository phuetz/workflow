/**
 * Custom Node SDK
 * Framework for building custom workflow nodes with full TypeScript support
 */

export interface NodeDefinition {
  type: string;
  category: string;
  label: string;
  description: string;
  icon?: string;
  color?: string;
  version?: string;
  author?: string;

  inputs: NodeInput[];
  outputs: NodeOutput[];
  settings: NodeSetting[];

  execute: NodeExecuteFunction;
  validate?: NodeValidateFunction;
  onInit?: NodeInitFunction;
  onDestroy?: NodeDestroyFunction;
}

export interface NodeInput {
  name: string;
  type: NodeDataType;
  required?: boolean;
  default?: any;
  description?: string;
  schema?: any; // JSON schema for validation
}

export interface NodeOutput {
  name: string;
  type: NodeDataType;
  description?: string;
}

export type NodeDataType =
  | 'any'
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'binary'
  | 'json'
  | 'xml'
  | 'html'
  | 'csv';

export interface NodeSetting {
  key: string;
  label: string;
  type: SettingType;
  default?: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: (value: any) => boolean | string;
  showIf?: (config: any) => boolean;
  min?: number;
  max?: number;
  step?: number;
  multiple?: boolean;
  accept?: string; // For file inputs
}

export type SettingType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiSelect'
  | 'textarea'
  | 'code'
  | 'json'
  | 'password'
  | 'email'
  | 'url'
  | 'date'
  | 'datetime'
  | 'time'
  | 'color'
  | 'file'
  | 'credential';

export type NodeExecuteFunction = (
  config: any,
  inputs: Record<string, any[]>,
  context: NodeExecutionContext
) => Promise<any[]> | any[];

export type NodeValidateFunction = (config: any) => { valid: boolean; errors?: string[] };

export type NodeInitFunction = (config: any) => Promise<void> | void;

export type NodeDestroyFunction = (config: any) => Promise<void> | void;

export interface NodeExecutionContext {
  nodeId: string;
  workflowId: string;
  executionId: string;
  userId?: string;

  // Workflow data
  workflow: any;
  nodes: Map<string, any>;

  // Execution data
  $json: any;
  $input: any[];
  $node: Record<string, any>;
  $workflow: {
    id: string;
    name: string;
    active: boolean;
  };
  $execution: {
    id: string;
    mode: 'manual' | 'trigger' | 'webhook';
  };
  $env: Record<string, string>;

  // Helper functions
  getNodeOutput: (nodeId: string) => any[];
  getCredential: (credentialName: string) => Promise<any>;
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;

  // Utilities
  helpers: NodeHelpers;
}

export interface NodeHelpers {
  // HTTP requests
  httpRequest: (options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    auth?: {
      type: 'basic' | 'bearer' | 'oauth2';
      username?: string;
      password?: string;
      token?: string;
    };
    timeout?: number;
  }) => Promise<any>;

  // Data transformation
  parseJson: (data: string) => any;
  stringifyJson: (data: any, pretty?: boolean) => string;
  parseXml: (data: string) => any;
  parseCsv: (data: string) => any[];

  // File operations
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, data: string) => Promise<void>;

  // Encoding
  base64Encode: (data: string) => string;
  base64Decode: (data: string) => string;

  // Hashing
  md5: (data: string) => string;
  sha256: (data: string) => string;

  // Utilities
  sleep: (ms: number) => Promise<void>;
  retry: <T>(fn: () => Promise<T>, options?: { retries?: number; delay?: number }) => Promise<T>;
}

class CustomNodeRegistry {
  private nodes: Map<string, NodeDefinition> = new Map();
  private nodeInstances: Map<string, any> = new Map();

  /**
   * Register custom node
   */
  register(node: NodeDefinition): void {
    // Validate node definition
    this.validateNodeDefinition(node);

    this.nodes.set(node.type, node);
    console.log(`Registered custom node: ${node.type}`);
  }

  /**
   * Unregister custom node
   */
  unregister(type: string): void {
    this.nodes.delete(type);
    this.nodeInstances.delete(type);
  }

  /**
   * Get node definition
   */
  getNode(type: string): NodeDefinition | undefined {
    return this.nodes.get(type);
  }

  /**
   * Get all registered nodes
   */
  getAllNodes(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get nodes by category
   */
  getNodesByCategory(category: string): NodeDefinition[] {
    return Array.from(this.nodes.values()).filter(n => n.category === category);
  }

  /**
   * Execute node
   */
  async execute(
    type: string,
    config: any,
    inputs: Record<string, any[]>,
    context: NodeExecutionContext
  ): Promise<any[]> {
    const node = this.nodes.get(type);

    if (!node) {
      throw new Error(`Node type not found: ${type}`);
    }

    // Validate configuration
    if (node.validate) {
      const validation = node.validate(config);
      if (!validation.valid) {
        throw new Error(`Node validation failed: ${validation.errors?.join(', ')}`);
      }
    }

    // Execute node
    try {
      const result = await node.execute(config, inputs, context);

      // Ensure result is array
      if (!Array.isArray(result)) {
        return [result];
      }

      return result;
    } catch (error: any) {
      context.log(`Node execution failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Validate node definition
   */
  private validateNodeDefinition(node: NodeDefinition): void {
    const errors: string[] = [];

    if (!node.type) errors.push('Node type is required');
    if (!node.category) errors.push('Node category is required');
    if (!node.label) errors.push('Node label is required');
    if (!node.execute) errors.push('Node execute function is required');
    if (!node.inputs) errors.push('Node inputs are required');
    if (!node.outputs) errors.push('Node outputs are required');
    if (!node.settings) errors.push('Node settings are required');

    if (errors.length > 0) {
      throw new Error(`Invalid node definition: ${errors.join(', ')}`);
    }
  }

  /**
   * Create node helpers
   */
  createHelpers(): NodeHelpers {
    return {
      httpRequest: async (options) => {
        const response = await fetch(options.url, {
          method: options.method,
          headers: options.headers,
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        return response.json();
      },

      parseJson: (data: string) => JSON.parse(data),
      stringifyJson: (data: any, pretty?: boolean) => JSON.stringify(data, null, pretty ? 2 : 0),

      parseXml: (data: string) => {
        // Simple XML parsing (use library in production)
        return { data };
      },

      parseCsv: (data: string) => {
        // Simple CSV parsing
        const lines = data.split('\n');
        const headers = lines[0].split(',');
        return lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, i) => {
            obj[header] = values[i];
            return obj;
          }, {} as any);
        });
      },

      readFile: async (path: string) => {
        throw new Error('File operations not supported in browser');
      },

      writeFile: async (path: string, data: string) => {
        throw new Error('File operations not supported in browser');
      },

      base64Encode: (data: string) => btoa(data),
      base64Decode: (data: string) => atob(data),

      md5: (data: string) => {
        // Simple hash (use library in production)
        return data;
      },

      sha256: (data: string) => {
        // Simple hash (use library in production)
        return data;
      },

      sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

      retry: async <T>(
        fn: () => Promise<T>,
        options?: { retries?: number; delay?: number }
      ): Promise<T> => {
        const retries = options?.retries || 3;
        const delay = options?.delay || 1000;

        for (let i = 0; i < retries; i++) {
          try {
            return await fn();
          } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          }
        }

        throw new Error('Retry failed');
      }
    };
  }
}

// Singleton instance
export const nodeRegistry = new CustomNodeRegistry();

/**
 * Node builder helper
 */
export class NodeBuilder {
  private node: Partial<NodeDefinition> = {
    inputs: [],
    outputs: [],
    settings: []
  };

  type(type: string): this {
    this.node.type = type;
    return this;
  }

  category(category: string): this {
    this.node.category = category;
    return this;
  }

  label(label: string): this {
    this.node.label = label;
    return this;
  }

  description(description: string): this {
    this.node.description = description;
    return this;
  }

  icon(icon: string): this {
    this.node.icon = icon;
    return this;
  }

  color(color: string): this {
    this.node.color = color;
    return this;
  }

  version(version: string): this {
    this.node.version = version;
    return this;
  }

  author(author: string): this {
    this.node.author = author;
    return this;
  }

  input(input: NodeInput): this {
    this.node.inputs!.push(input);
    return this;
  }

  output(output: NodeOutput): this {
    this.node.outputs!.push(output);
    return this;
  }

  setting(setting: NodeSetting): this {
    this.node.settings!.push(setting);
    return this;
  }

  execute(fn: NodeExecuteFunction): this {
    this.node.execute = fn;
    return this;
  }

  validate(fn: NodeValidateFunction): this {
    this.node.validate = fn;
    return this;
  }

  onInit(fn: NodeInitFunction): this {
    this.node.onInit = fn;
    return this;
  }

  onDestroy(fn: NodeDestroyFunction): this {
    this.node.onDestroy = fn;
    return this;
  }

  build(): NodeDefinition {
    if (!this.node.type || !this.node.category || !this.node.label || !this.node.execute) {
      throw new Error('Missing required node properties');
    }

    return this.node as NodeDefinition;
  }

  register(): NodeDefinition {
    const node = this.build();
    nodeRegistry.register(node);
    return node;
  }
}

/**
 * Example custom nodes
 */
export const ExampleNodes = {
  /**
   * HTTP Request node
   */
  HttpRequest: new NodeBuilder()
    .type('custom.httpRequest')
    .category('Network')
    .label('HTTP Request')
    .description('Make HTTP requests to external APIs')
    .icon('🌐')
    .color('#3b82f6')
    .version('1.0.0')
    .input({ name: 'data', type: 'any', required: false })
    .output({ name: 'response', type: 'json' })
    .setting({
      key: 'method',
      label: 'Method',
      type: 'select',
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' }
      ]
    })
    .setting({
      key: 'url',
      label: 'URL',
      type: 'text',
      required: true,
      placeholder: 'https://api.example.com/endpoint'
    })
    .setting({
      key: 'headers',
      label: 'Headers',
      type: 'json',
      default: '{}',
      placeholder: '{"Content-Type": "application/json"}'
    })
    .execute(async (config, inputs, context) => {
      const response = await context.helpers.httpRequest({
        method: config.method,
        url: config.url,
        headers: JSON.parse(config.headers || '{}'),
        body: inputs.data?.[0]
      });

      return [{ json: response }];
    })
    .build(),

  /**
   * Data Transform node
   */
  DataTransform: new NodeBuilder()
    .type('custom.dataTransform')
    .category('Data')
    .label('Data Transform')
    .description('Transform data with custom JavaScript')
    .icon('🔄')
    .color('#8b5cf6')
    .input({ name: 'input', type: 'any', required: true })
    .output({ name: 'output', type: 'any' })
    .setting({
      key: 'code',
      label: 'Transform Code',
      type: 'code',
      required: true,
      default: 'return input.map(item => ({ ...item, processed: true }));',
      placeholder: 'return input.map(item => item);'
    })
    .execute(async (config, inputs, context) => {
      const input = inputs.input;
      const fn = new Function('input', 'context', config.code);
      const result = fn(input, context);

      return Array.isArray(result) ? result : [result];
    })
    .build(),

  /**
   * Delay node
   */
  Delay: new NodeBuilder()
    .type('custom.delay')
    .category('Flow Control')
    .label('Delay')
    .description('Delay execution for specified time')
    .icon('⏱️')
    .color('#f59e0b')
    .input({ name: 'input', type: 'any', required: true })
    .output({ name: 'output', type: 'any' })
    .setting({
      key: 'duration',
      label: 'Duration (ms)',
      type: 'number',
      default: 1000,
      min: 0,
      step: 100
    })
    .execute(async (config, inputs, context) => {
      await context.helpers.sleep(config.duration);
      return inputs.input;
    })
    .build(),

  /**
   * Filter node
   */
  Filter: new NodeBuilder()
    .type('custom.filter')
    .category('Data')
    .label('Filter')
    .description('Filter items based on condition')
    .icon('🔍')
    .color('#10b981')
    .input({ name: 'input', type: 'array', required: true })
    .output({ name: 'passed', type: 'array' })
    .output({ name: 'failed', type: 'array' })
    .setting({
      key: 'condition',
      label: 'Condition',
      type: 'code',
      required: true,
      default: 'return item.value > 10;',
      placeholder: 'return item.value > 0;'
    })
    .execute(async (config, inputs, context) => {
      const fn = new Function('item', config.condition);
      const passed: any[] = [];
      const failed: any[] = [];

      for (const item of inputs.input) {
        if (fn(item)) {
          passed.push(item);
        } else {
          failed.push(item);
        }
      }

      return [{ json: { passed, failed } }];
    })
    .build()
};

/**
 * Register example nodes
 */
export function registerExampleNodes(): void {
  Object.values(ExampleNodes).forEach(node => {
    nodeRegistry.register(node);
  });
}
