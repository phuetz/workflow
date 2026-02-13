/**
 * PluginRegistry - Plugin discovery, installation, and marketplace integration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../services/SimpleLogger';
import { PluginManifest } from './PluginManager';

const execAsync = promisify(exec);

export interface PluginRegistryEntry {
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  verified: boolean;
  categories: string[];
  keywords: string[];
  license: string;
  repository?: string;
  homepage?: string;
  latestVersion: string;
  versions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InstallOptions {
  version?: string;
  force?: boolean;
  skipDependencies?: boolean;
  registry?: string;
}

export interface PluginSource {
  type: 'registry' | 'git' | 'local' | 'npm';
  location: string;
  version?: string;
}

/**
 * Plugin Registry - Manages plugin discovery and installation
 */
export class PluginRegistry extends EventEmitter {
  private readonly registryUrl: string;
  private readonly pluginDirectory: string;
  private cache: Map<string, PluginRegistryEntry> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour
  private lastCacheUpdate: number = 0;

  constructor(config?: {
    registryUrl?: string;
    pluginDirectory?: string;
  }) {
    super();
    this.registryUrl = config?.registryUrl || process.env.PLUGIN_REGISTRY_URL || 'https://registry.workflow-automation.io';
    this.pluginDirectory = config?.pluginDirectory || path.join(process.cwd(), 'plugins');
  }

  /**
   * Search plugins in registry
   */
  async search(query: string, options?: {
    category?: string;
    verified?: boolean;
    limit?: number;
  }): Promise<PluginRegistryEntry[]> {
    await this.updateCache();

    let results = Array.from(this.cache.values());

    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(plugin =>
        plugin.name.toLowerCase().includes(lowerQuery) ||
        plugin.description.toLowerCase().includes(lowerQuery) ||
        plugin.keywords.some(k => k.toLowerCase().includes(lowerQuery))
      );
    }

    // Filter by category
    if (options?.category) {
      results = results.filter(plugin =>
        plugin.categories.includes(options.category!)
      );
    }

    // Filter by verified
    if (options?.verified !== undefined) {
      results = results.filter(plugin => plugin.verified === options.verified);
    }

    // Sort by downloads and rating
    results.sort((a, b) => {
      const scoreA = a.downloads * 0.7 + a.rating * 0.3;
      const scoreB = b.downloads * 0.7 + b.rating * 0.3;
      return scoreB - scoreA;
    });

    // Limit results
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get plugin info from registry
   */
  async getPluginInfo(pluginName: string): Promise<PluginRegistryEntry | null> {
    await this.updateCache();
    return this.cache.get(pluginName) || null;
  }

  /**
   * Install plugin
   */
  async install(source: string | PluginSource, options: InstallOptions = {}): Promise<void> {
    logger.info(`Installing plugin: ${typeof source === 'string' ? source : source.location}`);
    this.emit('install:start', { source });

    try {
      const pluginSource = typeof source === 'string'
        ? this.parseSource(source)
        : source;

      let installPath: string;

      switch (pluginSource.type) {
        case 'registry':
          installPath = await this.installFromRegistry(pluginSource.location, options);
          break;

        case 'npm':
          installPath = await this.installFromNpm(pluginSource.location, options);
          break;

        case 'git':
          installPath = await this.installFromGit(pluginSource.location, options);
          break;

        case 'local':
          installPath = await this.installFromLocal(pluginSource.location, options);
          break;

        default:
          throw new Error(`Unknown source type: ${(pluginSource as any).type}`);
      }

      // Install dependencies
      if (!options.skipDependencies) {
        await this.installDependencies(installPath);
      }

      logger.info(`Successfully installed plugin at: ${installPath}`);
      this.emit('install:complete', { source, path: installPath });

    } catch (error: any) {
      logger.error(`Failed to install plugin:`, error);
      this.emit('install:error', { source, error });
      throw error;
    }
  }

  /**
   * Parse plugin source string
   */
  private parseSource(source: string): PluginSource {
    // Git URL
    if (source.startsWith('git@') || source.startsWith('https://') && source.includes('git')) {
      return { type: 'git', location: source };
    }

    // Local path
    if (source.startsWith('.') || source.startsWith('/') || source.startsWith('~')) {
      return { type: 'local', location: path.resolve(source) };
    }

    // NPM package
    if (source.startsWith('npm:')) {
      return { type: 'npm', location: source.substring(4) };
    }

    // Registry (default)
    const parts = source.split('@');
    return {
      type: 'registry',
      location: parts[0],
      version: parts[1],
    };
  }

