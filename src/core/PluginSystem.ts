/**
 * Plugin System and Marketplace
 * Extensible plugin architecture with marketplace integration
 */

import { EventEmitter } from 'events';
import { NodeType, WorkflowNode } from '../types/workflow';
import { logger } from '../services/SimpleLogger';
import crypto from 'crypto';
import vm from 'vm';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: PluginCategory;
  tags: string[];
  icon?: string;
  homepage?: string;
  repository?: string;
  license: string;
  price: number; // 0 for free
  currency?: string;
  rating: number;
  downloads: number;
  reviews: Review[];
  dependencies?: PluginDependency[];
  compatibility: {
    minVersion: string;
    maxVersion?: string;
    platforms?: string[];
  };
  permissions: PluginPermission[];
  config?: PluginConfig;
  manifest: PluginManifest;
  installed: boolean;
  enabled: boolean;
  installedVersion?: string;
  installedAt?: Date;
  updatedAt?: Date;
  signature?: string; // Digital signature for verification
}

export interface PluginManifest {
  entry: string; // Main entry point
  nodes?: CustomNodeDefinition[];
  triggers?: TriggerDefinition[];
  actions?: ActionDefinition[];
  integrations?: IntegrationDefinition[];
  ui?: UIComponentDefinition[];
  api?: APIEndpointDefinition[];
  hooks?: HookDefinition[];
  assets?: AssetDefinition[];
  locales?: LocaleDefinition[];
}

export interface CustomNodeDefinition {
  type: string;
  label: string;
  category: string;
  icon?: string;
  color?: string;
  inputs: number;
  outputs: number;
  properties?: any;
  executor: string; // Code or reference to executor
}

export interface TriggerDefinition {
  id: string;
  name: string;
  description: string;
  config: any;
  handler: string;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
  handler: string;
}

export interface IntegrationDefinition {
  id: string;
  name: string;
  type: string;
  config: any;
  authenticate: string;
  actions: string[];
}

export interface UIComponentDefinition {
  id: string;
  type: 'widget' | 'panel' | 'modal' | 'page';
  location: string;
  component: string;
}

export interface APIEndpointDefinition {
  path: string;
  method: string;
  handler: string;
  middleware?: string[];
}

export interface HookDefinition {
  event: string;
  handler: string;
  priority?: number;
}

export interface AssetDefinition {
  type: 'script' | 'style' | 'image' | 'font';
  path: string;
  url?: string;
}

export interface LocaleDefinition {
  language: string;
  translations: Record<string, string>;
}

export interface PluginDependency {
  id: string;
  version: string;
  optional?: boolean;
}

export interface PluginPermission {
  resource: string;
  actions: string[];
  reason?: string;
}

export interface PluginConfig {
  settings?: Record<string, any>;
  secrets?: string[];
  environment?: Record<string, string>;
}

export type PluginCategory = 
  | 'integration'
  | 'automation'
  | 'analytics'
  | 'security'
  | 'communication'
  | 'data'
  | 'developer'
  | 'productivity'
  | 'ai'
  | 'utility';

export interface Review {
  id: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  createdAt: Date;
  helpful: number;
  verified: boolean;
}

export interface PluginSandbox {
  id: string;
  pluginId: string;
  context: vm.Context;
  globals: any;
  permissions: Set<string>;
  resourceUsage: {
    cpu: number;
    memory: number;
    apiCalls: number;
  };
}

export interface MarketplaceFilters {
  category?: PluginCategory;
  tags?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  compatibility?: string;
  search?: string;
  sort?: 'popular' | 'recent' | 'rating' | 'price';
}

export interface PluginUpdateInfo {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
  breaking: boolean;
  required: boolean;
}

