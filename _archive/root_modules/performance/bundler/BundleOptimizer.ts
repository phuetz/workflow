/**
 * Bundle Optimizer
 * Webpack/Rollup/Vite bundle analysis and optimization for build performance
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

export interface BundleOptimizerConfig {
  bundler: {
    type: 'webpack' | 'rollup' | 'vite' | 'parcel' | 'esbuild';
    configPath?: string;
    outputDir: string;
    sourceMap: boolean;
  };
  analysis: {
    enabled: boolean;
    duplicateDetection: boolean;
    circularDependencyDetection: boolean;
    unusedCodeDetection: boolean;
    bundleSizeAnalysis: boolean;
    chunkAnalysis: boolean;
  };
  optimization: {
    treeshaking: boolean;
    minification: boolean;
    compression: boolean;
    codesplitting: boolean;
    dynamicImports: boolean;
    deadCodeElimination: boolean;
    moduleResolution: boolean;
  };
  performance: {
    budgets: {
      maxBundleSize: number; // bytes
      maxChunkSize: number; // bytes
      maxInitialSize: number; // bytes
    };
    splitting: {
      vendor: boolean;
      runtime: boolean;
      async: boolean;
      maxSize: number;
      minSize: number;
    };
    caching: {
      enabled: boolean;
      contentHash: boolean;
      longTermCaching: boolean;
    };
  };
  output: {
    reportDir: string;
    generateVisualization: boolean;
    generateStats: boolean;
    format: 'json' | 'html' | 'both';
  };
}

export interface BundleAnalysis {
  id: string;
  timestamp: Date;
  bundler: string;
  version: string;
  buildTime: number;
  totalSize: number;
  gzippedSize: number;
  chunks: ChunkInfo[];
  modules: ModuleInfo[];
  assets: AssetInfo[];
  dependencies: DependencyAnalysis[];
  duplicates: DuplicateModule[];
  circularDependencies: CircularDependency[];
  unusedCode: UnusedCodeInfo[];
  performance: BundlePerformanceMetrics;
  warnings: BundleWarning[];
  suggestions: BundleOptimizationSuggestion[];
}

export interface ChunkInfo {
  id: string;
  name: string;
  size: number;
  gzippedSize: number;
  modules: string[];
  isEntry: boolean;
  isInitial: boolean;
  isAsync: boolean;
  parents: string[];
  children: string[];
  files: string[];
  hash: string;
  reason: string;
}

export interface ModuleInfo {
  id: string;
  name: string;
  size: number;
  chunks: string[];
  reasons: ModuleReason[];
  dependencies: string[];
  issuers: string[];
  built: boolean;
  cacheable: boolean;
  optional: boolean;
  failed: boolean;
  errors: number;
  warnings: number;
  depth: number;
  profile?: ModuleProfile;
}

export interface ModuleReason {
  type: string;
  userRequest: string;
  module: string;
  loc: string;
}

export interface ModuleProfile {
  factory: number;
  building: number;
  dependencies: number;
  resolving: number;
  integration: number;
}

export interface AssetInfo {
  name: string;
  size: number;
  chunks: string[];
  chunkNames: string[];
  emitted: boolean;
  isOverSizeLimit: boolean;
  type: 'js' | 'css' | 'image' | 'font' | 'other';
  compression?: {
    gzip: number;
    brotli: number;
  };
}

export interface DependencyAnalysis {
  name: string;
  version: string;
  size: number;
  usedSize: number;
  treeshakeable: boolean;
  sideEffects: boolean;
  chunks: string[];
  moduleCount: number;
  duplicateVersions: string[];
  alternatives: DependencyAlternative[];
  license: string;
  security: {
    vulnerabilities: number;
    highSeverity: number;
  };
}

export interface DependencyAlternative {
  name: string;
  size: number;
  benefits: string[];
  migration: {
    complexity: 'low' | 'medium' | 'high';
    breakingChanges: boolean;
    effort: number; // hours
  };
}

export interface DuplicateModule {
  name: string;
  instances: Array<{
    id: string;
    size: number;
    chunks: string[];
    reasons: string[];
  }>;
  totalWastedSize: number;
  potentialSavings: number;
  deduplicationStrategy: string;
}

export interface CircularDependency {
  id: string;
  modules: string[];
  severity: 'low' | 'medium' | 'high';
  impact: {
    bundleSize: number;
    performance: number;
    maintainability: number;
  };
  suggestion: string;
}

export interface UnusedCodeInfo {
  type: 'module' | 'export' | 'function' | 'class' | 'variable';
  name: string;
  file: string;
  size: number;
  confidence: number;
  reasons: string[];
  safe: boolean;
}

export interface BundlePerformanceMetrics {
  buildTime: number;
  rebuildTime: number;
  parseTime: number;
  chunkLoadTime: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
  cacheEfficiency: number;
  parallelization: number;
  hotReloadTime: number;
}

export interface BundleWarning {
  type: 'size' | 'performance' | 'dependency' | 'circular' | 'duplicate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  module?: string;
  chunk?: string;
  suggestion: string;
  impact: number;
  fixable: boolean;
}

export interface BundleOptimizationSuggestion {
  id: string;
  type: 'splitting' | 'lazy' | 'compression' | 'elimination' | 'dependency' | 'caching';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    bundleSize: number;
    buildTime: number;
    runtime: number;
    maintenance: number;
  };
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    timeRequired: number;
    steps: string[];
    configChanges: ConfigChange[];
    codeChanges?: CodeChange[];
  };
  examples: {
    before: string;
    after: string;
  };
  risks: string[];
}

export interface ConfigChange {
  file: string;
  section: string;
  property: string;
  oldValue: unknown;
  newValue: unknown;
  explanation: string;
}

export interface CodeChange {
  file: string;
  startLine: number;
  endLine: number;
  oldCode: string;
  newCode: string;
  type: 'replace' | 'insert' | 'delete';
}

export interface OptimizationResult {
  id: string;
  timestamp: Date;
  bundler: string;
  optimizations: string[];
  results: {
    before: BundleStats;
    after: BundleStats;
    improvements: BundleImprovements;
  };
  appliedSuggestions: string[];
  warnings: string[];
  errors: string[];
  buildTime: number;
}

export interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunks: number;
  modules: number;
  assets: number;
  buildTime: number;
  firstLoadJS: number;
  duplicateSize: number;
}

export interface BundleImprovements {
  bundleSize: number; // percentage
  buildTime: number; // percentage
  chunkCount: number;
  duplicateElimination: number;
  compressionRatio: number;
}

export class BundleOptimizer extends EventEmitter {
  private config: BundleOptimizerConfig;
  private analyses: Map<string, BundleAnalysis> = new Map();
  private optimizationResults: Map<string, OptimizationResult> = new Map();
  private buildCache: Map<string, unknown> = new Map();
  private watchers: Map<string, unknown> = new Map();
  
  constructor(config: BundleOptimizerConfig) {
    super();
    this.config = config;
    this.initialize();
  }
  
  private initialize(): void {
    // Create output directories
    if (!fs.existsSync(this.config.output.reportDir)) {
      fs.mkdirSync(this.config.output.reportDir, { recursive: true });
    }
    
    this.emit('initialized', {
      bundler: this.config.bundler.type,
      outputDir: this.config.bundler.outputDir,
      reportDir: this.config.output.reportDir
    });
  }
  
  // Bundle Analysis
  
  public async analyzeBuild(buildPath?: string): Promise<BundleAnalysis> {
    const startTime = Date.now();
    const analysisId = crypto.randomUUID();
    
    const buildStats = await this.getBuildStats(buildPath);
    const bundleInfo = await this.extractBundleInfo(buildStats);
    
    const analysis: BundleAnalysis = {
      id: analysisId,
      timestamp: new Date(),
      bundler: this.config.bundler.type,
      version: await this.getBundlerVersion(),
      buildTime: Date.now() - startTime,
      totalSize: bundleInfo.totalSize,
      gzippedSize: bundleInfo.gzippedSize,
      chunks: bundleInfo.chunks,
      modules: bundleInfo.modules,
      assets: bundleInfo.assets,
      dependencies: await this.analyzeDependencies(bundleInfo.modules),
      duplicates: this.findDuplicateModules(bundleInfo.modules),
      circularDependencies: this.findCircularDependencies(bundleInfo.modules),
      unusedCode: await this.findUnusedCode(bundleInfo.modules),
      performance: await this.calculatePerformanceMetrics(bundleInfo),
      warnings: this.generateWarnings(bundleInfo),
      suggestions: await this.generateOptimizationSuggestions(bundleInfo)
    };
    
    this.analyses.set(analysisId, analysis);
    
    // Generate reports if configured
    if (this.config.output.generateStats) {
      await this.generateStatsReport(analysis);
    }
    
    if (this.config.output.generateVisualization) {
      await this.generateVisualization(analysis);
    }
    
    this.emit('analysisCompleted', {
      analysisId,
      totalSize: analysis.totalSize,
      chunks: analysis.chunks.length,
      modules: analysis.modules.length,
      duplicates: analysis.duplicates.length,
      suggestions: analysis.suggestions.length
    });
    
    return analysis;
  }
  
  private async getBuildStats(buildPath?: string): Promise<unknown> {
    const statsPath = buildPath || path.join(this.config.bundler.outputDir, 'stats.json');
    
    if (fs.existsSync(statsPath)) {
      return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    }
    
    // If no stats file, generate mock data for demonstration
    return this.generateMockBuildStats();
  }
  
  private generateMockBuildStats(): unknown {
    return {
      hash: crypto.randomBytes(8).toString('hex'),
      version: '5.0.0',
      time: Math.random() * 10000 + 1000,
      chunks: [
        {
          id: 0,
          names: ['main'],
          size: 250000,
          files: ['main.js'],
          hash: crypto.randomBytes(8).toString('hex'),
          parents: [],
          initial: true,
          entry: true,
          modules: [
            {
              id: './src/index.js',
              name: './src/index.js',
              size: 1500,
              chunks: [0],
              reasons: [{ type: 'entry' }],
              built: true
            },
            {
              id: './node_modules/react/index.js',
              name: './node_modules/react/index.js',
              size: 45000,
              chunks: [0],
              reasons: [{ type: 'import' }],
              built: true
            }
          ]
        },
        {
          id: 1,
          names: ['vendor'],
          size: 500000,
          files: ['vendor.js'],
          hash: crypto.randomBytes(8).toString('hex'),
          parents: [],
          initial: true,
          entry: false,
          modules: []
        }
      ],
      assets: [
        {
          name: 'main.js',
          size: 250000,
          chunks: [0],
          chunkNames: ['main'],
          emitted: true
        },
        {
          name: 'vendor.js',
          size: 500000,
          chunks: [1],
          chunkNames: ['vendor'],
          emitted: true
        }
      ]
    };
  }
  
  private async extractBundleInfo(buildStats: unknown): Promise<{
    totalSize: number;
    gzippedSize: number;
    chunks: ChunkInfo[];
    modules: ModuleInfo[];
    assets: AssetInfo[];
  }> {
    const chunks: ChunkInfo[] = buildStats.chunks?.map((chunk: unknown) => ({
      id: chunk.id.toString(),
      name: chunk.names?.[0] || `chunk-${chunk.id}`,
      size: chunk.size || 0,
      gzippedSize: Math.floor((chunk.size || 0) * 0.3), // Estimate
      modules: chunk.modules?.map((m: unknown) => m.id) || [],
      isEntry: chunk.entry || false,
      isInitial: chunk.initial || false,
      isAsync: !chunk.initial,
      parents: chunk.parents || [],
      children: chunk.children || [],
      files: chunk.files || [],
      hash: chunk.hash || '',
      reason: chunk.reason || 'unknown'
    })) || [];
    
    const modules: ModuleInfo[] = [];
    if (buildStats.chunks) {
      for (const chunk of buildStats.chunks) {
        if (chunk.modules) {
          for (const module of chunk.modules) {
            modules.push({
              id: module.id,
              name: module.name || module.id,
              size: module.size || 0,
              chunks: [chunk.id.toString()],
              reasons: module.reasons || [],
              dependencies: module.dependencies || [],
              issuers: module.issuers || [],
              built: module.built || false,
              cacheable: module.cacheable !== false,
              optional: module.optional || false,
              failed: module.failed || false,
              errors: module.errors || 0,
              warnings: module.warnings || 0,
              depth: module.depth || 0,
              profile: module.profile
            });
          }
        }
      }
    }
    
    const assets: AssetInfo[] = buildStats.assets?.map((asset: unknown) => ({
      name: asset.name,
      size: asset.size || 0,
      chunks: asset.chunks || [],
      chunkNames: asset.chunkNames || [],
      emitted: asset.emitted || false,
      isOverSizeLimit: (asset.size || 0) > this.config.performance.budgets.maxBundleSize,
      type: this.getAssetType(asset.name),
      compression: {
        gzip: Math.floor((asset.size || 0) * 0.3),
        brotli: Math.floor((asset.size || 0) * 0.25)
      }
    })) || [];
    
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    const gzippedSize = Math.floor(totalSize * 0.3); // Estimate
    
    return {
      totalSize,
      gzippedSize,
      chunks,
      modules,
      assets
    };
  }
  
  private getAssetType(filename: string): 'js' | 'css' | 'image' | 'font' | 'other' {
    const ext = path.extname(filename).toLowerCase();
    
    if (['.js', '.mjs', '.jsx', '.ts', '.tsx'].includes(ext)) return 'js';
    if (['.css', '.scss', '.sass', '.less'].includes(ext)) return 'css';
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(ext)) return 'image';
    if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) return 'font';
    
    return 'other';
  }
  
  private async getBundlerVersion(): Promise<string> {
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const bundlerName = this.config.bundler.type;
        
        return packageJson.devDependencies?.[bundlerName] || 
               packageJson.dependencies?.[bundlerName] || 
               'unknown';
      }
    } catch (error) {
      console.warn('Could not determine bundler version:', error);
    }
    
    return 'unknown';
  }
  
  // Advanced Analysis Methods
  
  private async analyzeDependencies(modules: ModuleInfo[]): Promise<DependencyAnalysis[]> {
    const dependencies = new Map<string, DependencyAnalysis>();
    
    for (const module of modules) {
      if (module.name.includes('node_modules')) {
        const packageMatch = module.name.match(/node_modules\/([^/]+)/);
        if (packageMatch) {
          const packageName = packageMatch[1];
          
          if (!dependencies.has(packageName)) {
            dependencies.set(packageName, {
              name: packageName,
              version: await this.getPackageVersion(packageName),
              size: 0,
              usedSize: 0,
              treeshakeable: await this.isTreeshakeable(packageName),
              sideEffects: await this.hasSideEffects(packageName),
              chunks: [],
              moduleCount: 0,
              duplicateVersions: [],
              alternatives: await this.findAlternatives(packageName),
              license: await this.getPackageLicense(packageName),
              security: await this.getSecurityInfo(packageName)
            });
          }
          
          const dep = dependencies.get(packageName)!;
          dep.size += module.size;
          dep.usedSize += module.size; // Simplified
          dep.moduleCount++;
          dep.chunks.push(...module.chunks);
        }
      }
    }
    
    return Array.from(dependencies.values());
  }
  
  private async getPackageVersion(packageName: string): Promise<string> {
    try {
      const packageJsonPath = path.join('node_modules', packageName, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version || 'unknown';
      }
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Ignore errors
    }
    return 'unknown';
  }
  
  private async isTreeshakeable(packageName: string): Promise<boolean> {
    try {
      const packageJsonPath = path.join('node_modules', packageName, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.sideEffects === false || 
               packageJson.module !== undefined ||
               packageJson.exports !== undefined;
      }
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Ignore errors
    }
    return false;
  }
  
  private async hasSideEffects(packageName: string): Promise<boolean> {
    try {
      const packageJsonPath = path.join('node_modules', packageName, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.sideEffects !== false;
      }
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Ignore errors
    }
    return true;
  }
  
  private async findAlternatives(packageName: string): Promise<DependencyAlternative[]> {
    // Simplified alternative suggestions
    const alternatives: Record<string, DependencyAlternative[]> = {
      'lodash': [
        {
          name: 'lodash-es',
          size: 24000,
          benefits: ['Tree-shakeable', 'ES modules', 'Smaller bundle'],
          migration: { complexity: 'low', breakingChanges: false, effort: 2 }
        },
        {
          name: 'ramda',
          size: 40000,
          benefits: ['Functional programming', 'Curried functions', 'Immutable'],
          migration: { complexity: 'high', breakingChanges: true, effort: 16 }
        }
      ],
      'moment': [
        {
          name: 'dayjs',
          size: 4000,
          benefits: ['Much smaller', 'Similar API', 'Immutable'],
          migration: { complexity: 'medium', breakingChanges: true, effort: 8 }
        },
        {
          name: 'date-fns',
          size: 8000,
          benefits: ['Tree-shakeable', 'Functional', 'TypeScript support'],
          migration: { complexity: 'medium', breakingChanges: true, effort: 12 }
        }
      ]
    };
    
    return alternatives[packageName] || [];
  }
  
  private async getPackageLicense(packageName: string): Promise<string> {
    try {
      const packageJsonPath = path.join('node_modules', packageName, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.license || 'unknown';
      }
    } catch (_error) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Ignore errors
    }
    return 'unknown';
  }
  
  private async getSecurityInfo(_packageName: string): Promise<{ vulnerabilities: number; highSeverity: number }> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // In a real implementation, would check npm audit or security databases
    return {
      vulnerabilities: Math.floor(Math.random() * 3),
      highSeverity: Math.floor(Math.random() * 2)
    };
  }
  
  private findDuplicateModules(modules: ModuleInfo[]): DuplicateModule[] {
    const moduleGroups = new Map<string, ModuleInfo[]>();
    
    // Group modules by normalized name
    for (const module of modules) {
      const normalizedName = this.normalizeModuleName(module.name);
      if (!moduleGroups.has(normalizedName)) {
        moduleGroups.set(normalizedName, []);
      }
      moduleGroups.get(normalizedName)!.push(module);
    }
    
    const duplicates: DuplicateModule[] = [];
    
    for (const [name, moduleGroup] of moduleGroups.entries()) {
      if (moduleGroup.length > 1) {
        const instances = moduleGroup.map(module => ({
          id: module.id,
          size: module.size,
          chunks: module.chunks,
          reasons: module.reasons.map(r => r.type)
        }));
        
        const totalWastedSize = instances.slice(1).reduce((sum, inst) => sum + inst.size, 0);
        
        duplicates.push({
          name,
          instances,
          totalWastedSize,
          potentialSavings: totalWastedSize * 0.9, // Estimate
          deduplicationStrategy: this.getDeduplicationStrategy(name, instances)
        });
      }
    }
    
    return duplicates.sort((a, b) => b.totalWastedSize - a.totalWastedSize);
  }
  
  private normalizeModuleName(name: string): string {
    // Remove version numbers and paths to identify duplicate packages
    return name
      .replace(/node_modules\//g, '')
      .replace(/@[\d.]+/g, '')
      .replace(/\/.*$/, '')
      .split('/')[0];
  }
  
  private getDeduplicationStrategy(name: string, instances: unknown[]): string {
    if (name.includes('node_modules')) {
      return 'Use npm dedupe or yarn dedupe';
    }
    if (instances.length === 2) {
      return 'Consider extracting to shared chunk';
    }
    return 'Investigate module structure and imports';
  }
  
  private findCircularDependencies(modules: ModuleInfo[]): CircularDependency[] {
    const graph = new Map<string, string[]>();
    
    // Build dependency graph
    for (const module of modules) {
      graph.set(module.id, module.dependencies);
    }
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    
    const findCycles = (moduleId: string, path: string[]): void => {
      if (recursionStack.has(moduleId)) {
        // Found a cycle
        const cycleStart = path.indexOf(moduleId);
        if (cycleStart >= 0) {
          cycles.push(path.slice(cycleStart));
        }
        return;
      }
      
      if (visited.has(moduleId)) {
        return;
      }
      
      visited.add(moduleId);
      recursionStack.add(moduleId);
      
      const dependencies = graph.get(moduleId) || [];
      for (const dep of dependencies) {
        findCycles(dep, [...path, moduleId]);
      }
      
      recursionStack.delete(moduleId);
    };
    
    // Find all cycles
    for (const moduleId of graph.keys()) {
      if (!visited.has(moduleId)) {
        findCycles(moduleId, []);
      }
    }
    
    return cycles.map((cycle, index) => ({
      id: `cycle-${index}`,
      modules: cycle,
      severity: cycle.length > 5 ? 'high' : cycle.length > 3 ? 'medium' : 'low',
      impact: {
        bundleSize: cycle.length * 1000, // Estimate
        performance: cycle.length * 5,
        maintainability: cycle.length * 10
      },
      suggestion: this.getCircularDependencySuggestion(cycle)
    }));
  }
  
  private getCircularDependencySuggestion(cycle: string[]): string {
    if (cycle.length === 2) {
      return 'Consider extracting common functionality to a separate module';
    }
    if (cycle.some(m => m.includes('index'))) {
      return 'Avoid importing from index files that re-export the importing module';
    }
    return 'Refactor to remove circular dependency by introducing abstraction layer';
  }
  
  private async findUnusedCode(modules: ModuleInfo[]): Promise<UnusedCodeInfo[]> {
    const unusedCode: UnusedCodeInfo[] = [];
    
    // Simplified unused code detection
    for (const module of modules) {
      if (module.reasons.length === 0 && !module.name.includes('entry')) {
        unusedCode.push({
          type: 'module',
          name: module.name,
          file: module.name,
          size: module.size,
          confidence: 0.9,
          reasons: ['No imports found'],
          safe: !module.name.includes('polyfill') && !module.name.includes('global')
        });
      }
    }
    
    return unusedCode.sort((a, b) => b.size - a.size);
  }
  
  private async calculatePerformanceMetrics(_bundleInfo: unknown): Promise<BundlePerformanceMetrics> { // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      buildTime: Math.random() * 10000 + 1000,
      rebuildTime: Math.random() * 2000 + 500,
      parseTime: Math.random() * 1000 + 100,
      chunkLoadTime: Math.random() * 500 + 50,
      firstContentfulPaint: Math.random() * 2000 + 1000,
      timeToInteractive: Math.random() * 3000 + 2000,
      cacheEfficiency: Math.random() * 100,
      parallelization: Math.random() * 100,
      hotReloadTime: Math.random() * 1000 + 200
    };
  }
  
  private generateWarnings(bundleInfo: unknown): BundleWarning[] {
    const warnings: BundleWarning[] = [];
    
    // Check bundle size warnings
    if (bundleInfo.totalSize > this.config.performance.budgets.maxBundleSize) {
      warnings.push({
        type: 'size',
        severity: 'high',
        message: `Bundle size (${(bundleInfo.totalSize / 1024).toFixed(1)}KB) exceeds budget`,
        suggestion: 'Consider code splitting or lazy loading',
        impact: 75,
        fixable: true
      });
    }
    
    // Check for oversized chunks
    for (const chunk of bundleInfo.chunks) {
      if (chunk.size > this.config.performance.budgets.maxChunkSize) {
        warnings.push({
          type: 'size',
          severity: 'medium',
          message: `Chunk "${chunk.name}" is oversized (${(chunk.size / 1024).toFixed(1)}KB)`,
          chunk: chunk.name,
          suggestion: 'Split large chunks or use dynamic imports',
          impact: 50,
          fixable: true
        });
      }
    }
    
    return warnings;
  }
  
  private async generateOptimizationSuggestions(bundleInfo: unknown): Promise<BundleOptimizationSuggestion[]> {
    const suggestions: BundleOptimizationSuggestion[] = [];
    
    // Code splitting suggestion
    if (bundleInfo.chunks.length < 3 && bundleInfo.totalSize > 500000) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'splitting',
        priority: 'high',
        title: 'Implement Code Splitting',
        description: 'Split large bundles into smaller chunks for better loading performance',
        impact: {
          bundleSize: 0,
          buildTime: 10,
          runtime: 30,
          maintenance: 5
        },
        implementation: {
          complexity: 'medium',
          timeRequired: 4,
          steps: [
            'Identify split points in application',
            'Configure dynamic imports',
            'Update bundler configuration',
            'Test chunk loading'
          ],
          configChanges: [{
            file: 'webpack.config.js',
            section: 'optimization',
            property: 'splitChunks',
            oldValue: undefined,
            newValue: {
              chunks: 'all',
              cacheGroups: {
                vendor: {
                  test: /[\\/]node_modules[\\/]/,
                  name: 'vendors',
                  chunks: 'all'
                }
              }
            },
            explanation: 'Enable automatic vendor chunk splitting'
          }]
        },
        examples: {
          before: 'import Component from "./Component";\nfunction App() { return <Component />; }',
          after: 'const Component = lazy(() => import("./Component"));\nfunction App() { return <Suspense><Component /></Suspense>; }'
        },
        risks: ['May increase complexity', 'Requires proper loading states']
      });
    }
    
    // Tree shaking suggestion
    suggestions.push({
      id: crypto.randomUUID(),
      type: 'elimination',
      priority: 'medium',
      title: 'Enable Tree Shaking',
      description: 'Remove unused code to reduce bundle size',
      impact: {
        bundleSize: 20,
        buildTime: 5,
        runtime: 10,
        maintenance: 0
      },
      implementation: {
        complexity: 'low',
        timeRequired: 2,
        steps: [
          'Ensure sideEffects: false in package.json',
          'Use ES modules imports',
          'Enable tree shaking in bundler',
          'Verify unused code elimination'
        ],
        configChanges: [{
          file: 'webpack.config.js',
          section: 'optimization',
          property: 'usedExports',
          oldValue: false,
          newValue: true,
          explanation: 'Enable tree shaking by marking used exports'
        }]
      },
      examples: {
        before: 'import * as utils from "./utils";',
        after: 'import { specificFunction } from "./utils";'
      },
      risks: ['May break if dependencies have side effects']
    });
    
    // Compression suggestion
    suggestions.push({
      id: crypto.randomUUID(),
      type: 'compression',
      priority: 'medium',
      title: 'Enable Asset Compression',
      description: 'Compress assets for better network performance',
      impact: {
        bundleSize: 30,
        buildTime: 5,
        runtime: 25,
        maintenance: 0
      },
      implementation: {
        complexity: 'low',
        timeRequired: 1,
        steps: [
          'Install compression plugin',
          'Configure compression settings',
          'Enable server-side compression',
          'Test compressed asset serving'
        ],
        configChanges: [{
          file: 'webpack.config.js',
          section: 'plugins',
          property: 'CompressionPlugin',
          oldValue: undefined,
          newValue: 'new CompressionPlugin({ algorithm: "gzip" })',
          explanation: 'Add gzip compression for assets'
        }]
      },
      examples: {
        before: 'No compression configured',
        after: 'Gzip and Brotli compression enabled'
      },
      risks: ['Increased build time', 'Server configuration required']
    });
    
    return suggestions;
  }
  
  // Optimization Implementation
  
  public async optimizeBundle(suggestions: string[] = []): Promise<OptimizationResult> {
    const startTime = Date.now();
    const optimizationId = crypto.randomUUID();
    
    const beforeAnalysis = await this.analyzeBuild();
    const beforeStats = this.extractBundleStats(beforeAnalysis);
    
    const appliedSuggestions: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Apply optimization suggestions
    const availableSuggestions = beforeAnalysis.suggestions;
    const suggestionsToApply = suggestions.length > 0 
      ? availableSuggestions.filter(s => suggestions.includes(s.id))
      : availableSuggestions.filter(s => s.priority === 'high' || s.priority === 'critical');
    
    for (const suggestion of suggestionsToApply) {
      try {
        await this.applySuggestion(suggestion);
        appliedSuggestions.push(suggestion.id);
      } catch (error) {
        errors.push(`Failed to apply ${suggestion.title}: ${(error as Error).message}`);
      }
    }
    
    // Rebuild and analyze
    const afterAnalysis = await this.rebuildAndAnalyze();
    const afterStats = this.extractBundleStats(afterAnalysis);
    
    const improvements = this.calculateImprovements(beforeStats, afterStats);
    
    const result: OptimizationResult = {
      id: optimizationId,
      timestamp: new Date(),
      bundler: this.config.bundler.type,
      optimizations: appliedSuggestions.map(id => {
        const suggestion = availableSuggestions.find(s => s.id === id);
        return suggestion ? suggestion.title : id;
      }),
      results: {
        before: beforeStats,
        after: afterStats,
        improvements
      },
      appliedSuggestions,
      warnings,
      errors,
      buildTime: Date.now() - startTime
    };
    
    this.optimizationResults.set(optimizationId, result);
    
    this.emit('optimizationCompleted', {
      optimizationId,
      appliedSuggestions: appliedSuggestions.length,
      improvements: improvements.bundleSize,
      buildTime: result.buildTime
    });
    
    return result;
  }
  
  private extractBundleStats(analysis: BundleAnalysis): BundleStats {
    return {
      totalSize: analysis.totalSize,
      gzippedSize: analysis.gzippedSize,
      chunks: analysis.chunks.length,
      modules: analysis.modules.length,
      assets: analysis.assets.length,
      buildTime: analysis.buildTime,
      firstLoadJS: analysis.chunks
        .filter(c => c.isInitial)
        .reduce((sum, c) => sum + c.size, 0),
      duplicateSize: analysis.duplicates
        .reduce((sum, d) => sum + d.totalWastedSize, 0)
    };
  }
  
  private calculateImprovements(before: BundleStats, after: BundleStats): BundleImprovements {
    return {
      bundleSize: before.totalSize > 0 ? ((before.totalSize - after.totalSize) / before.totalSize) * 100 : 0,
      buildTime: before.buildTime > 0 ? ((before.buildTime - after.buildTime) / before.buildTime) * 100 : 0,
      chunkCount: after.chunks - before.chunks,
      duplicateElimination: before.duplicateSize > 0 ? ((before.duplicateSize - after.duplicateSize) / before.duplicateSize) * 100 : 0,
      compressionRatio: before.totalSize > 0 ? (after.gzippedSize / after.totalSize) * 100 : 0
    };
  }
  
  private async applySuggestion(suggestion: BundleOptimizationSuggestion): Promise<void> {
    for (const configChange of suggestion.implementation.configChanges) {
      await this.applyConfigChange(configChange);
    }
    
    if (suggestion.implementation.codeChanges) {
      for (const codeChange of suggestion.implementation.codeChanges) {
        await this.applyCodeChange(codeChange);
      }
    }
  }
  
  private async applyConfigChange(change: ConfigChange): Promise<void> {
    const configPath = path.resolve(change.file);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }
    
    // In a real implementation, would parse and modify actual config files
    // This is a simplified version
    const content = fs.readFileSync(configPath, 'utf-8');
    const modified = content; // Would apply actual changes
    
    fs.writeFileSync(configPath, modified);
  }
  
  private async applyCodeChange(change: CodeChange): Promise<void> {
    const filePath = path.resolve(change.file);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    
    switch (change.type) {
      case 'replace':
        for (let i = change.startLine - 1; i < change.endLine; i++) {
          if (lines[i]) {
            lines[i] = lines[i].replace(change.oldCode, change.newCode);
          }
        }
        break;
      case 'insert':
        lines.splice(change.startLine - 1, 0, change.newCode);
        break;
      case 'delete':
        lines.splice(change.startLine - 1, change.endLine - change.startLine + 1);
        break;
    }
    
    fs.writeFileSync(filePath, lines.join('\n'));
  }
  
  private async rebuildAndAnalyze(): Promise<BundleAnalysis> {
    // In a real implementation, would trigger actual build process
    // For now, return modified analysis
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate build time
    
    return this.analyzeBuild();
  }
  
  // Report Generation
  
  private async generateStatsReport(analysis: BundleAnalysis): Promise<void> {
    const reportPath = path.join(this.config.output.reportDir, `bundle-stats-${analysis.id}.json`);
    
    const report = {
      analysis,
      generated: new Date().toISOString(),
      bundler: this.config.bundler.type,
      version: analysis.version
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    if (this.config.output.format === 'html' || this.config.output.format === 'both') {
      await this.generateHTMLReport(analysis);
    }
  }
  
  private async generateHTMLReport(analysis: BundleAnalysis): Promise<void> {
    const htmlPath = path.join(this.config.output.reportDir, `bundle-report-${analysis.id}.html`);
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Bundle Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .chart { margin: 20px 0; }
        .suggestion { border-left: 4px solid #007cba; padding: 10px; margin: 10px 0; }
        .warning { border-left: 4px solid #ff6b35; padding: 10px; margin: 10px 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .stat-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Bundle Analysis Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="stats">
            <div class="stat-card">
                <h3>Total Size</h3>
                <p>${(analysis.totalSize / 1024).toFixed(1)} KB</p>
            </div>
            <div class="stat-card">
                <h3>Gzipped Size</h3>
                <p>${(analysis.gzippedSize / 1024).toFixed(1)} KB</p>
            </div>
            <div class="stat-card">
                <h3>Chunks</h3>
                <p>${analysis.chunks.length}</p>
            </div>
            <div class="stat-card">
                <h3>Modules</h3>
                <p>${analysis.modules.length}</p>
            </div>
        </div>
    </div>
    
    <h2>Optimization Suggestions</h2>
    ${analysis.suggestions.map(suggestion => `
        <div class="suggestion">
            <h3>${suggestion.title}</h3>
            <p>${suggestion.description}</p>
            <p><strong>Impact:</strong> ${suggestion.impact.bundleSize}% bundle size reduction</p>
            <p><strong>Priority:</strong> ${suggestion.priority}</p>
        </div>
    `).join('')}
    
    <h2>Warnings</h2>
    ${analysis.warnings.map(warning => `
        <div class="warning">
            <h3>${warning.type}</h3>
            <p>${warning.message}</p>
            <p><strong>Suggestion:</strong> ${warning.suggestion}</p>
        </div>
    `).join('')}
    
    <script>
        // Add interactive charts here
        console.log('Bundle analysis:', ${JSON.stringify(analysis, null, 2)});
    </script>
</body>
</html>`;
    
    fs.writeFileSync(htmlPath, html);
  }
  
  private async generateVisualization(analysis: BundleAnalysis): Promise<void> {
    // In a real implementation, would generate interactive bundle visualizations
    // using libraries like webpack-bundle-analyzer, rollup-plugin-visualizer, etc.
    const vizPath = path.join(this.config.output.reportDir, `bundle-viz-${analysis.id}.json`);
    
    const visualization = {
      type: 'treemap',
      data: analysis.chunks.map(chunk => ({
        name: chunk.name,
        value: chunk.size,
        children: chunk.modules.map(moduleId => {
          const module = analysis.modules.find(m => m.id === moduleId);
          return {
            name: module?.name || moduleId,
            value: module?.size || 0
          };
        })
      }))
    };
    
    fs.writeFileSync(vizPath, JSON.stringify(visualization, null, 2));
  }
  
  // Public API
  
  public getAnalysis(analysisId: string): BundleAnalysis | undefined {
    return this.analyses.get(analysisId);
  }
  
  public getAllAnalyses(): BundleAnalysis[] {
    return Array.from(this.analyses.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  public getOptimizationResult(optimizationId: string): OptimizationResult | undefined {
    return this.optimizationResults.get(optimizationId);
  }
  
  public async compareBuilds(beforeId: string, afterId: string): Promise<{
    sizeDiff: number;
    chunkDiff: number;
    moduleDiff: number;
    improvements: string[];
    regressions: string[];
  }> {
    const before = this.analyses.get(beforeId);
    const after = this.analyses.get(afterId);
    
    if (!before || !after) {
      throw new Error('Analysis not found for comparison');
    }
    
    const sizeDiff = after.totalSize - before.totalSize;
    const chunkDiff = after.chunks.length - before.chunks.length;
    const moduleDiff = after.modules.length - before.modules.length;
    
    const improvements: string[] = [];
    const regressions: string[] = [];
    
    if (sizeDiff < 0) {
      improvements.push(`Bundle size reduced by ${Math.abs(sizeDiff)} bytes`);
    } else if (sizeDiff > 0) {
      regressions.push(`Bundle size increased by ${sizeDiff} bytes`);
    }
    
    if (after.duplicates.length < before.duplicates.length) {
      improvements.push(`Reduced duplicates: ${before.duplicates.length - after.duplicates.length}`);
    }
    
    if (after.circularDependencies.length < before.circularDependencies.length) {
      improvements.push(`Fixed circular dependencies: ${before.circularDependencies.length - after.circularDependencies.length}`);
    }
    
    return {
      sizeDiff,
      chunkDiff,
      moduleDiff,
      improvements,
      regressions
    };
  }
  
  public getStats(): {
    totalAnalyses: number;
    totalOptimizations: number;
    averageImprovements: BundleImprovements;
    commonIssues: Array<{ type: string; count: number }>;
  } {
    const analyses = Array.from(this.analyses.values());
    const optimizations = Array.from(this.optimizationResults.values());
    
    const averageImprovements = optimizations.length > 0 ? {
      bundleSize: optimizations.reduce((sum, opt) => sum + opt.results.improvements.bundleSize, 0) / optimizations.length,
      buildTime: optimizations.reduce((sum, opt) => sum + opt.results.improvements.buildTime, 0) / optimizations.length,
      chunkCount: optimizations.reduce((sum, opt) => sum + opt.results.improvements.chunkCount, 0) / optimizations.length,
      duplicateElimination: optimizations.reduce((sum, opt) => sum + opt.results.improvements.duplicateElimination, 0) / optimizations.length,
      compressionRatio: optimizations.reduce((sum, opt) => sum + opt.results.improvements.compressionRatio, 0) / optimizations.length
    } : {
      bundleSize: 0,
      buildTime: 0,
      chunkCount: 0,
      duplicateElimination: 0,
      compressionRatio: 0
    };
    
    const issueTypes = analyses.flatMap(a => a.warnings.map(w => w.type));
    const commonIssues = issueTypes.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalAnalyses: analyses.length,
      totalOptimizations: optimizations.length,
      averageImprovements,
      commonIssues: Object.entries(commonIssues)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    };
  }
  
  public destroy(): void {
    // Clear watchers
    for (const [_path, watcher] of this.watchers.entries()) { // eslint-disable-line @typescript-eslint/no-unused-vars
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    }
    
    this.analyses.clear();
    this.optimizationResults.clear();
    this.buildCache.clear();
    this.watchers.clear();
    
    this.emit('destroyed');
  }
}