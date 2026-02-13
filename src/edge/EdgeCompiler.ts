/**
 * Edge Workflow Compiler
 * Compiles workflows for edge deployment with optimization and minification
 * Generates platform-specific bundles with minimal dependencies
 */

import { logger } from '../services/SimpleLogger';
import type { CompiledWorkflow } from '../types/edge';
import type { Workflow, WorkflowNode } from '../types/workflowTypes';

export interface CompilerOptions {
  targetPlatform: 'node' | 'deno' | 'browser';
  optimization: 'none' | 'basic' | 'aggressive';
  minify: boolean;
  treeShake: boolean;
  bundleDependencies: boolean;
  targetSize?: number; // Target size in bytes
  includeSourceMap: boolean;
}

export interface CompilationResult {
  workflow: CompiledWorkflow;
  stats: {
    originalSize: number;
    compiledSize: number;
    compressionRatio: number;
    dependenciesIncluded: number;
    nodesCompiled: number;
    compilationTime: number; // ms
  };
  warnings: string[];
  errors: string[];
}

export class EdgeCompiler {
  private defaultOptions: CompilerOptions = {
    targetPlatform: 'node',
    optimization: 'aggressive',
    minify: true,
    treeShake: true,
    bundleDependencies: true,
    includeSourceMap: false
  };

