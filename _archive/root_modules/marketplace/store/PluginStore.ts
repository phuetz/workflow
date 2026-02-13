import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  keywords: string[];
  category: string;
  main: string;
  dependencies: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
  engines: { [key: string]: string };
  os?: string[];
  cpu?: string[];
  license: string;
  manifestVersion: string;
}

export interface PluginPackage {
  metadata: PluginMetadata;
  files: Map<string, Buffer>;
  checksum: string;
  size: number;
  compressed: boolean;
  signature?: string;
}

export interface PluginStoreConfig {
  storePath: string;
  cacheSize: number;
  compressionLevel: number;
  enableSignatures: boolean;
  encryptionKey?: string;
  indexing: {
    enabled: boolean;
    fields: string[];
    fullTextSearch: boolean;
  };
  cleanup: {
    enabled: boolean;
    maxAge: number;
    maxVersions: number;
  };
  replication: {
    enabled: boolean;
    replicas: string[];
    syncInterval: number;
  };
}

export interface StorageStats {
  totalPackages: number;
  totalSize: number;
  cacheHitRate: number;
  storageUsed: number;
  compressionRatio: number;
  lastCleanup: number;
  indexSize: number;
}

export interface SearchQuery {
  text?: string;
  category?: string;
  author?: string;
  keywords?: string[];
  version?: string;
  license?: string;
  sort?: 'name' | 'version' | 'date' | 'size' | 'downloads';
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchIndex {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  keywords: string[];
  version: string;
  license: string;
  size: number;
  createdAt: number;
  updatedAt: number;
  downloads: number;
  searchScore?: number;
}

export class PluginStore extends EventEmitter {
  private config: PluginStoreConfig;
  private cache: Map<string, PluginPackage> = new Map();
  private index: Map<string, SearchIndex> = new Map();
  private downloadStats: Map<string, number> = new Map();
  private accessTimes: Map<string, number> = new Map();
  private isInitialized = false;
  private cleanupInterval?: NodeJS.Timeout;
  private replicationInterval?: NodeJS.Timeout;

  constructor(config: PluginStoreConfig) {
    super();
    this.config = config;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create store directory
      await this.ensureStoreDirectory();
      
      // Load existing packages
      await this.loadPackages();
      
      // Build search index
      if (this.config.indexing.enabled) {
        await this.buildSearchIndex();
      }
      
      // Start cleanup tasks
      if (this.config.cleanup.enabled) {
        this.startCleanupTasks();
      }
      
      // Start replication
      if (this.config.replication.enabled) {
        this.startReplication();
      }

      this.isInitialized = true;
      this.emit('initialized');

    } catch (error) {
      this.emit('initialization:error', error);
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    // Stop intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.replicationInterval) {
      clearInterval(this.replicationInterval);
    }

    // Save cache to disk
    await this.flushCache();
    
    // Save index
    if (this.config.indexing.enabled) {
      await this.saveSearchIndex();
    }

    this.isInitialized = false;
    this.emit('shutdown');
  }

  // Package Management
  public async storePackage(metadata: PluginMetadata, files: Map<string, Buffer>): Promise<void> {
    const packageId = this.generatePackageId(metadata.name, metadata.version);
    
    // Validate metadata
    await this.validateMetadata(metadata);
    
    // Create package
    const pluginPackage: PluginPackage = {
      metadata,
      files,
      checksum: this.calculateChecksum(files),
      size: this.calculateSize(files),
      compressed: false,
      signature: this.config.enableSignatures ? await this.signPackage(files) : undefined
    };

    // Compress if beneficial
    if (pluginPackage.size > 1024) { // Only compress if larger than 1KB
      pluginPackage.files = await this.compressFiles(files);
      pluginPackage.compressed = true;
    }

    // Store to disk
    await this.writePackageToDisk(packageId, pluginPackage);
    
    // Update cache
    if (this.cache.size < this.config.cacheSize) {
      this.cache.set(packageId, pluginPackage);
    }
    
    // Update search index
    if (this.config.indexing.enabled) {
      await this.updateSearchIndex(packageId, pluginPackage);
    }
    
    this.emit('package:stored', { id: packageId, metadata });
  }

