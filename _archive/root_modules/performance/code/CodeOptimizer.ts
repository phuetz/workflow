/**
 * Code Optimizer
 * JavaScript/TypeScript code analysis, optimization, and performance improvements
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';

export interface CodeOptimizerConfig {
  analysis: {
    enabled: boolean;
    includePatterns: string[];
    excludePatterns: string[];
    recursive: boolean;
    maxFileSize: number; // bytes
    parseTimeout: number; // milliseconds
  };
  optimization: {
    deadCodeElimination: boolean;
    minification: boolean;
    treeshaking: boolean;
    constantFolding: boolean;
    inlining: boolean;
    loopOptimization: boolean;
    asyncOptimization: boolean;
  };
  typescript: {
    enabled: boolean;
    strict: boolean;
    target: string;
    module: string;
    compilerOptions: Record<string, unknown>;
  };
  performance: {
    memoryThreshold: number; // MB
    cpuThreshold: number; // percentage
    functionComplexityThreshold: number;
    cyclomaticComplexityThreshold: number;
  };
  output: {
    generateReport: boolean;
    outputDir: string;
    preserveComments: boolean;
    sourceMap: boolean;
  };
}

export interface CodeAnalysis {
  id: string;
  filePath: string;
  timestamp: Date;
  fileSize: number;
  linesOfCode: number;
  complexity: CodeComplexity;
  issues: CodeIssue[];
  suggestions: OptimizationSuggestion[];
  metrics: CodeMetrics;
  dependencies: string[];
  exports: string[];
  functions: FunctionAnalysis[];
  classes: ClassAnalysis[];
  performance: PerformanceMetrics;
}

export interface CodeComplexity {
  cyclomatic: number;
  cognitive: number;
  halstead: HalsteadMetrics;
  maintainabilityIndex: number;
  technicalDebt: {
    minutes: number;
    rating: 'A' | 'B' | 'C' | 'D' | 'E';
  };
}

export interface HalsteadMetrics {
  vocabulary: number;
  programLength: number;
  calculatedProgramLength: number;
  volume: number;
  difficulty: number;
  effort: number;
  timeRequiredToProgram: number;
  numberOfDeliveredBugs: number;
}

export interface CodeIssue {
  id: string;
  type: 'error' | 'warning' | 'info' | 'performance' | 'security' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  file: string;
  line: number;
  column: number;
  rule: string;
  category: string;
  fixable: boolean;
  suggestedFix?: string;
  examples?: {
    bad: string;
    good: string;
  };
}

export interface OptimizationSuggestion {
  id: string;
  type: 'performance' | 'memory' | 'size' | 'readability' | 'maintainability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: {
    performance: number; // Expected improvement percentage
    bundleSize: number;
    maintainability: number;
    readability: number;
  };
  implementation: {
    complexity: 'low' | 'medium' | 'high';
    timeRequired: number; // hours
    steps: string[];
    codeChanges: CodeChange[];
  };
  examples: {
    before: string;
    after: string;
  };
}

export interface CodeChange {
  file: string;
  startLine: number;
  endLine: number;
  oldCode: string;
  newCode: string;
  type: 'replace' | 'insert' | 'delete';
}

export interface CodeMetrics {
  linesOfCode: number;
  physicalLines: number;
  logicalLines: number;
  commentLines: number;
  blankLines: number;
  functions: number;
  classes: number;
  interfaces: number;
  variables: number;
  imports: number;
  exports: number;
  testCoverage?: number;
}

export interface FunctionAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  parameters: number;
  complexity: number;
  linesOfCode: number;
  isAsync: boolean;
  isArrow: boolean;
  isExported: boolean;
  callsites: number;
  dependencies: string[];
  performance: {
    estimatedExecutionTime: number;
    memoryUsage: number;
    optimizable: boolean;
  };
}

export interface ClassAnalysis {
  name: string;
  startLine: number;
  endLine: number;
  methods: number;
  properties: number;
  isExported: boolean;
  extends?: string;
  implements: string[];
  complexity: number;
  cohesion: number;
  coupling: number;
}

export interface PerformanceMetrics {
  estimatedExecutionTime: number;
  memoryFootprint: number;
  bundleImpact: number;
  asyncOperations: number;
  domManipulations: number;
  eventListeners: number;
  networkRequests: number;
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'io' | 'network' | 'dom';
  location: {
    function: string;
    line: number;
    column: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number;
  suggestion: string;
}

export interface OptimizationResult {
  id: string;
  filePath: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  improvements: {
    bundleSize: number;
    executionTime: number;
    memoryUsage: number;
    maintainability: number;
  };
  appliedOptimizations: string[];
  warnings: string[];
  errors: string[];
}

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  modules: ModuleInfo[];
  duplicates: DuplicateModule[];
  unusedCode: UnusedCode[];
  dependencies: DependencyInfo[];
  circularDependencies: string[][];
  entryPoints: string[];
}

export interface ModuleInfo {
  name: string;
  size: number;
  gzippedSize: number;
  path: string;
  reasons: string[];
  optimizable: boolean;
  chunks: string[];
}

export interface DuplicateModule {
  name: string;
  instances: string[];
  wastedSize: number;
}

export interface UnusedCode {
  file: string;
  functions: string[];
  classes: string[];
  variables: string[];
  imports: string[];
  estimatedSavings: number;
}

export interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  used: boolean;
  treeshakeable: boolean;
  alternatives: Array<{
    name: string;
    size: number;
    benefits: string[];
  }>;
}

export class CodeOptimizer extends EventEmitter {
  private config: CodeOptimizerConfig;
  private analyses: Map<string, CodeAnalysis> = new Map();
  private optimizationResults: Map<string, OptimizationResult> = new Map();
  private patterns: Map<string, RegExp> = new Map();
  private optimizers: Map<string, (code: string) => string> = new Map();
  
  constructor(config: CodeOptimizerConfig) {
    super();
    this.config = config;
    this.initializePatterns();
    this.initializeOptimizers();
  }
  
  private initializePatterns(): void {
    // Performance anti-patterns
    this.patterns.set('console_log', /console\.(log|warn|error|info)/g);
    this.patterns.set('debugger', /debugger;?/g);
    this.patterns.set('document_write', /document\.write/g);
    this.patterns.set('eval', /eval\s*\(/g);
    this.patterns.set('with_statement', /with\s*\(/g);
    this.patterns.set('arguments_usage', /arguments\[/g);
    this.patterns.set('for_in_array', /for\s*\(\s*\w+\s+in\s+\w+\s*\)/g);
    this.patterns.set('innerHTML', /\.innerHTML\s*=/g);
    this.patterns.set('sync_xhr', /new\s+XMLHttpRequest\(\)/g);
    this.patterns.set('global_variables', /^(var|let|const)\s+\w+/gm);
    
    // Memory leak patterns
    this.patterns.set('event_listener_leak', /addEventListener.*(?!removeEventListener)/g);
    this.patterns.set('timer_leak', /(setTimeout|setInterval).*(?!clear)/g);
    this.patterns.set('closure_leak', /function.*\{[\s\S]*var.*=.*function/g);
    
    // Optimization opportunities
    this.patterns.set('string_concatenation', /\+\s*["'`]/g);
    this.patterns.set('array_push_loop', /for.*\.push\(/g);
    this.patterns.set('object_property_access', /\w+\[["']\w+["']\]/g);
    this.patterns.set('dom_query_repeat', /document\.(getElementById|querySelector)/g);
    this.patterns.set('async_await_serial', /await.*\n.*await/g);
  }
  
  private initializeOptimizers(): void {
    // Dead code elimination
    this.optimizers.set('deadCode', (code: string) => {
      // Remove unreachable code after return statements
      return code.replace(/return[^;]*;[\s\S]*?(?=\n\s*[{}]|\n\s*$)/g, 'return;');
    });
    
    // Console statement removal
    this.optimizers.set('console', (code: string) => {
      return code.replace(/console\.(log|warn|error|info|debug)\([^)]*\);?/g, '');
    });
    
    // Debugger removal
    this.optimizers.set('debugger', (code: string) => {
      return code.replace(/debugger;?/g, '');
    });
    
    // String concatenation optimization
    this.optimizers.set('stringConcat', (code: string) => {
      return code.replace(/(['"`])\w+\1\s*\+\s*(['"`])\w+\2/g, (match) => {
        // Simple string literal concatenation
        return match.replace(/\s*\+\s*/, '');
      });
    });
    
    // Object property access optimization
    this.optimizers.set('propAccess', (code: string) => {
      return code.replace(/(\w+)\[(['"])\w+\2\]/g, '$1.$3');
    });
    
    // Function inlining for simple functions
    this.optimizers.set('inlining', (code: string) => {
      // Inline simple one-line functions
      return code.replace(
        /function\s+(\w+)\s*\([^)]*\)\s*{\s*return\s+([^;]+);\s*}/g,
        '// Inlined function $1\nconst $1 = () => $2;'
      );
    });
  }
  
  // File Analysis
  
  public async analyzeFile(filePath: string): Promise<CodeAnalysis> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size > this.config.analysis.maxFileSize) {
      throw new Error(`File too large: ${filePath} (${stats.size} bytes)`);
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const analysisId = crypto.randomUUID();
    
    const analysis: CodeAnalysis = {
      id: analysisId,
      filePath,
      timestamp: new Date(),
      fileSize: stats.size,
      linesOfCode: content.split('\n').length,
      complexity: await this.analyzeComplexity(content),
      issues: await this.analyzeIssues(content, filePath),
      suggestions: await this.generateSuggestions(content, filePath),
      metrics: this.calculateMetrics(content),
      dependencies: this.extractDependencies(content),
      exports: this.extractExports(content),
      functions: this.analyzeFunctions(content),
      classes: this.analyzeClasses(content),
      performance: await this.analyzePerformance(content)
    };
    
    this.analyses.set(filePath, analysis);
    
    this.emit('fileAnalyzed', {
      analysisId,
      filePath,
      issues: analysis.issues.length,
      suggestions: analysis.suggestions.length,
      complexity: analysis.complexity.cyclomatic
    });
    
    return analysis;
  }
  
  public async analyzeDirectory(directoryPath: string): Promise<CodeAnalysis[]> {
    const files = await this.findFiles(directoryPath);
    const analyses: CodeAnalysis[] = [];
    
    for (const file of files) {
      try {
        const analysis = await this.analyzeFile(file);
        analyses.push(analysis);
      } catch (error) {
        this.emit('analysisError', {
          file,
          error: (error as Error).message
        });
      }
    }
    
    this.emit('directoryAnalyzed', {
      directory: directoryPath,
      filesAnalyzed: analyses.length,
      totalIssues: analyses.reduce((sum, a) => sum + a.issues.length, 0),
      avgComplexity: analyses.reduce((sum, a) => sum + a.complexity.cyclomatic, 0) / analyses.length
    });
    
    return analyses;
  }
  
  private async findFiles(directory: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (this.config.analysis.recursive && !this.isExcludedPath(fullPath)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          if (this.isIncludedFile(fullPath) && !this.isExcludedPath(fullPath)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    await scanDirectory(directory);
    return files;
  }
  
  private isIncludedFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    const patterns = this.config.analysis.includePatterns;
    
    if (patterns.length === 0) {
      return ['.js', '.ts', '.jsx', '.tsx'].includes(ext);
    }
    
    return patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    });
  }
  
  private isExcludedPath(filePath: string): boolean {
    return this.config.analysis.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    });
  }
  
  // Code Analysis Methods
  
  private async analyzeComplexity(code: string): Promise<CodeComplexity> {
    const cyclomatic = this.calculateCyclomaticComplexity(code);
    const cognitive = this.calculateCognitiveComplexity(code);
    const halstead = this.calculateHalsteadMetrics(code);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(cyclomatic, halstead.volume, code.split('\n').length);
    
    const technicalDebt = this.calculateTechnicalDebt(maintainabilityIndex);
    
    return {
      cyclomatic,
      cognitive,
      halstead,
      maintainabilityIndex,
      technicalDebt
    };
  }
  
  private calculateCyclomaticComplexity(code: string): number {
    // Count decision points in code
    const patterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /do\s*{/g,
      /case\s+.*:/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g,
      /\?/g // ternary operator
    ];
    
    let complexity = 1; // Base complexity
    
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }
  
  private calculateCognitiveComplexity(code: string): number {
    let complexity = 0;
    let nestingLevel = 0;
    
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Increase nesting for blocks
      if (trimmed.includes('{')) {
        nestingLevel++;
      }
      
      // Decrease nesting for closing blocks
      if (trimmed.includes('}')) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
      
      // Add complexity based on control structures
      if (trimmed.match(/^(if|while|for|do)\s*\(/)) {
        complexity += nestingLevel + 1;
      } else if (trimmed.match(/^(else|catch|finally)/)) {
        complexity += nestingLevel;
      } else if (trimmed.includes('&&') || trimmed.includes('||')) {
        complexity += 1;
      }
    }
    
    return complexity;
  }
  
  private calculateHalsteadMetrics(code: string): HalsteadMetrics {
    // Simplified Halstead metrics calculation
    const operators = code.match(/[+\-*/=<>!&|%^~?:;,(){}[\]]/g) || [];
    const operands = code.match(/\b\w+\b/g) || [];
    
    const uniqueOperators = new Set(operators).size;
    const uniqueOperands = new Set(operands).size;
    
    const vocabulary = uniqueOperators + uniqueOperands;
    const programLength = operators.length + operands.length;
    const calculatedProgramLength = uniqueOperators * Math.log2(uniqueOperators) + 
                                   uniqueOperands * Math.log2(uniqueOperands);
    const volume = programLength * Math.log2(vocabulary);
    const difficulty = (uniqueOperators / 2) * (operands.length / uniqueOperands);
    const effort = difficulty * volume;
    const timeRequiredToProgram = effort / 18; // seconds
    const numberOfDeliveredBugs = volume / 3000;
    
    return {
      vocabulary,
      programLength,
      calculatedProgramLength,
      volume,
      difficulty,
      effort,
      timeRequiredToProgram,
      numberOfDeliveredBugs
    };
  }
  
  private calculateMaintainabilityIndex(complexity: number, volume: number, linesOfCode: number): number {
    // Microsoft's maintainability index formula (simplified)
    const maintainabilityIndex = Math.max(0, 
      171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(linesOfCode)
    );
    
    return Math.round(maintainabilityIndex);
  }
  
  private calculateTechnicalDebt(maintainabilityIndex: number): { minutes: number; rating: 'A' | 'B' | 'C' | 'D' | 'E' } {
    let rating: 'A' | 'B' | 'C' | 'D' | 'E';
    let minutes: number;
    
    if (maintainabilityIndex >= 85) {
      rating = 'A';
      minutes = 0;
    } else if (maintainabilityIndex >= 70) {
      rating = 'B';
      minutes = 30;
    } else if (maintainabilityIndex >= 50) {
      rating = 'C';
      minutes = 60;
    } else if (maintainabilityIndex >= 25) {
      rating = 'D';
      minutes = 120;
    } else {
      rating = 'E';
      minutes = 240;
    }
    
    return { minutes, rating };
  }
  
  private async analyzeIssues(code: string, filePath: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Check for performance issues
    for (const [patternName, pattern] of this.patterns.entries()) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        const columnNumber = match.index - code.lastIndexOf('\n', match.index - 1);
        
        issues.push({
          id: crypto.randomUUID(),
          type: this.getIssueType(patternName),
          severity: this.getIssueSeverity(patternName),
          message: this.getIssueMessage(patternName),
          file: filePath,
          line: lineNumber,
          column: columnNumber,
          rule: patternName,
          category: this.getIssueCategory(patternName),
          fixable: this.isFixable(patternName),
          suggestedFix: this.getSuggestedFix(patternName),
          examples: this.getExamples(patternName)
        });
      }
    }
    
    // Check for TypeScript-specific issues
    if (this.config.typescript.enabled && filePath.endsWith('.ts')) {
      issues.push(...await this.analyzeTypeScriptIssues(code, filePath));
    }
    
    return issues;
  }
  
  private getIssueType(patternName: string): 'error' | 'warning' | 'info' | 'performance' | 'security' | 'maintainability' {
    const performancePatterns = ['console_log', 'innerHTML', 'sync_xhr', 'dom_query_repeat'];
    const securityPatterns = ['eval', 'document_write'];
    const maintainabilityPatterns = ['with_statement', 'global_variables'];
    
    if (performancePatterns.includes(patternName)) return 'performance';
    if (securityPatterns.includes(patternName)) return 'security';
    if (maintainabilityPatterns.includes(patternName)) return 'maintainability';
    
    return 'warning';
  }
  
  private getIssueSeverity(patternName: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPatterns = ['eval', 'with_statement'];
    const highPatterns = ['innerHTML', 'sync_xhr', 'event_listener_leak'];
    const mediumPatterns = ['console_log', 'debugger', 'global_variables'];
    
    if (criticalPatterns.includes(patternName)) return 'critical';
    if (highPatterns.includes(patternName)) return 'high';
    if (mediumPatterns.includes(patternName)) return 'medium';
    
    return 'low';
  }
  
  private getIssueMessage(patternName: string): string {
    const messages: Record<string, string> = {
      console_log: 'Console statements should be removed in production',
      debugger: 'Debugger statements should be removed in production',
      eval: 'Use of eval() is dangerous and should be avoided',
      innerHTML: 'innerHTML can be slow and unsafe, consider alternatives',
      with_statement: 'with statements are deprecated and should be avoided',
      global_variables: 'Global variables can cause naming conflicts',
      event_listener_leak: 'Event listeners should be properly removed',
      timer_leak: 'Timers should be properly cleared',
      dom_query_repeat: 'DOM queries should be cached when used repeatedly'
    };
    
    return messages[patternName] || 'Code issue detected';
  }
  
  private getIssueCategory(patternName: string): string {
    const categories: Record<string, string> = {
      console_log: 'Debug Code',
      debugger: 'Debug Code',
      eval: 'Security',
      innerHTML: 'Performance',
      with_statement: 'Deprecated',
      global_variables: 'Best Practices',
      event_listener_leak: 'Memory Leaks',
      timer_leak: 'Memory Leaks',
      dom_query_repeat: 'Performance'
    };
    
    return categories[patternName] || 'General';
  }
  
  private isFixable(patternName: string): boolean {
    const fixablePatterns = ['console_log', 'debugger', 'string_concatenation', 'object_property_access'];
    return fixablePatterns.includes(patternName);
  }
  
  private getSuggestedFix(patternName: string): string | undefined {
    const fixes: Record<string, string> = {
      console_log: 'Remove console statement or use a proper logging library',
      debugger: 'Remove debugger statement',
      string_concatenation: 'Use template literals instead',
      object_property_access: 'Use dot notation instead of bracket notation'
    };
    
    return fixes[patternName];
  }
  
  private getExamples(patternName: string): { bad: string; good: string } | undefined {
    const examples: Record<string, { bad: string; good: string }> = {
      string_concatenation: {
        bad: 'const message = "Hello " + name + "!";',
        good: 'const message = `Hello ${name}!`;'
      },
      object_property_access: {
        bad: 'obj["property"]',
        good: 'obj.property'
      },
      console_log: {
        bad: 'console.log("Debug message");',
        good: 'logger.debug("Debug message");'
      }
    };
    
    return examples[patternName];
  }
  
  private async analyzeTypeScriptIssues(code: string, filePath: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    
    // Check for 'any' type usage
    const anyMatches = code.match(/:\s*any\b/g);
    if (anyMatches) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'maintainability',
        severity: 'medium',
        message: 'Avoid using "any" type, use specific types instead',
        file: filePath,
        line: 0, // Would calculate actual line
        column: 0,
        rule: 'no-any',
        category: 'TypeScript',
        fixable: false,
        suggestedFix: 'Define proper types or interfaces'
      });
    }
    
    // Check for missing return type annotations
    const functionPattern = /function\s+\w+\s*\([^)]*\)\s*{/g;
    let match;
    while ((match = functionPattern.exec(code)) !== null) {
      if (!match[0].includes(':')) {
        issues.push({
          id: crypto.randomUUID(),
          type: 'maintainability',
          severity: 'low',
          message: 'Function missing return type annotation',
          file: filePath,
          line: code.substring(0, match.index).split('\n').length,
          column: match.index - code.lastIndexOf('\n', match.index - 1),
          rule: 'explicit-return-type',
          category: 'TypeScript',
          fixable: false,
          suggestedFix: 'Add explicit return type annotation'
        });
      }
    }
    
    return issues;
  }
  
  private async generateSuggestions(code: string, filePath: string): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Performance suggestions
    if (code.includes('innerHTML')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'performance',
        priority: 'high',
        title: 'Replace innerHTML with safer alternatives',
        description: 'innerHTML can be slow and pose security risks',
        impact: {
          performance: 30,
          bundleSize: 0,
          maintainability: 20,
          readability: 10
        },
        implementation: {
          complexity: 'medium',
          timeRequired: 2,
          steps: [
            'Identify innerHTML usage',
            'Replace with textContent or DOM manipulation',
            'Test functionality'
          ],
          codeChanges: [{
            file: filePath,
            startLine: 0,
            endLine: 0,
            oldCode: 'element.innerHTML = content;',
            newCode: 'element.textContent = content;',
            type: 'replace'
          }]
        },
        examples: {
          before: 'element.innerHTML = "<span>" + text + "</span>";',
          after: 'const span = document.createElement("span");\nspan.textContent = text;\nelement.appendChild(span);'
        }
      });
    }
    
    // Bundle size suggestions
    if (code.includes('lodash') || code.includes('moment')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'size',
        priority: 'medium',
        title: 'Replace large dependencies with smaller alternatives',
        description: 'Large libraries can significantly increase bundle size',
        impact: {
          performance: 15,
          bundleSize: 50,
          maintainability: 5,
          readability: 0
        },
        implementation: {
          complexity: 'medium',
          timeRequired: 4,
          steps: [
            'Identify specific functions used',
            'Find smaller alternatives',
            'Replace imports and usage',
            'Test functionality'
          ],
          codeChanges: []
        },
        examples: {
          before: 'import _ from "lodash";\n_.map(array, fn);',
          after: 'array.map(fn);'
        }
      });
    }
    
    // Memory optimization suggestions
    if (code.includes('addEventListener') && !code.includes('removeEventListener')) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'memory',
        priority: 'high',
        title: 'Add event listener cleanup',
        description: 'Uncleaned event listeners can cause memory leaks',
        impact: {
          performance: 20,
          bundleSize: 0,
          maintainability: 30,
          readability: 10
        },
        implementation: {
          complexity: 'low',
          timeRequired: 1,
          steps: [
            'Identify event listeners without cleanup',
            'Add removeEventListener calls',
            'Implement proper cleanup lifecycle'
          ],
          codeChanges: []
        },
        examples: {
          before: 'element.addEventListener("click", handler);',
          after: 'element.addEventListener("click", handler);\n// Later...\nelement.removeEventListener("click", handler);'
        }
      });
    }
    
    return suggestions;
  }
  
  private calculateMetrics(code: string): CodeMetrics {
    const lines = code.split('\n');
    const physicalLines = lines.length;
    const blankLines = lines.filter(line => line.trim() === '').length;
    const commentLines = lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('*')).length;
    const logicalLines = physicalLines - blankLines - commentLines;
    
    const functionMatches = code.match(/function\s+\w+|=>\s*{|=>\s*\w+/g) || [];
    const classMatches = code.match(/class\s+\w+/g) || [];
    const interfaceMatches = code.match(/interface\s+\w+/g) || [];
    const variableMatches = code.match(/(var|let|const)\s+\w+/g) || [];
    const importMatches = code.match(/import\s+.*from/g) || [];
    const exportMatches = code.match(/export\s+(default\s+)?/g) || [];
    
    return {
      linesOfCode: logicalLines,
      physicalLines,
      logicalLines,
      commentLines,
      blankLines,
      functions: functionMatches.length,
      classes: classMatches.length,
      interfaces: interfaceMatches.length,
      variables: variableMatches.length,
      imports: importMatches.length,
      exports: exportMatches.length
    };
  }
  
  private extractDependencies(code: string): string[] {
    const dependencies: string[] = [];
    
    // Extract import statements
    const importMatches = code.match(/import\s+.*?from\s+['"](.*?)['"];?/g);
    if (importMatches) {
      for (const match of importMatches) {
        const moduleMatch = match.match(/from\s+['"](.*?)['"];?/);
        if (moduleMatch) {
          dependencies.push(moduleMatch[1]);
        }
      }
    }
    
    // Extract require statements
    const requireMatches = code.match(/require\s*\(\s*['"](.*?)['"]s*\)/g);
    if (requireMatches) {
      for (const match of requireMatches) {
        const moduleMatch = match.match(/['"](.*?)['"]s*\)/);
        if (moduleMatch) {
          dependencies.push(moduleMatch[1]);
        }
      }
    }
    
    return [...new Set(dependencies)];
  }
  
  private extractExports(code: string): string[] {
    const exports: string[] = [];
    
    // Extract named exports
    const namedExportMatches = code.match(/export\s+(const|let|var|function|class)\s+(\w+)/g);
    if (namedExportMatches) {
      for (const match of namedExportMatches) {
        const nameMatch = match.match(/\s+(\w+)$/);
        if (nameMatch) {
          exports.push(nameMatch[1]);
        }
      }
    }
    
    // Extract export statements
    const exportMatches = code.match(/export\s*{\s*(.*?)\s*}/g);
    if (exportMatches) {
      for (const match of exportMatches) {
        const namesMatch = match.match(/{\s*(.*?)\s*}/);
        if (namesMatch) {
          const names = namesMatch[1].split(',').map(name => name.trim());
          exports.push(...names);
        }
      }
    }
    
    // Check for default export
    if (code.includes('export default')) {
      exports.push('default');
    }
    
    return [...new Set(exports)];
  }
  
  private analyzeFunctions(code: string): FunctionAnalysis[] {
    const functions: FunctionAnalysis[] = [];
    
    // Find function declarations and expressions
    const functionPatterns = [
      /function\s+(\w+)\s*\(([^)]*)\)\s*{/g,
      /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{/g,
      /(\w+)\s*:\s*\(([^)]*)\)\s*=>\s*{/g
    ];
    
    for (const pattern of functionPatterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const functionName = match[1];
        const parameters = match[2] ? match[2].split(',').length : 0;
        const startLine = code.substring(0, match.index).split('\n').length;
        
        // Find function end (simplified)
        let braceCount = 1;
        let endIndex = match.index + match[0].length;
        let endLine = startLine;
        
        while (braceCount > 0 && endIndex < code.length) {
          if (code[endIndex] === '{') braceCount++;
          if (code[endIndex] === '}') braceCount--;
          if (code[endIndex] === '\n') endLine++;
          endIndex++;
        }
        
        const functionCode = code.substring(match.index, endIndex);
        const complexity = this.calculateCyclomaticComplexity(functionCode);
        
        functions.push({
          name: functionName,
          startLine,
          endLine,
          parameters,
          complexity,
          linesOfCode: endLine - startLine,
          isAsync: functionCode.includes('async'),
          isArrow: match[0].includes('=>'),
          isExported: code.substring(Math.max(0, match.index - 100), match.index).includes('export'),
          callsites: (code.match(new RegExp(`\\b${functionName}\\s*\\(`, 'g')) || []).length,
          dependencies: this.extractFunctionDependencies(functionCode),
          performance: {
            estimatedExecutionTime: complexity * 0.1, // ms
            memoryUsage: functionCode.length * 0.1, // bytes
            optimizable: complexity > 10 || functionCode.length > 1000
          }
        });
      }
    }
    
    return functions;
  }
  
  private extractFunctionDependencies(functionCode: string): string[] {
    const dependencies: string[] = [];
    
    // Extract function calls
    const callMatches = functionCode.match(/\b(\w+)\s*\(/g);
    if (callMatches) {
      for (const match of callMatches) {
        const funcName = match.replace(/\s*\($/, '');
        if (!['if', 'for', 'while', 'switch', 'typeof', 'instanceof'].includes(funcName)) {
          dependencies.push(funcName);
        }
      }
    }
    
    return [...new Set(dependencies)];
  }
  
  private analyzeClasses(code: string): ClassAnalysis[] {
    const classes: ClassAnalysis[] = [];
    const classPattern = /class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*{/g;
    
    let match;
    while ((match = classPattern.exec(code)) !== null) {
      const className = match[1];
      const extendsClass = match[2];
      const implementsInterfaces = match[3] ? match[3].split(',').map(i => i.trim()) : [];
      
      const startLine = code.substring(0, match.index).split('\n').length;
      
      // Find class end (simplified)
      let braceCount = 1;
      let endIndex = match.index + match[0].length;
      let endLine = startLine;
      
      while (braceCount > 0 && endIndex < code.length) {
        if (code[endIndex] === '{') braceCount++;
        if (code[endIndex] === '}') braceCount--;
        if (code[endIndex] === '\n') endLine++;
        endIndex++;
      }
      
      const classCode = code.substring(match.index, endIndex);
      const methods = (classCode.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;
      const properties = (classCode.match(/(private|public|protected)?\s*\w+\s*[:=]/g) || []).length;
      
      classes.push({
        name: className,
        startLine,
        endLine,
        methods,
        properties,
        isExported: code.substring(Math.max(0, match.index - 100), match.index).includes('export'),
        extends: extendsClass,
        implements: implementsInterfaces,
        complexity: this.calculateCyclomaticComplexity(classCode),
        cohesion: Math.min(100, (methods + properties) / 10 * 100), // Simplified
        coupling: implementsInterfaces.length + (extendsClass ? 1 : 0)
      });
    }
    
    return classes;
  }
  
  private async analyzePerformance(code: string): Promise<PerformanceMetrics> {
    const asyncOperations = (code.match(/await\s+|\.then\s*\(/g) || []).length;
    const domManipulations = (code.match(/document\.|\.querySelector|\.getElementById|\.innerHTML|\.appendChild/g) || []).length;
    const eventListeners = (code.match(/addEventListener/g) || []).length;
    const networkRequests = (code.match(/fetch\s*\(|XMLHttpRequest|axios\./g) || []).length;
    
    const bottlenecks: PerformanceBottleneck[] = [];
    
    // Detect potential bottlenecks
    if (domManipulations > 10) {
      bottlenecks.push({
        type: 'dom',
        location: { function: 'unknown', line: 0, column: 0 },
        severity: 'medium',
        description: 'High number of DOM manipulations detected',
        impact: domManipulations * 2,
        suggestion: 'Consider batching DOM operations or using document fragments'
      });
    }
    
    if (code.includes('for') && code.includes('appendChild')) {
      bottlenecks.push({
        type: 'dom',
        location: { function: 'unknown', line: 0, column: 0 },
        severity: 'high',
        description: 'DOM manipulation inside loop detected',
        impact: 50,
        suggestion: 'Use document fragment or batch DOM operations'
      });
    }
    
    return {
      estimatedExecutionTime: code.length * 0.01, // rough estimate
      memoryFootprint: code.length * 2, // bytes
      bundleImpact: code.length,
      asyncOperations,
      domManipulations,
      eventListeners,
      networkRequests,
      bottlenecks
    };
  }
  
  // Code Optimization
  
  public async optimizeFile(filePath: string, options?: {
    optimizations?: string[];
    preserveFormatting?: boolean;
    generateSourceMap?: boolean;
  }): Promise<OptimizationResult> {
    const analysis = this.analyses.get(filePath);
    if (!analysis) {
      throw new Error(`File not analyzed: ${filePath}. Run analyzeFile first.`);
    }
    
    const originalCode = fs.readFileSync(filePath, 'utf-8');
    const originalSize = originalCode.length;
    
    let optimizedCode = originalCode;
    const appliedOptimizations: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Apply optimizations
    const optimizationsToApply = options?.optimizations || Array.from(this.optimizers.keys());
    
    for (const optimizationName of optimizationsToApply) {
      const optimizer = this.optimizers.get(optimizationName);
      if (optimizer) {
        try {
          const beforeSize = optimizedCode.length;
          optimizedCode = optimizer(optimizedCode);
          const afterSize = optimizedCode.length;
          
          if (afterSize < beforeSize) {
            appliedOptimizations.push(optimizationName);
          }
        } catch (error) {
          errors.push(`Failed to apply ${optimizationName}: ${(error as Error).message}`);
        }
      } else {
        warnings.push(`Unknown optimization: ${optimizationName}`);
      }
    }
    
    const optimizedSize = optimizedCode.length;
    const compressionRatio = originalSize > 0 ? (originalSize - optimizedSize) / originalSize : 0;
    
    // Calculate improvements
    const improvements = {
      bundleSize: compressionRatio * 100,
      executionTime: appliedOptimizations.includes('deadCode') ? 10 : 0,
      memoryUsage: appliedOptimizations.includes('console') ? 5 : 0,
      maintainability: appliedOptimizations.length * 2
    };
    
    const result: OptimizationResult = {
      id: crypto.randomUUID(),
      filePath,
      originalSize,
      optimizedSize,
      compressionRatio,
      improvements,
      appliedOptimizations,
      warnings,
      errors
    };
    
    this.optimizationResults.set(filePath, result);
    
    // Write optimized file if configured
    if (this.config.output.outputDir) {
      const outputPath = path.join(this.config.output.outputDir, path.basename(filePath));
      fs.writeFileSync(outputPath, optimizedCode);
      
      if (options?.generateSourceMap) {
        // In a real implementation, would generate proper source map
        const sourceMap = {
          version: 3,
          file: path.basename(filePath),
          sources: [filePath],
          mappings: '' // Simplified
        };
        fs.writeFileSync(outputPath + '.map', JSON.stringify(sourceMap, null, 2));
      }
    }
    
    this.emit('fileOptimized', {
      filePath,
      originalSize,
      optimizedSize,
      compressionRatio: compressionRatio * 100,
      optimizations: appliedOptimizations
    });
    
    return result;
  }
  
  // Public API
  
  public getAnalysis(filePath: string): CodeAnalysis | undefined {
    return this.analyses.get(filePath);
  }
  
  public getAllAnalyses(): CodeAnalysis[] {
    return Array.from(this.analyses.values());
  }
  
  public getOptimizationResult(filePath: string): OptimizationResult | undefined {
    return this.optimizationResults.get(filePath);
  }
  
  public getIssuesByType(type: string): CodeIssue[] {
    const allIssues = Array.from(this.analyses.values()).flatMap(a => a.issues);
    return allIssues.filter(issue => issue.type === type);
  }
  
  public getSuggestionsByPriority(priority: string): OptimizationSuggestion[] {
    const allSuggestions = Array.from(this.analyses.values()).flatMap(a => a.suggestions);
    return allSuggestions.filter(suggestion => suggestion.priority === priority);
  }
  
  public generateReport(): {
    summary: {
      filesAnalyzed: number;
      totalIssues: number;
      totalSuggestions: number;
      avgComplexity: number;
      codeSmells: number;
    };
    topIssues: Array<{ type: string; count: number }>;
    complexityDistribution: Array<{ range: string; count: number }>;
    optimizationOpportunities: OptimizationSuggestion[];
  } {
    const analyses = Array.from(this.analyses.values());
    const allIssues = analyses.flatMap(a => a.issues);
    const allSuggestions = analyses.flatMap(a => a.suggestions);
    
    const avgComplexity = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.complexity.cyclomatic, 0) / analyses.length
      : 0;
    
    const issueTypes = allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topIssues = Object.entries(issueTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    
    const complexityRanges = analyses.reduce((acc, analysis) => {
      const complexity = analysis.complexity.cyclomatic;
      let range: string;
      
      if (complexity <= 5) range = '1-5 (Low)';
      else if (complexity <= 10) range = '6-10 (Medium)';
      else if (complexity <= 20) range = '11-20 (High)';
      else range = '21+ (Very High)';
      
      acc[range] = (acc[range] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const complexityDistribution = Object.entries(complexityRanges)
      .map(([range, count]) => ({ range, count }));
    
    const codeSmells = allIssues.filter(issue => 
      issue.type === 'maintainability' || issue.severity === 'high'
    ).length;
    
    return {
      summary: {
        filesAnalyzed: analyses.length,
        totalIssues: allIssues.length,
        totalSuggestions: allSuggestions.length,
        avgComplexity,
        codeSmells
      },
      topIssues,
      complexityDistribution,
      optimizationOpportunities: allSuggestions
        .filter(s => s.priority === 'high' || s.priority === 'critical')
        .slice(0, 10)
    };
  }
  
  public destroy(): void {
    this.analyses.clear();
    this.optimizationResults.clear();
    this.patterns.clear();
    this.optimizers.clear();
    
    this.emit('destroyed');
  }
}