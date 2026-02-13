/**
 * Real-Time Technical Debt Analyzer
 * Advanced system for tracking, quantifying, and managing technical debt
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../services/SimpleLogger';

// Types for technical debt analysis
interface DebtItem {
  id: string;
  type: DebtType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: DebtCategory;
  file: string;
  line: number;
  column: number;
  description: string;
  estimatedEffort: number; // in hours
  cost: number; // in currency
  interest: number; // ongoing cost per month
  priority: number; // 1-10
  tags: string[];
  createdAt: number;
  lastModified: number;
  resolution?: DebtResolution;
}

type DebtType = 
  | 'code-duplication'
  | 'complex-function'
  | 'long-method'
  | 'large-class'
  | 'dead-code'
  | 'missing-tests'
  | 'outdated-dependency'
  | 'security-vulnerability'
  | 'performance-issue'
  | 'anti-pattern'
  | 'code-smell'
  | 'documentation-missing'
  | 'hardcoded-value'
  | 'todo-fixme'
  | 'deprecated-api'
  | 'circular-dependency'
  | 'god-object'
  | 'tight-coupling'
  | 'missing-abstraction'
  | 'inconsistent-naming';

type DebtCategory = 
  | 'maintainability'
  | 'reliability'
  | 'security'
  | 'performance'
  | 'usability'
  | 'portability'
  | 'reusability';

interface DebtResolution {
  strategy: 'refactor' | 'rewrite' | 'remove' | 'document' | 'ignore';
  steps: string[];
  estimatedEffort: number;
  automatable: boolean;
  confidence: number;
  suggestedCode?: string;
}

interface DebtMetrics {
  totalDebt: number; // in hours
  totalCost: number; // in currency
  monthlyInterest: number; // ongoing cost
  debtRatio: number; // debt vs total development time
  categories: Record<DebtCategory, number>;
  severities: Record<string, number>;
  trends: TrendData[];
  hotspots: Hotspot[];
}

interface TrendData {
  timestamp: number;
  totalDebt: number;
  itemsAdded: number;
  itemsResolved: number;
  velocity: number; // rate of debt accumulation
}

interface Hotspot {
  file: string;
  debtScore: number;
  issues: number;
  complexity: number;
  churn: number; // how often the file changes
  risk: 'low' | 'medium' | 'high' | 'critical';
}

interface CodeMetrics {
  loc: number; // lines of code
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  maintainabilityIndex: number;
  halsteadMetrics: HalsteadMetrics;
  coupling: number;
  cohesion: number;
}

interface HalsteadMetrics {
  vocabulary: number;
  length: number;
  volume: number;
  difficulty: number;
  effort: number;
  time: number; // estimated time to implement
  bugs: number; // estimated bugs
}

// AST Analyzer for TypeScript/JavaScript
class ASTAnalyzer {
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;
  
  public analyzeFile(filePath: string): DebtItem[] {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );
    
    const debtItems: DebtItem[] = [];
    
    // Analyze the AST
    this.visitNode(sourceFile, sourceFile, debtItems, filePath);
    
    return debtItems;
  }
  
  private visitNode(node: ts.Node, sourceFile: ts.SourceFile, debtItems: DebtItem[], filePath: string): void {
    // Check for various debt patterns
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isArrowFunction(node)) {
      this.analyzeFunctionComplexity(node, sourceFile, debtItems, filePath);
    }
    
    if (ts.isClassDeclaration(node)) {
      this.analyzeClassComplexity(node, sourceFile, debtItems, filePath);
    }
    
    if (ts.isIfStatement(node)) {
      this.analyzeConditionalComplexity(node, sourceFile, debtItems, filePath);
    }
    
    // Check for TODOs and FIXMEs in comments
    const comments = this.getComments(node, sourceFile);
    this.analyzeTodoComments(comments, sourceFile, debtItems, filePath);
    
    // Check for hardcoded values
    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
      this.analyzeHardcodedValues(node, sourceFile, debtItems, filePath);
    }
    
    // Recursively visit children
    ts.forEachChild(node, child => this.visitNode(child, sourceFile, debtItems, filePath));
  }
  
  private analyzeFunctionComplexity(
    node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction,
    sourceFile: ts.SourceFile,
    debtItems: DebtItem[],
    filePath: string
  ): void {
    const complexity = this.calculateCyclomaticComplexity(node);
    const loc = this.countLines(node, sourceFile);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.pos);
    
    // Long method
    if (loc > 50) {
      debtItems.push({
        id: `debt-${Date.now()}-${Math.random()}`,
        type: 'long-method',
        severity: loc > 100 ? 'high' : 'medium',
        category: 'maintainability',
        file: filePath,
        line: line + 1,
        column: character + 1,
        description: `Method is too long (${loc} lines). Consider breaking it into smaller functions.`,
        estimatedEffort: Math.ceil(loc / 20),
        cost: Math.ceil(loc / 20) * 100,
        interest: loc * 2,
        priority: loc > 100 ? 8 : 5,
        tags: ['refactor', 'readability'],
        createdAt: Date.now(),
        lastModified: Date.now(),
        resolution: {
          strategy: 'refactor',
          steps: [
            'Identify logical sections within the method',
            'Extract each section into a separate function',
            'Ensure proper parameter passing',
            'Add unit tests for new functions'
          ],
          estimatedEffort: Math.ceil(loc / 15),
          automatable: false,
          confidence: 0.8
        }
      });
    }
    
    // Complex function
    if (complexity > 10) {
      debtItems.push({
        id: `debt-${Date.now()}-${Math.random()}`,
        type: 'complex-function',
        severity: complexity > 20 ? 'critical' : complexity > 15 ? 'high' : 'medium',
        category: 'maintainability',
        file: filePath,
        line: line + 1,
        column: character + 1,
        description: `Function has high cyclomatic complexity (${complexity}). Simplify logic or split into smaller functions.`,
        estimatedEffort: complexity * 0.5,
        cost: complexity * 50,
        interest: complexity * 10,
        priority: complexity > 20 ? 9 : 6,
        tags: ['complexity', 'refactor'],
        createdAt: Date.now(),
        lastModified: Date.now(),
        resolution: {
          strategy: 'refactor',
          steps: [
            'Identify complex conditional logic',
            'Extract complex conditions into well-named functions',
            'Consider using strategy pattern for complex branching',
            'Simplify nested conditions'
          ],
          estimatedEffort: complexity * 0.3,
          automatable: false,
          confidence: 0.7
        }
      });
    }
  }
  
  private analyzeClassComplexity(
    node: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    debtItems: DebtItem[],
    filePath: string
  ): void {
    const methods = node.members.filter(m => ts.isMethodDeclaration(m)).length;
    const properties = node.members.filter(m => ts.isPropertyDeclaration(m)).length;
    const loc = this.countLines(node, sourceFile);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.pos);
    
    // Large class
    if (loc > 300 || methods > 20) {
      debtItems.push({
        id: `debt-${Date.now()}-${Math.random()}`,
        type: 'large-class',
        severity: loc > 500 ? 'critical' : 'high',
        category: 'maintainability',
        file: filePath,
        line: line + 1,
        column: character + 1,
        description: `Class is too large (${loc} lines, ${methods} methods). Consider splitting responsibilities.`,
        estimatedEffort: Math.ceil(loc / 50),
        cost: Math.ceil(loc / 50) * 100,
        interest: loc * 3,
        priority: 7,
        tags: ['god-object', 'srp-violation'],
        createdAt: Date.now(),
        lastModified: Date.now(),
        resolution: {
          strategy: 'refactor',
          steps: [
            'Identify distinct responsibilities',
            'Group related methods and properties',
            'Extract each group into a separate class',
            'Use composition or inheritance as appropriate'
          ],
          estimatedEffort: Math.ceil(loc / 30),
          automatable: false,
          confidence: 0.6
        }
      });
    }
    
    // God object
    if (methods > 30 || properties > 30) {
      debtItems.push({
        id: `debt-${Date.now()}-${Math.random()}`,
        type: 'god-object',
        severity: 'critical',
        category: 'maintainability',
        file: filePath,
        line: line + 1,
        column: character + 1,
        description: `Class has too many responsibilities (${methods} methods, ${properties} properties).`,
        estimatedEffort: 20,
        cost: 2000,
        interest: 100,
        priority: 9,
        tags: ['anti-pattern', 'refactor-urgent'],
        createdAt: Date.now(),
        lastModified: Date.now()
      });
    }
  }
  
  private analyzeConditionalComplexity(
    node: ts.IfStatement,
    sourceFile: ts.SourceFile,
    debtItems: DebtItem[],
    filePath: string
  ): void {
    const depth = this.calculateNestingDepth(node);
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.pos);
    
    if (depth > 3) {
      debtItems.push({
        id: `debt-${Date.now()}-${Math.random()}`,
        type: 'complex-function',
        severity: depth > 5 ? 'high' : 'medium',
        category: 'maintainability',
        file: filePath,
        line: line + 1,
        column: character + 1,
        description: `Deeply nested conditionals (depth: ${depth}). Consider early returns or extracting logic.`,
        estimatedEffort: depth * 0.5,
        cost: depth * 30,
        interest: depth * 5,
        priority: 5,
        tags: ['complexity', 'readability'],
        createdAt: Date.now(),
        lastModified: Date.now()
      });
    }
  }
  
  private analyzeTodoComments(
    comments: string[],
    sourceFile: ts.SourceFile,
    debtItems: DebtItem[],
    filePath: string
  ): void {
    const todoPattern = /\b(TODO|FIXME|HACK|XXX|OPTIMIZE|REFACTOR)\b:?\s*(.*)/gi;
    
    comments.forEach(comment => {
      const matches = comment.matchAll(todoPattern);
      for (const match of matches) {
        const [, keyword, description] = match;
        debtItems.push({
          id: `debt-${Date.now()}-${Math.random()}`,
          type: 'todo-fixme',
          severity: keyword === 'FIXME' || keyword === 'HACK' ? 'medium' : 'low',
          category: 'maintainability',
          file: filePath,
          line: 0, // Would need to calculate from comment position
          column: 0,
          description: `${keyword}: ${description.trim()}`,
          estimatedEffort: 2,
          cost: 200,
          interest: 10,
          priority: 3,
          tags: ['todo', keyword.toLowerCase()],
          createdAt: Date.now(),
          lastModified: Date.now()
        });
      }
    });
  }
  
  private analyzeHardcodedValues(
    node: ts.StringLiteral | ts.NumericLiteral,
    sourceFile: ts.SourceFile,
    debtItems: DebtItem[],
    filePath: string
  ): void {
    const value = node.text || node.getText();
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.pos);
    
    // Check for common hardcoded patterns
    const suspiciousPatterns = [
      /^https?:\/\//i, // URLs
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IPs
      /^[a-f0-9]{32,}$/i, // Possible API keys
      /password|secret|key|token/i, // Sensitive data
      /localhost|127\.0\.0\.1/, // Local addresses
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(value)) {
        debtItems.push({
          id: `debt-${Date.now()}-${Math.random()}`,
          type: 'hardcoded-value',
          severity: /password|secret|key|token/i.test(value) ? 'critical' : 'medium',
          category: 'security',
          file: filePath,
          line: line + 1,
          column: character + 1,
          description: `Hardcoded value detected: "${value.substring(0, 50)}..."`,
          estimatedEffort: 0.5,
          cost: 50,
          interest: 20,
          priority: /password|secret|key|token/i.test(value) ? 10 : 4,
          tags: ['configuration', 'security'],
          createdAt: Date.now(),
          lastModified: Date.now(),
          resolution: {
            strategy: 'refactor',
            steps: [
              'Move value to environment variable or config file',
              'Update deployment configuration',
              'Ensure value is not committed to version control'
            ],
            estimatedEffort: 0.5,
            automatable: true,
            confidence: 0.9,
            suggestedCode: `process.env.CONFIG_VALUE || '${value}'`
          }
        });
        break;
      }
    }
  }
  
  private calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1;
    
    const visit = (n: ts.Node) => {
      switch (n.kind) {
        case ts.SyntaxKind.IfStatement:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.CatchClause:
        case ts.SyntaxKind.ConditionalExpression:
        case ts.SyntaxKind.WhileStatement:
        case ts.SyntaxKind.DoStatement:
        case ts.SyntaxKind.ForStatement:
        case ts.SyntaxKind.ForInStatement:
        case ts.SyntaxKind.ForOfStatement:
          complexity++;
          break;
        case ts.SyntaxKind.CaseClause:
          if ((n as ts.CaseClause).statements.length > 0) {
            complexity++;
          }
          break;
        case ts.SyntaxKind.BinaryExpression:
          const op = (n as ts.BinaryExpression).operatorToken.kind;
          if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.AmpersandAmpersandToken) {
            complexity++;
          }
          break;
      }
      ts.forEachChild(n, visit);
    };
    
    visit(node);
    return complexity;
  }
  
  private calculateNestingDepth(node: ts.Node, currentDepth: number = 0): number {
    let maxDepth = currentDepth;
    
    const visit = (n: ts.Node, depth: number) => {
      if (ts.isIfStatement(n) || ts.isWhileStatement(n) || ts.isForStatement(n)) {
        const newDepth = depth + 1;
        maxDepth = Math.max(maxDepth, newDepth);
        ts.forEachChild(n, child => visit(child, newDepth));
      } else {
        ts.forEachChild(n, child => visit(child, depth));
      }
    };
    
    ts.forEachChild(node, child => visit(child, currentDepth));
    return maxDepth;
  }
  
  private countLines(node: ts.Node, sourceFile: ts.SourceFile): number {
    const start = sourceFile.getLineAndCharacterOfPosition(node.pos);
    const end = sourceFile.getLineAndCharacterOfPosition(node.end);
    return end.line - start.line + 1;
  }
  
  private getComments(node: ts.Node, sourceFile: ts.SourceFile): string[] {
    const comments: string[] = [];
    const text = sourceFile.text;
    const ranges = ts.getLeadingCommentRanges(text, node.pos) || [];
    
    ranges.forEach(range => {
      const comment = text.substring(range.pos, range.end);
      comments.push(comment);
    });
    
    return comments;
  }
}

// Duplication Detector
class DuplicationDetector {
  private hashMap: Map<string, { file: string; line: number; code: string }[]> = new Map();
  
  public detectDuplication(files: string[]): DebtItem[] {
    const debtItems: DebtItem[] = [];
    
    // Process all files
    files.forEach(file => {
      this.processFile(file);
    });
    
    // Find duplicates
    for (const [hash, locations] of this.hashMap) {
      if (locations.length > 1) {
        const firstLocation = locations[0];
        debtItems.push({
          id: `debt-duplication-${Date.now()}-${Math.random()}`,
          type: 'code-duplication',
          severity: locations.length > 3 ? 'high' : 'medium',
          category: 'maintainability',
          file: firstLocation.file,
          line: firstLocation.line,
          column: 0,
          description: `Code duplicated in ${locations.length} locations: ${locations.map(l => `${l.file}:${l.line}`).join(', ')}`,
          estimatedEffort: locations.length * 2,
          cost: locations.length * 150,
          interest: locations.length * 20,
          priority: 6,
          tags: ['duplication', 'dry-violation'],
          createdAt: Date.now(),
          lastModified: Date.now(),
          resolution: {
            strategy: 'refactor',
            steps: [
              'Extract duplicated code into a shared function',
              'Update all locations to use the shared function',
              'Add unit tests for the shared function',
              'Document the shared function'
            ],
            estimatedEffort: locations.length * 1.5,
            automatable: true,
            confidence: 0.85
          }
        });
      }
    }
    
    return debtItems;
  }
  
  private processFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Check for duplicate blocks (simplified)
      for (let i = 0; i < lines.length - 5; i++) {
        const block = lines.slice(i, i + 5).join('\n');
        const hash = this.hashCode(block);
        
        if (!this.hashMap.has(hash)) {
          this.hashMap.set(hash, []);
        }
        
        this.hashMap.get(hash)!.push({
          file: filePath,
          line: i + 1,
          code: block
        });
      }
    } catch (error) {
      logger.error(`Error processing file ${filePath}:`, error);
    }
  }
  
  private hashCode(str: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Main Technical Debt Analyzer
export class TechnicalDebtAnalyzer {
  private static instance: TechnicalDebtAnalyzer;
  private debtItems: Map<string, DebtItem> = new Map();
  private astAnalyzer: ASTAnalyzer;
  private duplicationDetector: DuplicationDetector;
  private metrics: DebtMetrics;
  private history: TrendData[] = [];
  private hourlyRate: number = 100; // Cost per hour in currency
  
  private constructor() {
    this.astAnalyzer = new ASTAnalyzer();
    this.duplicationDetector = new DuplicationDetector();
    this.metrics = this.initializeMetrics();
  }
  
  public static getInstance(): TechnicalDebtAnalyzer {
    if (!TechnicalDebtAnalyzer.instance) {
      TechnicalDebtAnalyzer.instance = new TechnicalDebtAnalyzer();
    }
    return TechnicalDebtAnalyzer.instance;
  }
  
  private initializeMetrics(): DebtMetrics {
    return {
      totalDebt: 0,
      totalCost: 0,
      monthlyInterest: 0,
      debtRatio: 0,
      categories: {
        maintainability: 0,
        reliability: 0,
        security: 0,
        performance: 0,
        usability: 0,
        portability: 0,
        reusability: 0
      },
      severities: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      trends: [],
      hotspots: []
    };
  }
  
  // Analyze a project or directory
  public async analyzeProject(projectPath: string): Promise<DebtMetrics> {
    logger.debug(`Analyzing project: ${projectPath}`);
    
    // Get all TypeScript/JavaScript files
    const files = this.getProjectFiles(projectPath);
    logger.debug(`Found ${files.length} files to analyze`);
    
    // Clear previous analysis
    this.debtItems.clear();
    
    // Analyze each file
    for (const file of files) {
      const items = this.astAnalyzer.analyzeFile(file);
      items.forEach(item => {
        this.debtItems.set(item.id, item);
      });
    }
    
    // Detect duplications
    const duplicationItems = this.duplicationDetector.detectDuplication(files);
    duplicationItems.forEach(item => {
      this.debtItems.set(item.id, item);
    });
    
    // Calculate metrics
    this.calculateMetrics();
    
    // Identify hotspots
    this.identifyHotspots();
    
    // Update history
    this.updateHistory();
    
    logger.debug(`Analysis complete. Found ${this.debtItems.size} debt items`);
    
    return this.metrics;
  }
  
  private getProjectFiles(projectPath: string): string[] {
    const files: string[] = [];
    
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and common build directories
          if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          // Include TypeScript and JavaScript files
          if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    walk(projectPath);
    return files;
  }
  
  private calculateMetrics(): void {
    this.metrics = this.initializeMetrics();
    
    for (const item of this.debtItems.values()) {
      // Total debt and cost
      this.metrics.totalDebt += item.estimatedEffort;
      this.metrics.totalCost += item.cost;
      this.metrics.monthlyInterest += item.interest;
      
      // By category
      this.metrics.categories[item.category] += item.estimatedEffort;
      
      // By severity
      this.metrics.severities[item.severity] += 1;
    }
    
    // Calculate debt ratio (assuming 160 hours per month per developer)
    const monthlyCapacity = 160;
    this.metrics.debtRatio = (this.metrics.totalDebt / monthlyCapacity) * 100;
  }
  
  private identifyHotspots(): void {
    const fileScores = new Map<string, { debt: number; issues: number; complexity: number }>();
    
    // Aggregate by file
    for (const item of this.debtItems.values()) {
      if (!fileScores.has(item.file)) {
        fileScores.set(item.file, { debt: 0, issues: 0, complexity: 0 });
      }
      
      const score = fileScores.get(item.file)!;
      score.debt += item.estimatedEffort;
      score.issues += 1;
      
      if (item.type === 'complex-function' || item.type === 'large-class') {
        score.complexity += item.priority;
      }
    }
    
    // Convert to hotspots
    this.metrics.hotspots = Array.from(fileScores.entries())
      .map(([file, score]) => ({
        file,
        debtScore: score.debt,
        issues: score.issues,
        complexity: score.complexity,
        churn: Math.random() * 10, // Would need git history for real churn
        risk: this.calculateRisk(score.debt, score.issues, score.complexity)
      }))
      .sort((a, b) => b.debtScore - a.debtScore)
      .slice(0, 10); // Top 10 hotspots
  }
  
  private calculateRisk(debt: number, issues: number, complexity: number): 'low' | 'medium' | 'high' | 'critical' {
    const score = debt * 0.5 + issues * 10 + complexity * 2;
    
    if (score > 200) return 'critical';
    if (score > 100) return 'high';
    if (score > 50) return 'medium';
    return 'low';
  }
  
  private updateHistory(): void {
    const trend: TrendData = {
      timestamp: Date.now(),
      totalDebt: this.metrics.totalDebt,
      itemsAdded: 0, // Would need to track changes
      itemsResolved: 0, // Would need to track changes
      velocity: 0 // Would need to calculate from history
    };
    
    this.history.push(trend);
    
    // Keep only last 100 data points
    if (this.history.length > 100) {
      this.history.shift();
    }
    
    this.metrics.trends = this.history.slice(-10); // Last 10 trends
  }
  
  // Get all debt items
  public getDebtItems(): DebtItem[] {
    return Array.from(this.debtItems.values());
  }
  
  // Get debt items by severity
  public getDebtBySeverity(severity: string): DebtItem[] {
    return this.getDebtItems().filter(item => item.severity === severity);
  }
  
  // Get debt items by category
  public getDebtByCategory(category: DebtCategory): DebtItem[] {
    return this.getDebtItems().filter(item => item.category === category);
  }
  
  // Get debt items by file
  public getDebtByFile(filePath: string): DebtItem[] {
    return this.getDebtItems().filter(item => item.file === filePath);
  }
  
  // Generate action plan
  public generateActionPlan(): ActionPlan {
    const items = this.getDebtItems()
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 20); // Top 20 items
    
    const plan: ActionPlan = {
      title: 'Technical Debt Reduction Plan',
      totalEffort: items.reduce((sum, item) => sum + item.estimatedEffort, 0),
      totalCost: items.reduce((sum, item) => sum + item.cost, 0),
      phases: [
        {
          name: 'Critical Issues',
          items: items.filter(i => i.severity === 'critical'),
          duration: '1 week'
        },
        {
          name: 'High Priority',
          items: items.filter(i => i.severity === 'high'),
          duration: '2 weeks'
        },
        {
          name: 'Medium Priority',
          items: items.filter(i => i.severity === 'medium'),
          duration: '3 weeks'
        }
      ],
      recommendations: [
        'Start with critical security issues',
        'Focus on high-traffic code paths',
        'Combine related refactoring tasks',
        'Add tests before refactoring',
        'Document changes thoroughly'
      ]
    };
    
    return plan;
  }
  
  // Export report
  public exportReport(format: 'json' | 'html' | 'markdown' = 'json'): string {
    const data = {
      summary: this.metrics,
      items: this.getDebtItems(),
      actionPlan: this.generateActionPlan(),
      timestamp: new Date().toISOString()
    };
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'markdown':
        return this.generateMarkdownReport(data);
      
      case 'html':
        return this.generateHTMLReport(data);
      
      default:
        return JSON.stringify(data, null, 2);
    }
  }
  
  private generateMarkdownReport(data: any): string {
    let report = `# Technical Debt Report\n\n`;
    report += `Generated: ${data.timestamp}\n\n`;
    
    report += `## Summary\n\n`;
    report += `- **Total Debt**: ${data.summary.totalDebt.toFixed(1)} hours\n`;
    report += `- **Total Cost**: $${data.summary.totalCost.toFixed(2)}\n`;
    report += `- **Monthly Interest**: $${data.summary.monthlyInterest.toFixed(2)}\n`;
    report += `- **Debt Ratio**: ${data.summary.debtRatio.toFixed(1)}%\n\n`;
    
    report += `## Top Issues\n\n`;
    data.items.slice(0, 10).forEach((item: DebtItem) => {
      report += `### ${item.type} - ${item.file}\n`;
      report += `- **Severity**: ${item.severity}\n`;
      report += `- **Description**: ${item.description}\n`;
      report += `- **Effort**: ${item.estimatedEffort} hours\n\n`;
    });
    
    report += `## Action Plan\n\n`;
    data.actionPlan.phases.forEach((phase: any) => {
      report += `### ${phase.name} (${phase.duration})\n`;
      phase.items.forEach((item: DebtItem) => {
        report += `- [ ] ${item.description}\n`;
      });
      report += `\n`;
    });
    
    return report;
  }
  
  private generateHTMLReport(data: any): string {
    // Simplified HTML report
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Technical Debt Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .metric { margin: 10px 0; }
    .critical { color: red; }
    .high { color: orange; }
    .medium { color: yellow; }
    .low { color: green; }
  </style>
</head>
<body>
  <h1>Technical Debt Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <div class="metric">Total Debt: ${data.summary.totalDebt.toFixed(1)} hours</div>
    <div class="metric">Total Cost: $${data.summary.totalCost.toFixed(2)}</div>
    <div class="metric">Debt Ratio: ${data.summary.debtRatio.toFixed(1)}%</div>
  </div>
</body>
</html>`;
  }
}

interface ActionPlan {
  title: string;
  totalEffort: number;
  totalCost: number;
  phases: {
    name: string;
    items: DebtItem[];
    duration: string;
  }[];
  recommendations: string[];
}

// Export singleton instance
export const debtAnalyzer = TechnicalDebtAnalyzer.getInstance();