  public async getPackage(name: string, version?: string): Promise<PluginPackage | null> {
    const packageId = this.generatePackageId(name, version || 'latest');
    
    // Check cache first
    if (this.cache.has(packageId)) {
      this.accessTimes.set(packageId, Date.now());
      this.emit('cache:hit', { id: packageId });
      return this.cache.get(packageId)!;
    }

    // Load from disk
    try {
      const pluginPackage = await this.readPackageFromDisk(packageId);
      
      // Add to cache if space available
      if (this.cache.size < this.config.cacheSize) {
        this.cache.set(packageId, pluginPackage);
      }
      
      this.accessTimes.set(packageId, Date.now());
      this.downloadStats.set(packageId, (this.downloadStats.get(packageId) || 0) + 1);
      
      this.emit('cache:miss', { id: packageId });
      this.emit('package:accessed', { id: packageId, metadata: pluginPackage.metadata });
      
      return pluginPackage;
      
    } catch {
      this.emit('package:not-found', { name, version });
      return null;
    }
  }

  public async deletePackage(name: string, version: string): Promise<void> {
    const packageId = this.generatePackageId(name, version);
    
    // Remove from cache
    this.cache.delete(packageId);
    
    // Remove from disk
    await this.deletePackageFromDisk(packageId);
    
    // Remove from search index
    if (this.config.indexing.enabled) {
      this.index.delete(packageId);
    }
    
    // Clean up stats
    this.accessTimes.delete(packageId);
    this.downloadStats.delete(packageId);
    
    this.emit('package:deleted', { name, version });
  }

  public async hasPackage(name: string, version?: string): Promise<boolean> {
    const packageId = this.generatePackageId(name, version || 'latest');
    
    // Check cache
    if (this.cache.has(packageId)) {
      return true;
    }
    
    // Check disk
    try {
      await this.getPackageMetadata(packageId);
      return true;
    } catch {
      return false;
    }
  }

  public async listPackages(prefix?: string): Promise<string[]> {
    const packages: string[] = [];
    
    // Get from cache
    for (const id of this.cache.keys()) {
      if (!prefix || id.startsWith(prefix)) {
        packages.push(id);
      }
    }
    
    // Get from disk
    try {
      const files = await fs.readdir(this.getPackageDirectory());
      for (const file of files) {
        if (file.endsWith('.pkg') && (!prefix || file.startsWith(prefix))) {
          const id = file.replace('.pkg', '');
          if (!packages.includes(id)) {
            packages.push(id);
          }
        }
      }
    } catch {
      // Directory might not exist yet
    }
    
    return packages.sort();
  }

  public async getPackageVersions(name: string): Promise<string[]> {
    const packages = await this.listPackages();
    const versions: string[] = [];
    
    for (const pkg of packages) {
      if (pkg.startsWith(`${name}@`)) {
        const version = pkg.split('@')[1];
        versions.push(version);
      }
    }
    
    return versions.sort(this.compareVersions.bind(this));
  }

