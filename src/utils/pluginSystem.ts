/**
 * Plugin System
 * Extensible plugin architecture for custom functionality
 */

import type { Node, Edge } from 'reactflow';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  hooks?: PluginHooks;
  nodeTypes?: CustomNodeType[];
  settings?: PluginSettings;
}

export interface PluginHooks {
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onWorkflowLoad?: (workflow: any) => void | Promise<void>;
  onWorkflowSave?: (workflow: any) => any | Promise<any>;
  onWorkflowExecute?: (workflow: any, context: any) => void | Promise<void>;
  onNodeExecute?: (node: Node, input: any) => any | Promise<any>;
  onError?: (error: Error, context: any) => void;
}

export interface CustomNodeType {
  type: string;
  category: string;
  label: string;
  icon?: string;
  color?: string;
  inputs?: NodePort[];
  outputs?: NodePort[];
  settings?: NodeSetting[];
  execute?: (config: any, input: any) => any | Promise<any>;
}

export interface NodePort {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
}

export interface NodeSetting {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea';
  default?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: (value: any) => boolean | string;
}

export interface PluginSettings {
  [key: string]: {
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    default: any;
    value?: any;
  };
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private nodeTypes: Map<string, CustomNodeType> = new Map();

  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    // Validate plugin
    if (!plugin.id || !plugin.name || !plugin.version) {
      throw new Error('Invalid plugin: missing required fields');
    }

    // Check if already registered
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    // Register custom node types
    if (plugin.nodeTypes) {
      for (const nodeType of plugin.nodeTypes) {
        this.nodeTypes.set(nodeType.type, nodeType);
      }
    }

    // Store plugin
    this.plugins.set(plugin.id, plugin);

    // Call onLoad hook
    if (plugin.enabled && plugin.hooks?.onLoad) {
      try {
        await plugin.hooks.onLoad();
      } catch (error) {
        console.error(`Error loading plugin ${plugin.id}:`, error);
        plugin.enabled = false;
      }
    }

    this.savePlugins();
  }

  /**
   * Unregister a plugin
   */
  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Call onUnload hook
    if (plugin.hooks?.onUnload) {
      try {
        await plugin.hooks.onUnload();
      } catch (error) {
        console.error(`Error unloading plugin ${pluginId}:`, error);
      }
    }

    // Remove custom node types
    if (plugin.nodeTypes) {
      for (const nodeType of plugin.nodeTypes) {
        this.nodeTypes.delete(nodeType.type);
      }
    }

    this.plugins.delete(pluginId);
    this.savePlugins();
  }

  /**
   * Enable/disable plugin
   */
  async toggle(pluginId: string, enabled?: boolean): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    const newState = enabled ?? !plugin.enabled;

    if (newState && !plugin.enabled) {
      // Enabling
      if (plugin.hooks?.onLoad) {
        await plugin.hooks.onLoad();
      }
    } else if (!newState && plugin.enabled) {
      // Disabling
      if (plugin.hooks?.onUnload) {
        await plugin.hooks.onUnload();
      }
    }

    plugin.enabled = newState;
    this.savePlugins();
  }

  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): Plugin[] {
    return this.getAll().filter(p => p.enabled);
  }

  /**
   * Get plugin by ID
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get custom node types
   */
  getCustomNodeTypes(): CustomNodeType[] {
    return Array.from(this.nodeTypes.values());
  }

  /**
   * Execute workflow hook
   */
  async executeHook<T extends keyof PluginHooks>(
    hookName: T,
    ...args: Parameters<NonNullable<PluginHooks[T]>>
  ): Promise<void> {
    for (const plugin of this.getEnabled()) {
      const hook = plugin.hooks?.[hookName];
      if (hook) {
        try {
          await (hook as any)(...args);
        } catch (error) {
          console.error(`Error in plugin ${plugin.id} hook ${hookName}:`, error);
          if (plugin.hooks?.onError) {
            plugin.hooks.onError(error as Error, { hook: hookName, args });
          }
        }
      }
    }
  }

  /**
   * Update plugin setting
   */
  updateSetting(pluginId: string, key: string, value: any): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.settings || !plugin.settings[key]) return;

    plugin.settings[key].value = value;
    this.savePlugins();
  }

  /**
   * Load plugins from storage
   */
  loadPlugins(): void {
    try {
      const saved = localStorage.getItem('plugins');
      if (saved) {
        const pluginsData = JSON.parse(saved);
        for (const data of pluginsData) {
          this.plugins.set(data.id, data);
        }
      }
    } catch (error) {
      console.error('Failed to load plugins:', error);
    }
  }

  /**
   * Save plugins to storage
   */
  private savePlugins(): void {
    try {
      const pluginsData = Array.from(this.plugins.values());
      localStorage.setItem('plugins', JSON.stringify(pluginsData));
    } catch (error) {
      console.error('Failed to save plugins:', error);
    }
  }

  /**
   * Import plugin from URL
   */
  async installFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const pluginCode = await response.text();

      // Security: In production, validate and sandbox plugin code
      const pluginModule = new Function('return ' + pluginCode)();
      await this.register(pluginModule);
    } catch (error) {
      throw new Error(`Failed to install plugin from ${url}: ${error}`);
    }
  }

  /**
   * Export plugin
   */
  export(pluginId: string): string {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error('Plugin not found');

    return JSON.stringify(plugin, null, 2);
  }
}

