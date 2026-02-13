/**
 * PluginManager - Manages plugin lifecycle, loading, and execution
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { PluginSandbox } from './PluginSandbox';
import { logger } from '../services/SimpleLogger';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];

  // Workflow-specific
  nodes: string[];
  credentials?: string[];
  permissions?: PluginPermissions;
  dependencies?: Record<string, string>;

  // File locations
  main: string;
  types?: string;
  icon?: string;

  // Metadata
  n8n?: {
    nodes?: string[];
    credentials?: string[];
  };

  // Runtime
  minEngineVersion?: string;
  maxEngineVersion?: string;
}

export interface PluginPermissions {
  network?: NetworkPermission[];
  filesystem?: FilesystemPermission;
  environment?: boolean;
  subprocess?: boolean;
  database?: boolean;
}

export interface NetworkPermission {
  host?: string;
  port?: number;
  protocol?: 'http' | 'https' | 'ws' | 'wss';
}

export interface FilesystemPermission {
  read?: string[];
  write?: string[];
  readWrite?: string[];
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  path: string;
  nodes: Map<string, any>;
  credentials: Map<string, any>;
  sandbox?: PluginSandbox;
  loadedAt: Date;
  enabled: boolean;
  version: string;
}

export interface PluginLoadOptions {
  enableSandbox?: boolean;
  validatePermissions?: boolean;
  hotReload?: boolean;
  timeout?: number;
}

/**
 * PluginManager - Central manager for all plugins
 */
export class PluginManager extends EventEmitter {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private pluginPaths: Map<string, string> = new Map();
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private readonly pluginDirectory: string;
  private readonly defaultOptions: PluginLoadOptions = {
    enableSandbox: true,
    validatePermissions: true,
    hotReload: false,
    timeout: 30000,
  };

  constructor(pluginDirectory?: string) {
    super();
    this.pluginDirectory = pluginDirectory || path.join(process.cwd(), 'plugins');
    this.ensurePluginDirectory();
  }

  /**
   * Ensure plugin directory exists
   */
  private ensurePluginDirectory(): void {
    if (!fs.existsSync(this.pluginDirectory)) {
      fs.mkdirSync(this.pluginDirectory, { recursive: true });
      logger.info(`Created plugin directory: ${this.pluginDirectory}`);
    }
  }

  /**
   * Load all plugins from directory
   */
  async loadAllPlugins(options?: PluginLoadOptions): Promise<void> {
    logger.info('Loading all plugins from directory...');

    const entries = fs.readdirSync(this.pluginDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(this.pluginDirectory, entry.name);
        try {
          await this.loadPlugin(pluginPath, options);
        } catch (error: any) {
          logger.error(`Failed to load plugin from ${pluginPath}:`, error);
          this.emit('plugin:load:error', { path: pluginPath, error });
        }
      }
    }

    logger.info(`Loaded ${this.plugins.size} plugins`);
    this.emit('plugins:loaded', { count: this.plugins.size });
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(pluginPath: string, options?: PluginLoadOptions): Promise<LoadedPlugin> {
    const opts = { ...this.defaultOptions, ...options };

    logger.info(`Loading plugin from: ${pluginPath}`);

    // Read manifest
    const manifest = await this.readManifest(pluginPath);

    // Check if already loaded
    if (this.plugins.has(manifest.name)) {
      logger.warn(`Plugin ${manifest.name} is already loaded`);
      return this.plugins.get(manifest.name)!;
    }

    // Validate permissions
    if (opts.validatePermissions && manifest.permissions) {
      this.validatePermissions(manifest.permissions);
    }

    // Validate engine version
    this.validateEngineVersion(manifest);

    // Create plugin instance
    const plugin: LoadedPlugin = {
      manifest,
      path: pluginPath,
      nodes: new Map(),
      credentials: new Map(),
      loadedAt: new Date(),
      enabled: true,
      version: manifest.version,
    };

    // Load nodes and credentials
    await this.loadPluginNodes(plugin, opts);
    await this.loadPluginCredentials(plugin, opts);

    // Setup sandbox if enabled
    if (opts.enableSandbox) {
      plugin.sandbox = new PluginSandbox({
        permissions: manifest.permissions,
        timeout: opts.timeout,
      });
    }

    // Store plugin
    this.plugins.set(manifest.name, plugin);
    this.pluginPaths.set(manifest.name, pluginPath);

    // Setup hot reload if enabled
    if (opts.hotReload) {
      this.setupHotReload(manifest.name, pluginPath);
    }

    logger.info(`Successfully loaded plugin: ${manifest.name} v${manifest.version}`);
    this.emit('plugin:loaded', { name: manifest.name, version: manifest.version });

    return plugin;
  }