  // Search and Discovery
  public async search(query: SearchQuery): Promise<{
    results: SearchIndex[];
    total: number;
    page: number;
    hasMore: boolean;
  }> {
    if (!this.config.indexing.enabled) {
      throw new Error('Search is not enabled');
    }

    let results = Array.from(this.index.values());
    
    // Apply filters
    if (query.text && this.config.indexing.fullTextSearch) {
      results = this.performFullTextSearch(results, query.text);
    } else if (query.text) {
      results = this.performSimpleSearch(results, query.text);
    }
    
    if (query.category) {
      results = results.filter(r => r.category === query.category);
    }
    
    if (query.author) {
      results = results.filter(r => r.author.toLowerCase().includes(query.author!.toLowerCase()));
    }
    
    if (query.keywords && query.keywords.length > 0) {
      results = results.filter(r => 
        query.keywords!.some(keyword => 
          r.keywords.some(k => k.toLowerCase().includes(keyword.toLowerCase()))
        )
      );
    }
    
    if (query.license) {
      results = results.filter(r => r.license === query.license);
    }

    // Apply sorting
    const sort = query.sort || 'name';
    const order = query.order || 'asc';
    
    results.sort((a, b) => {
      let comparison = 0;
      
      switch (sort) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'version':
          comparison = this.compareVersions(a.version, b.version);
          break;
        case 'date':
          comparison = a.updatedAt - b.updatedAt;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const limit = query.limit || 20;
    const offset = query.offset || 0;
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);
    const page = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    return {
      results: paginatedResults,
      total,
      page,
      hasMore
    };
  }

  public async getCategories(): Promise<{ [category: string]: number }> {
    const categories: { [key: string]: number } = {};
    
    for (const item of this.index.values()) {
      categories[item.category] = (categories[item.category] || 0) + 1;
    }
    
    return categories;
  }

  public async getAuthors(): Promise<{ [author: string]: number }> {
    const authors: { [key: string]: number } = {};
    
    for (const item of this.index.values()) {
      authors[item.author] = (authors[item.author] || 0) + 1;
    }
    
    return authors;
  }

  public async getTags(): Promise<{ [tag: string]: number }> {
    const tags: { [key: string]: number } = {};
    
    for (const item of this.index.values()) {
      for (const keyword of item.keywords) {
        tags[keyword] = (tags[keyword] || 0) + 1;
      }
    }
    
    return tags;
  }

  // Statistics and Analytics
  public async getStats(): Promise<StorageStats> {
    const totalPackages = this.cache.size + await this.countDiskPackages();
    const totalSize = await this.calculateTotalSize();
    const cacheHits = this.calculateCacheHitRate();
    const storageUsed = await this.calculateStorageUsed();
    const compressionRatio = await this.calculateCompressionRatio();
    
    return {
      totalPackages,
      totalSize,
      cacheHitRate: cacheHits,
      storageUsed,
      compressionRatio,
      lastCleanup: 0, // Would track actual cleanup times
      indexSize: this.index.size
    };
  }

  public async getPopularPackages(limit: number = 10): Promise<SearchIndex[]> {
    return Array.from(this.index.values())
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  public async getRecentPackages(limit: number = 10): Promise<SearchIndex[]> {
    return Array.from(this.index.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  // Cache Management
  public async flushCache(): Promise<void> {
    // Write all cached packages to disk
    for (const [id, pkg] of this.cache.entries()) {
      try {
        await this.writePackageToDisk(id, pkg);
      } catch (error) {
        this.emit('cache:flush:error', { id, error });
      }
    }
    
    this.emit('cache:flushed', { count: this.cache.size });
  }

  public async clearCache(): Promise<void> {
    const count = this.cache.size;
    this.cache.clear();
    this.accessTimes.clear();
    
    this.emit('cache:cleared', { count });
  }

  public async evictLRU(count: number = 1): Promise<void> {
    if (this.cache.size <= count) return;
    
    // Sort by access time (least recently used first)
    const sortedEntries = Array.from(this.cache.entries())
      .map(([id, pkg]) => ({ id, pkg, lastAccess: this.accessTimes.get(id) || 0 }))
      .sort((a, b) => a.lastAccess - b.lastAccess);
    
    // Remove least recently used items
    for (let i = 0; i < count && i < sortedEntries.length; i++) {
      const { id } = sortedEntries[i];
      this.cache.delete(id);
      this.accessTimes.delete(id);
      this.emit('cache:evicted', { id });
    }
  }

  // Helper Methods
  private generatePackageId(name: string, version: string): string {
    return `${name}@${version}`;
  }

  private calculateChecksum(files: Map<string, Buffer>): string {
    const hash = crypto.createHash('sha256');
    
    // Sort files for consistent checksums
    const sortedFiles = Array.from(files.entries()).sort(([a], [b]) => a.localeCompare(b));
    
    for (const [path, content] of sortedFiles) {
      hash.update(path);
      hash.update(content);
    }
    
    return hash.digest('hex');
  }

  private calculateSize(files: Map<string, Buffer>): number {
    let total = 0;
    for (const buffer of files.values()) {
      total += buffer.length;
    }
    return total;
  }

  private async compressFiles(files: Map<string, Buffer>): Promise<Map<string, Buffer>> {
    // Mock compression - would use actual compression library
    const compressed = new Map<string, Buffer>();
    
    for (const [path, content] of files.entries()) {
      // Simulate compression by reducing size by ~30%
      const compressedContent = Buffer.alloc(Math.floor(content.length * 0.7));
      content.copy(compressedContent, 0, 0, compressedContent.length);
      compressed.set(path, compressedContent);
    }
    
    return compressed;
  }

  private async signPackage(files: Map<string, Buffer>): Promise<string> {
    // Mock signing - would use actual cryptographic signing
    const content = Array.from(files.values()).reduce((acc, buf) => Buffer.concat([acc, buf]), Buffer.alloc(0));
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async validateMetadata(metadata: PluginMetadata): Promise<void> {
    if (!metadata.name || metadata.name.length < 2) {
      throw new Error('Package name must be at least 2 characters');
    }
    
    if (!metadata.version.match(/^\d+\.\d+\.\d+/)) {
      throw new Error('Version must follow semantic versioning');
    }
    
    if (!metadata.description || metadata.description.length < 10) {
      throw new Error('Description must be at least 10 characters');
    }
    
    if (!metadata.author) {
      throw new Error('Author is required');
    }
    
    if (!metadata.license) {
      throw new Error('License is required');
    }
  }

  private async ensureStoreDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storePath, { recursive: true });
      await fs.mkdir(this.getPackageDirectory(), { recursive: true });
      await fs.mkdir(this.getIndexDirectory(), { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create store directory: ${(error as Error).message}`);
    }
  }

  private getPackageDirectory(): string {
    return path.join(this.config.storePath, 'packages');
  }

  private getIndexDirectory(): string {
    return path.join(this.config.storePath, 'index');
  }

  private getPackagePath(id: string): string {
    return path.join(this.getPackageDirectory(), `${id}.pkg`);
  }

  private async writePackageToDisk(id: string, pkg: PluginPackage): Promise<void> {
    const packagePath = this.getPackagePath(id);
    const data = JSON.stringify({
      metadata: pkg.metadata,
      files: Array.from(pkg.files.entries()),
      checksum: pkg.checksum,
      size: pkg.size,
      compressed: pkg.compressed,
      signature: pkg.signature
    });
    
    await fs.writeFile(packagePath, data, 'utf8');
  }

  private async readPackageFromDisk(id: string): Promise<PluginPackage> {
    const packagePath = this.getPackagePath(id);
    const data = await fs.readFile(packagePath, 'utf8');
    const parsed = JSON.parse(data);
    
    return {
      metadata: parsed.metadata,
      files: new Map(parsed.files),
      checksum: parsed.checksum,
      size: parsed.size,
      compressed: parsed.compressed,
      signature: parsed.signature
    };
  }

  private async deletePackageFromDisk(id: string): Promise<void> {
    const packagePath = this.getPackagePath(id);
    try {
      await fs.unlink(packagePath);
    } catch {
      // File might not exist
    }
  }

  private async getPackageMetadata(id: string): Promise<PluginMetadata> {
    const pkg = await this.readPackageFromDisk(id);
    return pkg.metadata;
  }

  private async loadPackages(): Promise<void> {
    try {
      const files = await fs.readdir(this.getPackageDirectory());
      let loaded = 0;
      
      for (const file of files) {
        if (file.endsWith('.pkg')) {
          const id = file.replace('.pkg', '');
          try {
            const pkg = await this.readPackageFromDisk(id);
            
            // Add to cache if space available
            if (this.cache.size < this.config.cacheSize) {
              this.cache.set(id, pkg);
            }
            
            loaded++;
          } catch (error) {
            this.emit('package:load:error', { id, error });
          }
        }
      }
      
      this.emit('packages:loaded', { count: loaded });
      
    } catch (error) {
      // Directory might not exist yet
      this.emit('packages:load:error', error);
    }
  }

  private async buildSearchIndex(): Promise<void> {
    // Load existing index
    await this.loadSearchIndex();
    
    // Index all packages
    for (const [id, pkg] of this.cache.entries()) {
      await this.updateSearchIndex(id, pkg);
    }
    
    // Index packages on disk that aren't cached
    try {
      const files = await fs.readdir(this.getPackageDirectory());
      
      for (const file of files) {
        if (file.endsWith('.pkg')) {
          const id = file.replace('.pkg', '');
          
          if (!this.cache.has(id)) {
            try {
              const pkg = await this.readPackageFromDisk(id);
              await this.updateSearchIndex(id, pkg);
            } catch (error) {
              this.emit('index:build:error', { id, error });
            }
          }
        }
      }
    } catch {
      // Directory might not exist
    }
    
    await this.saveSearchIndex();
    this.emit('index:built', { size: this.index.size });
  }

  private async updateSearchIndex(id: string, pkg: PluginPackage): Promise<void> {
    const indexEntry: SearchIndex = {
      id,
      name: pkg.metadata.name,
      description: pkg.metadata.description,
      author: pkg.metadata.author,
      category: pkg.metadata.category,
      keywords: pkg.metadata.keywords,
      version: pkg.metadata.version,
      license: pkg.metadata.license,
      size: pkg.size,
      createdAt: Date.now(), // Would be actual creation time
      updatedAt: Date.now(),
      downloads: this.downloadStats.get(id) || 0
    };
    
    this.index.set(id, indexEntry);
  }

  private async loadSearchIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.getIndexDirectory(), 'search.json');
      const data = await fs.readFile(indexPath, 'utf8');
      const entries = JSON.parse(data);
      
      this.index.clear();
      for (const entry of entries) {
        this.index.set(entry.id, entry);
      }
      
      this.emit('index:loaded', { size: this.index.size });
      
    } catch (error) {
      // Index file might not exist yet
      this.emit('index:load:error', error);
    }
  }

  private async saveSearchIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.getIndexDirectory(), 'search.json');
      const entries = Array.from(this.index.values());
      const data = JSON.stringify(entries, null, 2);
      
      await fs.writeFile(indexPath, data, 'utf8');
      this.emit('index:saved', { size: this.index.size });
      
    } catch (error) {
      this.emit('index:save:error', error);
    }
  }

  private performFullTextSearch(results: SearchIndex[], query: string): SearchIndex[] {
    const terms = query.toLowerCase().split(' ').filter(t => t.length > 0);
    
    return results.map(result => {
      const searchableText = [
        result.name,
        result.description,
        result.author,
        ...result.keywords
      ].join(' ').toLowerCase();
      
      let score = 0;
      for (const term of terms) {
        const occurrences = (searchableText.match(new RegExp(term, 'g')) || []).length;
        score += occurrences;
        
        // Boost score for matches in name
        if (result.name.toLowerCase().includes(term)) {
          score += 10;
        }
        
        // Boost score for exact keyword matches
        if (result.keywords.some(k => k.toLowerCase() === term)) {
          score += 5;
        }
      }
      
      return { ...result, searchScore: score };
    })
    .filter(result => result.searchScore! > 0)
    .sort((a, b) => b.searchScore! - a.searchScore!);
  }

  private performSimpleSearch(results: SearchIndex[], query: string): SearchIndex[] {
    const searchTerm = query.toLowerCase();
    
    return results.filter(result => {
      const searchableText = [
        result.name,
        result.description,
        result.author,
        ...result.keywords
      ].join(' ').toLowerCase();
      
      return searchableText.includes(searchTerm);
    });
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart !== bPart) {
        return aPart - bPart;
      }
    }
    
    return 0;
  }

  private startCleanupTasks(): Promise<void> {
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, 60 * 60 * 1000); // Every hour
    
    return Promise.resolve();
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = this.config.cleanup.maxAge;
    let cleaned = 0;
    
    // Clean up old access times
    for (const [id, accessTime] of this.accessTimes.entries()) {
      if (now - accessTime > maxAge) {
        this.accessTimes.delete(id);
        cleaned++;
      }
    }
    
    // Evict LRU items if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      const evictCount = Math.floor(this.config.cacheSize * 0.1); // Evict 10%
      await this.evictLRU(evictCount);
    }
    
    this.emit('cleanup:completed', { cleaned });
  }

  private startReplication(): Promise<void> {
    this.replicationInterval = setInterval(async () => {
      await this.performReplication();
    }, this.config.replication.syncInterval);
    
    return Promise.resolve();
  }

  private async performReplication(): Promise<void> {
    // Mock replication to replica stores
    console.log('Performing replication to replicas...');
    this.emit('replication:completed');
  }

  private async countDiskPackages(): Promise<number> {
    try {
      const files = await fs.readdir(this.getPackageDirectory());
      return files.filter(f => f.endsWith('.pkg')).length;
    } catch {
      return 0;
    }
  }

  private async calculateTotalSize(): Promise<number> {
    let total = 0;
    
    // Size from cache
    for (const pkg of this.cache.values()) {
      total += pkg.size;
    }
    
    // Size from disk (non-cached packages)
    try {
      const files = await fs.readdir(this.getPackageDirectory());
      
      for (const file of files) {
        if (file.endsWith('.pkg')) {
          const id = file.replace('.pkg', '');
          
          if (!this.cache.has(id)) {
            try {
              const stats = await fs.stat(path.join(this.getPackageDirectory(), file));
              total += stats.size;
            } catch {
              // File might be deleted
            }
          }
        }
      }
    } catch {
      // Directory might not exist
    }
    
    return total;
  }

  private calculateCacheHitRate(): number {
    // Mock calculation - would track actual hit/miss rates
    return 0.85; // 85% hit rate
  }

  private async calculateStorageUsed(): Promise<number> {
    try {
      const stats = await fs.stat(this.config.storePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async calculateCompressionRatio(): Promise<number> {
    // Mock calculation - would compare compressed vs uncompressed sizes
    return 0.7; // 30% compression ratio
  }
}

export default PluginStore;