// Singleton instance
export const pluginManager = new PluginManager();

/**
 * Example plugins
 */
export const examplePlugins: Plugin[] = [
  {
    id: 'hello-world',
    name: 'Hello World Plugin',
    version: '1.0.0',
    description: 'A simple example plugin',
    author: 'WorkflowBuilder Team',
    enabled: false,
    hooks: {
      onLoad: () => {
        console.log('Hello World plugin loaded!');
      },
      onWorkflowExecute: (workflow) => {
        console.log('Workflow executing:', workflow.name);
      }
    }
  },
  {
    id: 'custom-logger',
    name: 'Custom Logger',
    version: '1.0.0',
    description: 'Log workflow events to external service',
    author: 'WorkflowBuilder Team',
    enabled: false,
    hooks: {
      onNodeExecute: async (node, input) => {
        console.log(`Node ${node.id} executed with input:`, input);
        // Send to logging service
      },
      onError: (error, context) => {
        console.error('Workflow error:', error, context);
      }
    },
    settings: {
      apiKey: {
        label: 'API Key',
        type: 'text',
        default: ''
      },
      endpoint: {
        label: 'Logging Endpoint',
        type: 'text',
        default: 'https://logs.example.com'
      }
    }
  },
  {
    id: 'custom-nodes',
    name: 'Custom Node Pack',
    version: '1.0.0',
    description: 'Additional custom nodes',
    author: 'WorkflowBuilder Team',
    enabled: false,
    nodeTypes: [
      {
        type: 'customMath',
        category: 'Transform',
        label: 'Math Operation',
        icon: '🔢',
        color: '#10b981',
        inputs: [
          { name: 'a', type: 'number', required: true },
          { name: 'b', type: 'number', required: true }
        ],
        outputs: [{ name: 'result', type: 'number' }],
        settings: [
          {
            key: 'operation',
            label: 'Operation',
            type: 'select',
            default: 'add',
            options: [
              { label: 'Add', value: 'add' },
              { label: 'Subtract', value: 'subtract' },
              { label: 'Multiply', value: 'multiply' },
              { label: 'Divide', value: 'divide' }
            ]
          }
        ],
        execute: async (config, input) => {
          const { a, b } = input;
          const { operation } = config;

          switch (operation) {
            case 'add':
              return { result: a + b };
            case 'subtract':
              return { result: a - b };
            case 'multiply':
              return { result: a * b };
            case 'divide':
              return { result: a / b };
            default:
              throw new Error('Invalid operation');
          }
        }
      }
    ]
  }
];

/**
 * Load default plugins
 */
export function loadDefaultPlugins() {
  pluginManager.loadPlugins();

  // Register example plugins if not already registered
  for (const plugin of examplePlugins) {
    if (!pluginManager.get(plugin.id)) {
      pluginManager.register(plugin).catch(console.error);
    }
  }
}