  /**
   * Read plugin manifest
   */
  private async readManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'workflow.json');

    if (!fs.existsSync(manifestPath)) {
      // Fallback to package.json
      const packagePath = path.join(pluginPath, 'package.json');
      if (!fs.existsSync(packagePath)) {
        throw new Error(`No manifest found at ${pluginPath}`);
      }

      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
      return this.convertPackageJsonToManifest(packageJson);
    }

    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(manifestContent);
  }

  /**
   * Convert package.json to plugin manifest
   */
  private convertPackageJsonToManifest(packageJson: any): PluginManifest {
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description || '',
      author: packageJson.author,
      license: packageJson.license,
      homepage: packageJson.homepage,
      repository: typeof packageJson.repository === 'string'
        ? packageJson.repository
        : packageJson.repository?.url,
      keywords: packageJson.keywords,
      nodes: packageJson.n8n?.nodes || [],
      credentials: packageJson.n8n?.credentials || [],
      permissions: packageJson.permissions,
      dependencies: packageJson.dependencies,
      main: packageJson.main || 'index.js',
      types: packageJson.types,
      n8n: packageJson.n8n,
    };
  }

  /**
   * Load plugin nodes
   */
  private async loadPluginNodes(plugin: LoadedPlugin, options: PluginLoadOptions): Promise<void> {
    const mainPath = path.join(plugin.path, plugin.manifest.main);

    if (!fs.existsSync(mainPath)) {
      throw new Error(`Main file not found: ${mainPath}`);
    }

    try {
      let nodeModule;

      if (options.enableSandbox && plugin.sandbox) {
        // Load in sandbox
        nodeModule = await plugin.sandbox.loadModule(mainPath);
      } else {
        // Load directly (less secure)
        nodeModule = require(mainPath);
      }

      // Extract nodes from module
      for (const nodeName of plugin.manifest.nodes) {
        const NodeClass = nodeModule[nodeName] || nodeModule.default?.[nodeName];

        if (!NodeClass) {
          logger.warn(`Node ${nodeName} not found in plugin ${plugin.manifest.name}`);
          continue;
        }

        plugin.nodes.set(nodeName, NodeClass);
        logger.debug(`Loaded node: ${nodeName}`);
      }
    } catch (error: any) {
      throw new Error(`Failed to load nodes from ${mainPath}: ${error.message}`);
    }
  }

  /**
   * Load plugin credentials
   */
  private async loadPluginCredentials(plugin: LoadedPlugin, options: PluginLoadOptions): Promise<void> {
    if (!plugin.manifest.credentials || plugin.manifest.credentials.length === 0) {
      return;
    }

    const credentialsPath = path.join(plugin.path, 'credentials');

    if (!fs.existsSync(credentialsPath)) {
      logger.warn(`Credentials directory not found for plugin ${plugin.manifest.name}`);
      return;
    }

    for (const credentialName of plugin.manifest.credentials) {
      const credentialFile = path.join(credentialsPath, `${credentialName}.js`);

      if (!fs.existsSync(credentialFile)) {
        logger.warn(`Credential file not found: ${credentialFile}`);
        continue;
      }

      try {
        const credentialModule = require(credentialFile);
        const CredentialClass = credentialModule[credentialName] || credentialModule.default;

        if (CredentialClass) {
          plugin.credentials.set(credentialName, CredentialClass);
          logger.debug(`Loaded credential: ${credentialName}`);
        }
      } catch (error: any) {
        logger.error(`Failed to load credential ${credentialName}:`, error);
      }
    }
  }

  /**
   * Validate permissions
   */
  private validatePermissions(permissions: PluginPermissions): void {
    // Check dangerous permissions
    if (permissions.subprocess) {
      logger.warn('Plugin requests subprocess permissions - this is potentially dangerous');
    }

    if (permissions.filesystem?.write || permissions.filesystem?.readWrite) {
      logger.warn('Plugin requests filesystem write permissions - this is potentially dangerous');
    }

    // Validate network permissions
    if (permissions.network) {
      for (const netPerm of permissions.network) {
        if (!netPerm.host) {
          throw new Error('Network permission must specify a host');
        }
      }
    }
  }

  /**
   * Validate engine version
   */
  private validateEngineVersion(manifest: PluginManifest): void {
    if (manifest.minEngineVersion) {
      // Simple version check (should use semver in production)
      const currentVersion = process.env.ENGINE_VERSION || '1.0.0';
      if (this.compareVersions(currentVersion, manifest.minEngineVersion) < 0) {
        throw new Error(
          `Plugin requires engine version ${manifest.minEngineVersion} or higher, current: ${currentVersion}`
        );
      }
    }

    if (manifest.maxEngineVersion) {
      const currentVersion = process.env.ENGINE_VERSION || '1.0.0';
      if (this.compareVersions(currentVersion, manifest.maxEngineVersion) > 0) {
        throw new Error(
          `Plugin requires engine version ${manifest.maxEngineVersion} or lower, current: ${currentVersion}`
        );
      }
    }
  }

  /**
   * Compare version strings
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Setup hot reload for plugin
   */
  private setupHotReload(pluginName: string, pluginPath: string): void {
    if (this.watchers.has(pluginName)) {
      return;
    }

    const watcher = fs.watch(pluginPath, { recursive: true }, async (eventType, filename) => {
      if (filename && (filename.endsWith('.js') || filename.endsWith('.ts'))) {
        logger.info(`Detected change in ${pluginName}, reloading...`);

        try {
          await this.reloadPlugin(pluginName);
          this.emit('plugin:reloaded', { name: pluginName });
        } catch (error: any) {
          logger.error(`Failed to reload plugin ${pluginName}:`, error);
          this.emit('plugin:reload:error', { name: pluginName, error });
        }
      }
    });

    this.watchers.set(pluginName, watcher);
  }

  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginName: string): Promise<void> {
    const pluginPath = this.pluginPaths.get(pluginName);

    if (!pluginPath) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Unload existing plugin
    await this.unloadPlugin(pluginName);

    // Load again
    await this.loadPlugin(pluginPath, { hotReload: true });
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    // Stop watcher
    const watcher = this.watchers.get(pluginName);
    if (watcher) {
      watcher.close();
      this.watchers.delete(pluginName);
    }

    // Cleanup sandbox
    if (plugin.sandbox) {
      await plugin.sandbox.cleanup();
    }

    // Remove from cache
    this.plugins.delete(pluginName);

    logger.info(`Unloaded plugin: ${pluginName}`);
    this.emit('plugin:unloaded', { name: pluginName });
  }

  /**
   * Get a loaded plugin
   */
  getPlugin(pluginName: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get a node class from a plugin
   */
  getNode(pluginName: string, nodeName: string): any {
    const plugin = this.plugins.get(pluginName);
    return plugin?.nodes.get(nodeName);
  }

  /**
   * Get a credential class from a plugin
   */
  getCredential(pluginName: string, credentialName: string): any {
    const plugin = this.plugins.get(pluginName);
    return plugin?.credentials.get(credentialName);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all nodes from all plugins
   */
  getAllNodes(): Map<string, any> {
    const allNodes = new Map();

    for (const plugin of this.plugins.values()) {
      for (const [nodeName, NodeClass] of plugin.nodes) {
        allNodes.set(`${plugin.manifest.name}.${nodeName}`, NodeClass);
      }
    }

    return allNodes;
  }

  /**
   * Enable a plugin
   */
  enablePlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    plugin.enabled = true;
    logger.info(`Enabled plugin: ${pluginName}`);
    this.emit('plugin:enabled', { name: pluginName });
  }

  /**
   * Disable a plugin
   */
  disablePlugin(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);

    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }

    plugin.enabled = false;
    logger.info(`Disabled plugin: ${pluginName}`);
    this.emit('plugin:disabled', { name: pluginName });
  }

  /**
   * Check if a plugin is enabled
   */
  isPluginEnabled(pluginName: string): boolean {
    const plugin = this.plugins.get(pluginName);
    return plugin?.enabled ?? false;
  }

  /**
   * Get plugin statistics
   */
  getStatistics(): {
    total: number;
    enabled: number;
    disabled: number;
    totalNodes: number;
    totalCredentials: number;
  } {
    const plugins = this.getAllPlugins();

    return {
      total: plugins.length,
      enabled: plugins.filter(p => p.enabled).length,
      disabled: plugins.filter(p => !p.enabled).length,
      totalNodes: plugins.reduce((sum, p) => sum + p.nodes.size, 0),
      totalCredentials: plugins.reduce((sum, p) => sum + p.credentials.size, 0),
    };
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up plugin manager...');

    // Stop all watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();

    // Cleanup all sandboxes
    for (const plugin of this.plugins.values()) {
      if (plugin.sandbox) {
        await plugin.sandbox.cleanup();
      }
    }

    this.plugins.clear();
    this.pluginPaths.clear();

    logger.info('Plugin manager cleaned up');
  }
}

/**
 * Singleton instance
 */
let pluginManagerInstance: PluginManager | null = null;

export function getPluginManager(pluginDirectory?: string): PluginManager {
  if (!pluginManagerInstance) {
    pluginManagerInstance = new PluginManager(pluginDirectory);
  }
  return pluginManagerInstance;
}