  /**
   * Compile a workflow for edge deployment
   */
  async compile(
    workflow: Workflow,
    options: Partial<CompilerOptions> = {}
  ): Promise<CompilationResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];
    const errors: string[] = [];

    logger.info('Starting workflow compilation', {
      context: {
        workflowId: workflow.id,
        platform: opts.targetPlatform,
        optimization: opts.optimization
      }
    });

    try {
      // Step 1: Analyze workflow
      const analysis = this.analyzeWorkflow(workflow);

      if (analysis.warnings.length > 0) {
        warnings.push(...analysis.warnings);
      }

      // Step 2: Generate code
      const code = this.generateCode(workflow, opts);

      // Step 3: Optimize code
      const optimizedCode = this.optimizeCode(code, opts);

      // Step 4: Minify if enabled
      const finalCode = opts.minify ? this.minifyCode(optimizedCode) : optimizedCode;

      // Step 5: Bundle dependencies
      const dependencies = opts.bundleDependencies
        ? this.extractDependencies(workflow)
        : [];

      // Step 6: Tree shake unused code
      const shakenCode = opts.treeShake
        ? this.treeShake(finalCode, workflow)
        : finalCode;

      // Step 7: Calculate checksum
      const checksum = this.calculateChecksum(shakenCode);

      // Create compiled workflow
      const compiled: CompiledWorkflow = {
        id: workflow.id,
        name: workflow.name,
        version: workflow.version || '1.0.0',
        compiled: {
          code: shakenCode,
          size: new Blob([shakenCode]).size,
          checksum
        },
        dependencies,
        targetPlatform: opts.targetPlatform,
        optimization: {
          level: opts.optimization,
          minified: opts.minify,
          treeShaken: opts.treeShake
        },
        metadata: {
          compiledAt: new Date(),
          compiler: 'EdgeCompiler/1.0.0',
          sourceNodes: workflow.nodes.length,
          targetSize: opts.targetSize || 0
        }
      };

      const compilationTime = Date.now() - startTime;

      const result: CompilationResult = {
        workflow: compiled,
        stats: {
          originalSize: this.estimateWorkflowSize(workflow),
          compiledSize: compiled.compiled.size,
          compressionRatio: this.estimateWorkflowSize(workflow) / compiled.compiled.size,
          dependenciesIncluded: dependencies.length,
          nodesCompiled: workflow.nodes.length,
          compilationTime
        },
        warnings,
        errors
      };

      logger.info('Workflow compiled successfully', {
        context: {
          workflowId: workflow.id,
          compiledSize: compiled.compiled.size,
          compressionRatio: result.stats.compressionRatio.toFixed(2),
          compilationTime
        }
      });

      return result;

    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));

      logger.error('Workflow compilation failed', {
        context: {
          workflowId: workflow.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });

      throw error;
    }
  }

  /**
   * Analyze workflow for optimization opportunities
   */
  private analyzeWorkflow(workflow: Workflow): {
    complexity: number;
    dependencies: string[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const dependencies = new Set<string>();

    // Calculate complexity
    let complexity = workflow.nodes.length;

    for (const node of workflow.nodes) {
      // Check for heavy nodes
      if (this.isHeavyNode(node)) {
        warnings.push(`Node ${node.id} (${node.type}) may be resource-intensive on edge devices`);
        complexity += 5;
      }

      // Extract dependencies
      const nodeConfig = node.data?.config as { dependencies?: string[] } | undefined;
      if (nodeConfig?.dependencies) {
        nodeConfig.dependencies.forEach(dep => dependencies.add(dep));
      }

      // Check for cloud-only features
      if (this.requiresCloud(node)) {
        warnings.push(`Node ${node.id} (${node.type}) requires cloud connectivity`);
      }
    }

    return {
      complexity,
      dependencies: Array.from(dependencies),
      warnings
    };
  }

  /**
   * Generate executable code from workflow
   */
  private generateCode(workflow: Workflow, options: CompilerOptions): string {
    const lines: string[] = [];

    // Header
    lines.push('// Edge Workflow - Compiled');
    lines.push(`// Workflow: ${workflow.name}`);
    lines.push(`// ID: ${workflow.id}`);
    lines.push(`// Platform: ${options.targetPlatform}`);
    lines.push(`// Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Runtime setup
    if (options.targetPlatform === 'deno') {
      lines.push('// Deno runtime');
    } else if (options.targetPlatform === 'node') {
      lines.push('// Node.js runtime');
    } else {
      lines.push('// Browser runtime');
    }
    lines.push('');

    // Main execution function
    lines.push('async function executeWorkflow(input) {');
    lines.push('  const results = {};');
    lines.push('  const context = { input, results };');
    lines.push('');

    // Sort nodes in execution order
    const sortedNodes = this.topologicalSort(workflow.nodes, workflow.edges);

    // Generate code for each node
    for (const node of sortedNodes) {
      lines.push(`  // Node: ${node.id} (${node.type})`);
      lines.push(this.generateNodeCode(node, options));
      lines.push('');
    }

    lines.push('  return results;');
    lines.push('}');
    lines.push('');

    // Export
    if (options.targetPlatform === 'deno') {
      lines.push('export { executeWorkflow };');
    } else if (options.targetPlatform === 'node') {
      lines.push('module.exports = { executeWorkflow };');
    } else {
      lines.push('window.executeWorkflow = executeWorkflow;');
    }

    return lines.join('\n');
  }

  /**
   * Generate code for a single node
   */
  private generateNodeCode(node: WorkflowNode, options: CompilerOptions): string {
    const lines: string[] = [];

    switch (node.type) {
      case 'trigger':
        lines.push(`  // Trigger node - skipped in compiled version`);
        break;

      case 'http-request':
        const httpConfig = node.data?.config as { url?: string; method?: string; headers?: Record<string, string>; body?: unknown } | undefined;
        lines.push(`  results['${node.id}'] = await fetch('${httpConfig?.url || ''}', {`);
        lines.push(`    method: '${httpConfig?.method || 'GET'}',`);
        lines.push(`    headers: ${JSON.stringify(httpConfig?.headers || {})},`);
        if (httpConfig?.body) {
          lines.push(`    body: JSON.stringify(${JSON.stringify(httpConfig.body)})`);
        }
        lines.push(`  }).then(r => r.json());`);
        break;

      case 'code':
        // Execute custom code
        const codeConfig = node.data?.config as { code?: string } | undefined;
        const code = codeConfig?.code || '// No code';
        lines.push(`  results['${node.id}'] = await (async () => {`);
        lines.push(`    ${code}`);
        lines.push(`  })();`);
        break;

      case 'filter':
        const filterConfig = node.data?.config as { condition?: string } | undefined;
        lines.push(`  results['${node.id}'] = context.input.filter(item => {`);
        lines.push(`    return ${filterConfig?.condition || 'true'};`);
        lines.push(`  });`);
        break;

      case 'transform':
        const transformConfig = node.data?.config as { transform?: string } | undefined;
        lines.push(`  results['${node.id}'] = context.input.map(item => {`);
        lines.push(`    return ${transformConfig?.transform || 'item'};`);
        lines.push(`  });`);
        break;

      default:
        lines.push(`  results['${node.id}'] = { type: '${node.type}', data: ${JSON.stringify(node.data || {})} };`);
    }

    return lines.join('\n');
  }

  /**
   * Optimize generated code
   */
  private optimizeCode(code: string, options: CompilerOptions): string {
    let optimized = code;

    if (options.optimization === 'none') {
      return optimized;
    }

    // Basic optimizations
    if (options.optimization === 'basic' || options.optimization === 'aggressive') {
      // Remove comments
      optimized = optimized.replace(/\/\/.*$/gm, '');
      optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');

      // Remove extra whitespace
      optimized = optimized.replace(/\n\s*\n/g, '\n');
    }

    // Aggressive optimizations
    if (options.optimization === 'aggressive') {
      // Inline constants
      optimized = this.inlineConstants(optimized);

      // Dead code elimination
      optimized = this.eliminateDeadCode(optimized);

      // Function inlining for small functions
      optimized = this.inlineSmallFunctions(optimized);
    }

    return optimized;
  }

  /**
   * Minify code
   */
  private minifyCode(code: string): string {
    // Simple minification (in production, use terser or similar)
    let minified = code;

    // Remove all comments
    minified = minified.replace(/\/\/.*$/gm, '');
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');

    // Remove unnecessary whitespace
    minified = minified.replace(/\s+/g, ' ');
    minified = minified.replace(/\s*([{}();,])\s*/g, '$1');
    minified = minified.replace(/;\s*}/g, '}');

    // Remove trailing semicolons before }
    minified = minified.replace(/;}/g, '}');

    return minified.trim();
  }

  /**
   * Tree shake unused code
   */
  private treeShake(code: string, workflow: Workflow): string {
    // Simple tree shaking - remove unused functions
    // In production, use a proper AST-based tree shaker

    const usedTypes = new Set(workflow.nodes.map(n => n.type));
    let shaken = code;

    // Remove node handlers for unused types
    const allTypes = ['http-request', 'code', 'filter', 'transform', 'aggregate', 'sort'];
    for (const type of allTypes) {
      if (!usedTypes.has(type)) {
        // Remove code blocks for this type (simplified)
        const pattern = new RegExp(`case\\s+'${type}':[^}]*break;`, 'g');
        shaken = shaken.replace(pattern, '');
      }
    }

    return shaken;
  }

  /**
   * Extract workflow dependencies
   */
  private extractDependencies(workflow: Workflow): string[] {
    const deps = new Set<string>();

    for (const node of workflow.nodes) {
      // Common dependencies
      if (node.type === 'http-request') {
        deps.add('node-fetch');
      }

      // Extract from node data
      const nodeConfig = node.data?.config as { dependencies?: string[] } | undefined;
      if (nodeConfig?.dependencies) {
        nodeConfig.dependencies.forEach(d => deps.add(d));
      }
    }

    return Array.from(deps);
  }

  /**
   * Topological sort for execution order
   */
  private topologicalSort(
    nodes: WorkflowNode[],
    edges: Array<{ source: string; target: string }>
  ): WorkflowNode[] {
    const sorted: WorkflowNode[] = [];
    const visited = new Set<string>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // Visit dependencies first
      const incomingEdges = edges.filter(e => e.target === nodeId);
      for (const edge of incomingEdges) {
        visit(edge.source);
      }

      const node = nodeMap.get(nodeId);
      if (node) {
        sorted.push(node);
      }
    };

    // Start with trigger nodes
    const triggerNodes = nodes.filter(n => n.type === 'trigger');
    for (const node of triggerNodes) {
      visit(node.id);
    }

    // Visit remaining nodes
    for (const node of nodes) {
      visit(node.id);
    }

    return sorted;
  }

  // Helper methods

  private isHeavyNode(node: WorkflowNode): boolean {
    const heavyTypes = [
      'ai-inference',
      'video-processing',
      'image-processing',
      'data-analysis',
      'ml-prediction'
    ];
    return heavyTypes.includes(node.type);
  }

  private requiresCloud(node: WorkflowNode): boolean {
    const cloudOnlyTypes = [
      'bigquery',
      'cloud-storage',
      'cloud-function'
    ];
    return cloudOnlyTypes.includes(node.type);
  }

  private inlineConstants(code: string): string {
    // Simple constant inlining (production would use AST)
    return code.replace(/const\s+(\w+)\s*=\s*(['"`].*?['"`]);/g, (_, name, value) => {
      return code.includes(`${name}`) ? _ : '';
    });
  }

  private eliminateDeadCode(code: string): string {
    // Remove unreachable code after return statements
    return code.replace(/return\s+.*?;[\s\S]*?(?=})/g, match => {
      return match.split('\n')[0];
    });
  }

  private inlineSmallFunctions(code: string): string {
    // Inline functions smaller than 50 characters (simplified)
    return code.replace(/function\s+(\w+)\s*\([^)]*\)\s*{([^}]{1,50})}/g, (match, name, body) => {
      // If function is only called once, inline it
      const callCount = (code.match(new RegExp(name + '\\(', 'g')) || []).length;
      if (callCount === 1) {
        return `/* inlined: ${name} */`;
      }
      return match;
    });
  }

  private estimateWorkflowSize(workflow: Workflow): number {
    return JSON.stringify(workflow).length;
  }

  private calculateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

/**
 * Create a compiler instance
 */
export function createCompiler(): EdgeCompiler {
  return new EdgeCompiler();
}