export class PluginSystem extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private installedPlugins: Map<string, Plugin> = new Map();
  private sandboxes: Map<string, PluginSandbox> = new Map();
  private hooks: Map<string, Set<{ pluginId: string; handler: Function; priority: number }>> = new Map();
  private customNodes: Map<string, CustomNodeDefinition> = new Map();
  private marketplaceCache: Map<string, { data: any; expires: number }> = new Map();
  private pluginInstances: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeMarketplace();
  }

  /**
   * Initialize marketplace connection
   */
  private async initializeMarketplace(): Promise<void> {
    // Load featured plugins
    await this.loadFeaturedPlugins();
    
    // Start update checker
    this.startUpdateChecker();
  }

  /**
   * Search plugins in marketplace
   */
  async searchMarketplace(filters: MarketplaceFilters): Promise<Plugin[]> {
    const cacheKey = JSON.stringify(filters);
    const cached = this.marketplaceCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    // Simulate marketplace API call
    let results = Array.from(this.plugins.values());

    // Apply filters
    if (filters.category) {
      results = results.filter(p => p.category === filters.category);
    }

    if (filters.tags?.length) {
      results = results.filter(p => 
        filters.tags!.some(tag => p.tags.includes(tag))
      );
    }

    if (filters.priceRange) {
      results = results.filter(p => 
        p.price >= filters.priceRange!.min && 
        p.price <= filters.priceRange!.max
      );
    }

    if (filters.rating) {
      results = results.filter(p => p.rating >= filters.rating!);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      results = results.filter(p => 
        p.name.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
      );
    }

    // Sort results
    switch (filters.sort) {
      case 'popular':
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'recent':
        results.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'price':
        results.sort((a, b) => a.price - b.price);
        break;
    }

    // Cache results
    this.marketplaceCache.set(cacheKey, {
      data: results,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    return results;
  }

  /**
   * Install plugin
   */
  async installPlugin(pluginId: string, options?: {
    version?: string;
    autoEnable?: boolean;
  }): Promise<Plugin> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.installed) {
      throw new Error(`Plugin ${pluginId} is already installed`);
    }

    // Check dependencies
    await this.checkDependencies(plugin);

    // Check permissions
    await this.requestPermissions(plugin);

    // Download plugin code (simulated)
    const pluginCode = await this.downloadPlugin(plugin);

    // Verify signature
    if (plugin.signature) {
      this.verifyPluginSignature(plugin, pluginCode);
    }

    // Create sandbox
    const sandbox = this.createSandbox(plugin);

    // Load plugin
    await this.loadPlugin(plugin, pluginCode, sandbox);

    // Mark as installed
    plugin.installed = true;
    plugin.installedVersion = plugin.version;
    plugin.installedAt = new Date();
    plugin.enabled = options?.autoEnable !== false;

    // Store installed plugin
    this.installedPlugins.set(pluginId, plugin);

    // Register components
    if (plugin.enabled) {
      await this.registerPluginComponents(plugin);
    }

    // Emit event
    this.emit('plugin-installed', plugin);

    logger.info(`Plugin installed: ${plugin.name} v${plugin.version}`);

    return plugin;
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    const plugin = this.installedPlugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    // Disable plugin first
    if (plugin.enabled) {
      await this.disablePlugin(pluginId);
    }

    // Unregister components
    await this.unregisterPluginComponents(plugin);

    // Destroy sandbox
    const sandbox = this.sandboxes.get(pluginId);
    if (sandbox) {
      this.destroySandbox(sandbox);
    }

    // Remove plugin instance
    this.pluginInstances.delete(pluginId);

    // Mark as uninstalled
    plugin.installed = false;
    plugin.installedVersion = undefined;
    plugin.installedAt = undefined;

    // Remove from installed plugins
    this.installedPlugins.delete(pluginId);

    // Emit event
    this.emit('plugin-uninstalled', plugin);

    logger.info(`Plugin uninstalled: ${plugin.name}`);
  }

  /**
   * Enable plugin
   */
  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.installedPlugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    if (plugin.enabled) {
      return;
    }

    // Register components
    await this.registerPluginComponents(plugin);

    plugin.enabled = true;

    // Call plugin enable hook
    await this.callPluginMethod(pluginId, 'onEnable');

    this.emit('plugin-enabled', plugin);

    logger.info(`Plugin enabled: ${plugin.name}`);
  }

  /**
   * Disable plugin
   */
  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.installedPlugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    if (!plugin.enabled) {
      return;
    }

    // Call plugin disable hook
    await this.callPluginMethod(pluginId, 'onDisable');

    // Unregister components
    await this.unregisterPluginComponents(plugin);

    plugin.enabled = false;

    this.emit('plugin-disabled', plugin);

    logger.info(`Plugin disabled: ${plugin.name}`);
  }

  /**
   * Update plugin
   */
  async updatePlugin(pluginId: string): Promise<Plugin> {
    const installed = this.installedPlugins.get(pluginId);
    
    if (!installed) {
      throw new Error(`Plugin ${pluginId} is not installed`);
    }

    const latest = this.plugins.get(pluginId);
    
    if (!latest) {
      throw new Error(`Plugin ${pluginId} not found in marketplace`);
    }

    if (installed.installedVersion === latest.version) {
      throw new Error(`Plugin ${pluginId} is already up to date`);
    }

    // Backup current plugin
    const backup = { ...installed };

    try {
      // Uninstall current version
      await this.uninstallPlugin(pluginId);

      // Install new version
      const updated = await this.installPlugin(pluginId, {
        version: latest.version,
        autoEnable: backup.enabled
      });

      this.emit('plugin-updated', {
        plugin: updated,
        oldVersion: backup.installedVersion,
        newVersion: latest.version
      });

      logger.info(`Plugin updated: ${updated.name} ${backup.installedVersion} -> ${latest.version}`);

      return updated;
    } catch (error) {
      // Restore backup on failure
      logger.error(`Failed to update plugin ${pluginId}:`, error);
      
      // Try to restore previous version
      await this.installPlugin(pluginId, {
        version: backup.installedVersion,
        autoEnable: backup.enabled
      });
      
      throw error;
    }
  }

  /**
   * Create plugin sandbox
   */
  private createSandbox(plugin: Plugin): PluginSandbox {
    // Create restricted context
    const sandbox: PluginSandbox = {
      id: `sandbox_${plugin.id}`,
      pluginId: plugin.id,
      context: vm.createContext({
        // Allowed globals
        console: {
          log: (...args: any[]) => logger.info(`[Plugin ${plugin.name}]`, ...args),
          error: (...args: any[]) => logger.error(`[Plugin ${plugin.name}]`, ...args),
          warn: (...args: any[]) => logger.warn(`[Plugin ${plugin.name}]`, ...args)
        },
        setTimeout: (fn: Function, delay: number) => setTimeout(() => this.executeSandboxed(sandbox, fn), delay),
        setInterval: (fn: Function, interval: number) => setInterval(() => this.executeSandboxed(sandbox, fn), interval),
        Promise,
        JSON,
        Math,
        Date,
        // Plugin API
        workflow: this.createPluginAPI(plugin),
        // Limited Node.js APIs
        Buffer: Buffer,
        process: {
          env: {},
          version: process.version
        }
      }),
      globals: {},
      permissions: new Set(plugin.permissions.map(p => `${p.resource}:${p.actions.join(',')}`)),
      resourceUsage: {
        cpu: 0,
        memory: 0,
        apiCalls: 0
      }
    };

    this.sandboxes.set(plugin.id, sandbox);
    
    return sandbox;
  }

  /**
   * Create plugin API
   */
  private createPluginAPI(plugin: Plugin): any {
    return {
      // Node registration
      registerNode: (definition: CustomNodeDefinition) => {
        this.registerCustomNode(plugin.id, definition);
      },
      
      // Hook registration
      on: (event: string, handler: Function, priority = 10) => {
        this.registerHook(plugin.id, event, handler, priority);
      },
      
      // Storage API
      storage: {
        get: (key: string) => this.getPluginStorage(plugin.id, key),
        set: (key: string, value: any) => this.setPluginStorage(plugin.id, key, value),
        delete: (key: string) => this.deletePluginStorage(plugin.id, key)
      },
      
      // Settings API
      settings: {
        get: (key: string) => plugin.config?.settings?.[key],
        set: (key: string, value: any) => {
          if (!plugin.config) plugin.config = { settings: {} };
          if (!plugin.config.settings) plugin.config.settings = {};
          plugin.config.settings[key] = value;
        }
      },
      
      // HTTP API (restricted)
      http: {
        get: (url: string) => this.makeHttpRequest(plugin.id, 'GET', url),
        post: (url: string, data: any) => this.makeHttpRequest(plugin.id, 'POST', url, data)
      }
    };
  }

  /**
   * Load plugin code
   */
  private async loadPlugin(plugin: Plugin, code: string, sandbox: PluginSandbox): Promise<void> {
    try {
      // Create plugin script
      const script = new vm.Script(code, {
        filename: `${plugin.id}.js`,
        lineOffset: 0,
        columnOffset: 0
      });

      // Run in sandbox
      const pluginExports = script.runInContext(sandbox.context);

      // Store plugin instance
      this.pluginInstances.set(plugin.id, pluginExports);

      // Call plugin init
      if (pluginExports.init) {
        await pluginExports.init();
      }
    } catch (error) {
      throw new Error(`Failed to load plugin ${plugin.name}: ${(error as Error).message}`);
    }
  }

  /**
   * Register plugin components
   */
  private async registerPluginComponents(plugin: Plugin): Promise<void> {
    const manifest = plugin.manifest;

    // Register custom nodes
    if (manifest.nodes) {
      for (const node of manifest.nodes) {
        this.registerCustomNode(plugin.id, node);
      }
    }

    // Register triggers
    if (manifest.triggers) {
      for (const trigger of manifest.triggers) {
        this.registerTrigger(plugin.id, trigger);
      }
    }

    // Register actions
    if (manifest.actions) {
      for (const action of manifest.actions) {
        this.registerAction(plugin.id, action);
      }
    }

    // Register hooks
    if (manifest.hooks) {
      for (const hook of manifest.hooks) {
        const handler = this.getPluginHandler(plugin.id, hook.handler);
        this.registerHook(plugin.id, hook.event, handler, hook.priority);
      }
    }
  }

  /**
   * Unregister plugin components
   */
  private async unregisterPluginComponents(plugin: Plugin): Promise<void> {
    // Unregister custom nodes
    for (const [key, node] of this.customNodes.entries()) {
      if (key.startsWith(`${plugin.id}:`)) {
        this.customNodes.delete(key);
      }
    }

    // Unregister hooks
    for (const [event, hooks] of this.hooks.entries()) {
      const filtered = Array.from(hooks).filter(h => h.pluginId !== plugin.id);
      if (filtered.length > 0) {
        this.hooks.set(event, new Set(filtered));
      } else {
        this.hooks.delete(event);
      }
    }
  }

  /**
   * Register custom node
   */
  private registerCustomNode(pluginId: string, definition: CustomNodeDefinition): void {
    const key = `${pluginId}:${definition.type}`;
    this.customNodes.set(key, definition);
    
    this.emit('custom-node-registered', {
      pluginId,
      nodeType: definition.type
    });
  }

  /**
   * Register trigger
   */
  private registerTrigger(pluginId: string, trigger: TriggerDefinition): void {
    // Implementation for trigger registration
    this.emit('trigger-registered', {
      pluginId,
      triggerId: trigger.id
    });
  }

  /**
   * Register action
   */
  private registerAction(pluginId: string, action: ActionDefinition): void {
    // Implementation for action registration
    this.emit('action-registered', {
      pluginId,
      actionId: action.id
    });
  }

  /**
   * Register hook
   */
  private registerHook(pluginId: string, event: string, handler: Function, priority = 10): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, new Set());
    }
    
    this.hooks.get(event)!.add({
      pluginId,
      handler,
      priority
    });
  }

  /**
   * Execute hooks
   */
  async executeHooks(event: string, data?: any): Promise<any> {
    const hooks = this.hooks.get(event);
    
    if (!hooks || hooks.size === 0) {
      return data;
    }

    // Sort by priority
    const sorted = Array.from(hooks).sort((a, b) => b.priority - a.priority);

    let result = data;
    
    for (const hook of sorted) {
      try {
        const plugin = this.installedPlugins.get(hook.pluginId);
        
        if (plugin?.enabled) {
          result = await hook.handler(result);
        }
      } catch (error) {
        logger.error(`Hook execution failed for plugin ${hook.pluginId}:`, error);
      }
    }

    return result;
  }

  /**
   * Execute custom node
   */
  async executeCustomNode(node: WorkflowNode): Promise<any> {
    const [pluginId, nodeType] = node.type.split(':');
    const definition = this.customNodes.get(node.type);
    
    if (!definition) {
      throw new Error(`Custom node ${node.type} not found`);
    }

    const plugin = this.installedPlugins.get(pluginId);
    
    if (!plugin?.enabled) {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }

    // Get executor
    const executor = this.getPluginHandler(pluginId, definition.executor);
    
    // Execute in sandbox
    const sandbox = this.sandboxes.get(pluginId);
    
    if (!sandbox) {
      throw new Error(`Sandbox not found for plugin ${pluginId}`);
    }

    return await this.executeSandboxed(sandbox, executor, node);
  }

  /**
   * Execute code in sandbox
   */
  private async executeSandboxed(sandbox: PluginSandbox, fn: Function, ...args: any[]): Promise<any> {
    // Track resource usage
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Execute with timeout
      const result = await Promise.race([
        fn(...args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Plugin execution timeout')), 30000)
        )
      ]);

      // Update resource usage
      sandbox.resourceUsage.cpu += Date.now() - startTime;
      sandbox.resourceUsage.memory = Math.max(
        sandbox.resourceUsage.memory,
        process.memoryUsage().heapUsed - startMemory
      );

      return result;
    } catch (error) {
      throw new Error(`Sandbox execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get plugin handler
   */
  private getPluginHandler(pluginId: string, handlerName: string): Function {
    const instance = this.pluginInstances.get(pluginId);
    
    if (!instance) {
      throw new Error(`Plugin instance not found: ${pluginId}`);
    }

    const handler = instance[handlerName];
    
    if (typeof handler !== 'function') {
      throw new Error(`Handler ${handlerName} not found in plugin ${pluginId}`);
    }

    return handler;
  }

  /**
   * Call plugin method
   */
  private async callPluginMethod(pluginId: string, method: string, ...args: any[]): Promise<any> {
    try {
      const handler = this.getPluginHandler(pluginId, method);
      const sandbox = this.sandboxes.get(pluginId);
      
      if (!sandbox) {
        throw new Error(`Sandbox not found for plugin ${pluginId}`);
      }

      return await this.executeSandboxed(sandbox, handler, ...args);
    } catch (error) {
      // Method might not exist, ignore
      logger.debug(`Plugin method ${method} not found or failed: ${error}`);
    }
  }

  /**
   * Check plugin dependencies
   */
  private async checkDependencies(plugin: Plugin): Promise<void> {
    if (!plugin.dependencies?.length) {
      return;
    }

    for (const dep of plugin.dependencies) {
      const installed = this.installedPlugins.get(dep.id);
      
      if (!installed && !dep.optional) {
        throw new Error(`Required dependency ${dep.id} is not installed`);
      }
      
      if (installed && !this.isVersionCompatible(installed.version, dep.version)) {
        throw new Error(`Dependency ${dep.id} version ${dep.version} is required`);
      }
    }
  }

  /**
   * Request plugin permissions
   */
  private async requestPermissions(plugin: Plugin): Promise<void> {
    // In production, would show permission dialog to user
    logger.info(`Plugin ${plugin.name} requests permissions:`, plugin.permissions);
    
    // Auto-approve for now
    return Promise.resolve();
  }

  /**
   * Download plugin code
   */
  private async downloadPlugin(plugin: Plugin): Promise<string> {
    // In production, would download from CDN or registry
    // For now, return mock plugin code
    return `
      module.exports = {
        init: function() {
          console.log('Plugin ${plugin.name} initialized');
        },
        onEnable: function() {
          console.log('Plugin ${plugin.name} enabled');
        },
        onDisable: function() {
          console.log('Plugin ${plugin.name} disabled');
        }
      };
    `;
  }

  /**
   * Verify plugin signature
   */
  private verifyPluginSignature(plugin: Plugin, code: string): void {
    // In production, would verify digital signature
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    
    if (plugin.signature && plugin.signature !== hash) {
      throw new Error('Plugin signature verification failed');
    }
  }

  /**
   * Destroy sandbox
   */
  private destroySandbox(sandbox: PluginSandbox): void {
    // Clean up sandbox resources
    this.sandboxes.delete(sandbox.pluginId);
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(installed: string, required: string): boolean {
    // Simple version comparison
    return installed >= required;
  }

  /**
   * Load featured plugins
   */
  private async loadFeaturedPlugins(): Promise<void> {
    // Load some example plugins
    const examplePlugins: Plugin[] = [
      {
        id: 'slack-advanced',
        name: 'Slack Advanced',
        version: '2.0.0',
        author: 'Community',
        description: 'Advanced Slack integration with threading and reactions',
        category: 'communication',
        tags: ['slack', 'messaging', 'notifications'],
        license: 'MIT',
        price: 0,
        rating: 4.8,
        downloads: 15000,
        reviews: [],
        compatibility: {
          minVersion: '2.0.0'
        },
        permissions: [
          { resource: 'network', actions: ['fetch'], reason: 'To communicate with Slack API' }
        ],
        manifest: {
          entry: 'index.js',
          nodes: [
            {
              type: 'slack-thread',
              label: 'Slack Thread',
              category: 'communication',
              inputs: 1,
              outputs: 1,
              executor: 'executeSlackThread'
            }
          ]
        },
        installed: false,
        enabled: false
      },
      {
        id: 'ai-assistant',
        name: 'AI Assistant Pro',
        version: '1.5.0',
        author: 'AI Labs',
        description: 'Advanced AI capabilities with GPT-4 and Claude integration',
        category: 'ai',
        tags: ['ai', 'gpt', 'claude', 'automation'],
        license: 'Commercial',
        price: 29.99,
        currency: 'USD',
        rating: 4.9,
        downloads: 8500,
        reviews: [],
        compatibility: {
          minVersion: '2.0.0'
        },
        permissions: [
          { resource: 'network', actions: ['fetch'], reason: 'To connect to AI services' },
          { resource: 'storage', actions: ['read', 'write'], reason: 'To cache AI responses' }
        ],
        manifest: {
          entry: 'index.js',
          nodes: [
            {
              type: 'ai-generate',
              label: 'AI Generate',
              category: 'ai',
              inputs: 1,
              outputs: 2,
              executor: 'executeAIGenerate'
            }
          ]
        },
        installed: false,
        enabled: false
      }
    ];

    for (const plugin of examplePlugins) {
      this.plugins.set(plugin.id, plugin);
    }
  }

  /**
   * Start update checker
   */
  private startUpdateChecker(): void {
    setInterval(() => {
      this.checkForUpdates();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Check for plugin updates
   */
  private async checkForUpdates(): Promise<PluginUpdateInfo[]> {
    const updates: PluginUpdateInfo[] = [];

    for (const [id, installed] of this.installedPlugins.entries()) {
      const latest = this.plugins.get(id);
      
      if (latest && installed.installedVersion !== latest.version) {
        updates.push({
          pluginId: id,
          currentVersion: installed.installedVersion!,
          latestVersion: latest.version,
          changelog: 'Bug fixes and improvements',
          breaking: false,
          required: false
        });
      }
    }

    if (updates.length > 0) {
      this.emit('updates-available', updates);
    }

    return updates;
  }

  /**
   * Plugin storage methods
   */
  private pluginStorage: Map<string, Map<string, any>> = new Map();

  private getPluginStorage(pluginId: string, key: string): any {
    const storage = this.pluginStorage.get(pluginId);
    return storage?.get(key);
  }

  private setPluginStorage(pluginId: string, key: string, value: any): void {
    if (!this.pluginStorage.has(pluginId)) {
      this.pluginStorage.set(pluginId, new Map());
    }
    this.pluginStorage.get(pluginId)!.set(key, value);
  }

  private deletePluginStorage(pluginId: string, key: string): void {
    this.pluginStorage.get(pluginId)?.delete(key);
  }

  /**
   * Make HTTP request for plugin
   */
  private async makeHttpRequest(pluginId: string, method: string, url: string, data?: any): Promise<any> {
    const sandbox = this.sandboxes.get(pluginId);
    
    if (!sandbox) {
      throw new Error('Plugin sandbox not found');
    }

    // Check permissions
    if (!sandbox.permissions.has('network:fetch')) {
      throw new Error('Plugin does not have network permission');
    }

    // Track API calls
    sandbox.resourceUsage.apiCalls++;

    // Make request (with restrictions)
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Plugin-ID': pluginId
      },
      body: data ? JSON.stringify(data) : undefined
    });

    return response.json();
  }

  /**
   * Get installed plugins
   */
  getInstalledPlugins(): Plugin[] {
    return Array.from(this.installedPlugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): any {
    return {
      totalPlugins: this.plugins.size,
      installedPlugins: this.installedPlugins.size,
      enabledPlugins: Array.from(this.installedPlugins.values()).filter(p => p.enabled).length,
      customNodes: this.customNodes.size,
      registeredHooks: this.hooks.size,
      activeSandboxes: this.sandboxes.size
    };
  }
}

// Export singleton instance
export const pluginSystem = new PluginSystem();