  /**
   * Install from registry
   */
  private async installFromRegistry(pluginName: string, options: InstallOptions): Promise<string> {
    const pluginInfo = await this.getPluginInfo(pluginName);

    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginName} not found in registry`);
    }

    const version = options.version || pluginInfo.latestVersion;

    if (!pluginInfo.versions.includes(version)) {
      throw new Error(`Version ${version} not found for plugin ${pluginName}`);
    }

    // Download plugin
    const downloadUrl = `${this.registryUrl}/plugins/${pluginName}/${version}/download`;
    const targetPath = path.join(this.pluginDirectory, pluginName);

    await this.downloadAndExtract(downloadUrl, targetPath);

    // Update registry stats
    this.updateDownloadCount(pluginName).catch(err =>
      logger.warn(`Failed to update download count: ${err.message}`)
    );

    return targetPath;
  }

  /**
   * Install from npm
   */
  private async installFromNpm(packageName: string, options: InstallOptions): Promise<string> {
    const targetPath = path.join(this.pluginDirectory, packageName);

    // Use npm to install
    const npmCommand = `npm install ${packageName}${options.version ? `@${options.version}` : ''} --prefix ${targetPath}`;

    logger.info(`Running: ${npmCommand}`);
    await execAsync(npmCommand);

    // Move from node_modules to plugin directory
    const installedPath = path.join(targetPath, 'node_modules', packageName);
    if (fs.existsSync(installedPath)) {
      const finalPath = path.join(this.pluginDirectory, path.basename(packageName));
      fs.renameSync(installedPath, finalPath);
      // Cleanup
      fs.rmSync(targetPath, { recursive: true, force: true });
      return finalPath;
    }

    return targetPath;
  }

  /**
   * Install from git repository
   */
  private async installFromGit(gitUrl: string, options: InstallOptions): Promise<string> {
    // Extract plugin name from git URL
    const pluginName = path.basename(gitUrl, '.git');
    const targetPath = path.join(this.pluginDirectory, pluginName);

    // Clone repository
    const gitCommand = `git clone ${gitUrl} ${targetPath}`;

    logger.info(`Running: ${gitCommand}`);
    await execAsync(gitCommand);

    // Checkout specific version if specified
    if (options.version) {
      await execAsync(`git checkout ${options.version}`, { cwd: targetPath });
    }

    return targetPath;
  }

  /**
   * Install from local path
   */
  private async installFromLocal(localPath: string, options: InstallOptions): Promise<string> {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local path does not exist: ${localPath}`);
    }

    const pluginName = path.basename(localPath);
    const targetPath = path.join(this.pluginDirectory, pluginName);

    // Copy to plugin directory
    if (localPath !== targetPath) {
      this.copyDirectory(localPath, targetPath);
    }

    return targetPath;
  }

  /**
   * Install plugin dependencies
   */
  private async installDependencies(pluginPath: string): Promise<void> {
    const packageJsonPath = path.join(pluginPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      logger.debug('No package.json found, skipping dependencies');
      return;
    }

    logger.info('Installing plugin dependencies...');

    try {
      await execAsync('npm install --production', { cwd: pluginPath });
      logger.info('Dependencies installed successfully');
    } catch (error: any) {
      logger.warn(`Failed to install dependencies: ${error.message}`);
      // Don't throw, dependencies might not be critical
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstall(pluginName: string): Promise<void> {
    const pluginPath = path.join(this.pluginDirectory, pluginName);

    if (!fs.existsSync(pluginPath)) {
      throw new Error(`Plugin ${pluginName} is not installed`);
    }

    logger.info(`Uninstalling plugin: ${pluginName}`);
    this.emit('uninstall:start', { name: pluginName });

    try {
      // Remove directory
      fs.rmSync(pluginPath, { recursive: true, force: true });

      logger.info(`Successfully uninstalled plugin: ${pluginName}`);
      this.emit('uninstall:complete', { name: pluginName });
    } catch (error: any) {
      logger.error(`Failed to uninstall plugin:`, error);
      this.emit('uninstall:error', { name: pluginName, error });
      throw error;
    }
  }

  /**
   * Update plugin to latest version
   */
  async update(pluginName: string, version?: string): Promise<void> {
    logger.info(`Updating plugin: ${pluginName}`);
    this.emit('update:start', { name: pluginName });

    try {
      // Get current installation
      const currentPath = path.join(this.pluginDirectory, pluginName);
      if (!fs.existsSync(currentPath)) {
        throw new Error(`Plugin ${pluginName} is not installed`);
      }

      // Read current manifest
      const manifestPath = path.join(currentPath, 'workflow.json');
      let currentVersion: string | undefined;

      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        currentVersion = manifest.version;
      }

      // Uninstall current version
      await this.uninstall(pluginName);

      // Install new version
      await this.install(
        version ? `${pluginName}@${version}` : pluginName,
        { skipDependencies: false }
      );

      logger.info(`Successfully updated plugin: ${pluginName}`);
      this.emit('update:complete', { name: pluginName, from: currentVersion, to: version });

    } catch (error: any) {
      logger.error(`Failed to update plugin:`, error);
      this.emit('update:error', { name: pluginName, error });
      throw error;
    }
  }

  /**
   * List installed plugins
   */
  listInstalled(): Array<{ name: string; version: string; path: string }> {
    const installed: Array<{ name: string; version: string; path: string }> = [];

    if (!fs.existsSync(this.pluginDirectory)) {
      return installed;
    }

    const entries = fs.readdirSync(this.pluginDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(this.pluginDirectory, entry.name);
        const manifestPath = path.join(pluginPath, 'workflow.json');

        if (fs.existsSync(manifestPath)) {
          try {
            const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            installed.push({
              name: manifest.name,
              version: manifest.version,
              path: pluginPath,
            });
          } catch (error) {
            logger.warn(`Failed to read manifest for ${entry.name}`);
          }
        }
      }
    }

    return installed;
  }

  /**
   * Check for updates
   */
  async checkUpdates(): Promise<Array<{ name: string; currentVersion: string; latestVersion: string }>> {
    const updates: Array<{ name: string; currentVersion: string; latestVersion: string }> = [];
    const installed = this.listInstalled();

    await this.updateCache();

    for (const plugin of installed) {
      const registryEntry = this.cache.get(plugin.name);

      if (registryEntry && this.compareVersions(registryEntry.latestVersion, plugin.version) > 0) {
        updates.push({
          name: plugin.name,
          currentVersion: plugin.version,
          latestVersion: registryEntry.latestVersion,
        });
      }
    }

    return updates;
  }

  /**
   * Update registry cache
   */
  private async updateCache(force = false): Promise<void> {
    const now = Date.now();

    if (!force && now - this.lastCacheUpdate < this.cacheExpiry) {
      return;
    }

    try {
      const plugins = await this.fetchRegistry();

      this.cache.clear();
      for (const plugin of plugins) {
        this.cache.set(plugin.name, plugin);
      }

      this.lastCacheUpdate = now;
      logger.debug(`Registry cache updated with ${plugins.length} plugins`);
    } catch (error: any) {
      logger.error(`Failed to update registry cache:`, error);
      // Use stale cache if available
    }
  }

  /**
   * Fetch plugins from registry
   */
  private async fetchRegistry(): Promise<PluginRegistryEntry[]> {
    return new Promise((resolve, reject) => {
      const url = `${this.registryUrl}/plugins`;

      https.get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const plugins = JSON.parse(data);
            resolve(plugins);
          } catch (error) {
            reject(new Error(`Failed to parse registry response: ${error}`));
          }
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Download and extract plugin
   */
  private async downloadAndExtract(url: string, targetPath: string): Promise<void> {
    // Ensure target directory exists
    fs.mkdirSync(targetPath, { recursive: true });

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed with status ${res.statusCode}`));
          return;
        }

        const tarPath = path.join(targetPath, 'plugin.tar.gz');
        const writeStream = fs.createWriteStream(tarPath);

        res.pipe(writeStream);

        writeStream.on('finish', async () => {
          try {
            // Extract tar.gz
            await execAsync(`tar -xzf plugin.tar.gz`, { cwd: targetPath });
            // Remove tar file
            fs.unlinkSync(tarPath);
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        writeStream.on('error', reject);
      }).on('error', reject);
    });
  }

  /**
   * Copy directory recursively
   */
  private copyDirectory(source: string, target: string): void {
    fs.mkdirSync(target, { recursive: true });

    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
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
   * Update download count in registry
   */
  private async updateDownloadCount(pluginName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.registryUrl}/plugins/${pluginName}/download-count`;
      const data = JSON.stringify({ increment: 1 });

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };

      const req = https.request(url, options, (res) => {
        resolve();
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}

/**
 * Singleton instance
 */
let registryInstance: PluginRegistry | null = null;

export function getPluginRegistry(config?: { registryUrl?: string; pluginDirectory?: string }): PluginRegistry {
  if (!registryInstance) {
    registryInstance = new PluginRegistry(config);
  }
  return registryInstance;
}
