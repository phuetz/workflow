/**
 * Expression Engine
 * Main orchestrator for expression parsing, evaluation, and suggestions
 */

import { EventEmitter } from 'events';
import type {
  ExpressionContext,
  Suggestion,
  ValidationResult,
  ValidationError,
  EvaluationResult,
  DataType,
  SyntaxToken,
  CodeAction,
  Range,
  Position,
  HoverInfo,
  SignatureHelp
} from '../types';
import { ExpressionParser } from './ExpressionParser';
import { ExpressionEvaluator } from './ExpressionEvaluator';
import { ExpressionValidator } from './ExpressionValidator';
import { ExpressionFormatter } from './ExpressionFormatter';
import { SuggestionEngine, type CompletionContext, type ContextType } from './SuggestionEngine';
import { SyntaxHighlighter } from './SyntaxHighlighter';

// Browser-compatible random ID generation
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export class ExpressionEngine extends EventEmitter {
  private context: ExpressionContext;
  private parser: ExpressionParser;
  private evaluator: ExpressionEvaluator;
  private validator: ExpressionValidator;
  private formatter: ExpressionFormatter;
  private cache: Map<string, EvaluationResult>;
  private suggestionEngine: SuggestionEngine;
  private syntaxHighlighter: SyntaxHighlighter;

  constructor(context: ExpressionContext) {
    super();
    this.context = context;
    this.parser = new ExpressionParser();
    this.evaluator = new ExpressionEvaluator(context);
    this.validator = new ExpressionValidator(context);
    this.formatter = new ExpressionFormatter();
    this.cache = new Map();
    this.suggestionEngine = new SuggestionEngine(context);
    this.syntaxHighlighter = new SyntaxHighlighter();
  }

  // ============================================================================
  // SUGGESTION & AUTOCOMPLETE
  // ============================================================================

  public getSuggestions(
    expression: string,
    position: Position,
    triggerCharacter?: string
  ): Suggestion[] {
    const context = this.getContextAtPosition(expression, position);
    const suggestions = this.suggestionEngine.getSuggestions(context, triggerCharacter);

    // Sort by relevance
    suggestions.sort((a, b) => b.score - a.score);

    // Add to history
    if (context.word) {
      this.context.history.push(context.word);
    }

    this.emit('suggestionsGenerated', { suggestions, context });

    return suggestions;
  }

  private getContextAtPosition(expression: string, position: Position): CompletionContext {
    const lines = expression.split('\n');
    const line = lines[position.line] || '';
    const beforeCursor = line.substring(0, position.character);
    const afterCursor = line.substring(position.character);

    // Find word boundaries
    const wordMatch = beforeCursor.match(/[\w\.$]+$/);
    const word = wordMatch ? wordMatch[0] : '';

    // Determine context type
    const contextType = this.determineContextType(beforeCursor, word);

    // Get scope
    const scope = this.getScope(expression, position);

    return {
      word,
      line: beforeCursor,
      beforeCursor,
      afterCursor,
      type: contextType,
      scope,
      position
    };
  }

  private determineContextType(line: string, word: string): ContextType {
    // Check for function call
    if (line.match(/\w+\s*\($/)) {
      return 'function';
    }

    // Check for property access
    if (word.includes('.')) {
      return 'property';
    }

    // Check for variable reference
    if (word.startsWith('$')) {
      return 'variable';
    }

    // Check for node reference
    if (word.includes('node[') || word.includes('nodes[')) {
      return 'node';
    }

    // Check for string literal
    if (line.match(/["']$/)) {
      return 'string';
    }

    // Check for comment
    if (line.match(/\/\/|\/\*|#/)) {
      return 'comment';
    }

    return 'general';
  }

  private getScope(expression: string, position: Position): string[] {
    const scopes: string[] = ['global'];

    // Parse expression to determine nested scopes
    const tokens = this.parser.tokenize(expression);
    let depth = 0;

    for (const token of tokens) {
      if (token.line > position.line) break;

      if (token.type === 'punctuation') {
        if (token.value === '{' || token.value === '(') depth++;
        if (token.value === '}' || token.value === ')') depth--;
      }

      if (token.type === 'keyword') {
        if (token.value === 'function') scopes.push('function');
        if (token.value === 'if') scopes.push('conditional');
        if (token.value === 'for' || token.value === 'while') scopes.push('loop');
      }
    }

    return scopes;
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  public validate(expression: string): ValidationResult {
    return this.validator.validate(expression);
  }

  public validateRealtime(expression: string, position: Position): ValidationResult {
    // Quick validation for real-time feedback
    const result = this.validator.validatePartial(expression, position);

    this.emit('validationCompleted', result);

    return result;
  }

  // ============================================================================
  // EVALUATION
  // ============================================================================

  public async evaluate(expression: string): Promise<EvaluationResult> {
    // Check cache
    const cached = this.cache.get(expression);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      const result = await this.evaluator.evaluate(expression);

      const evaluationResult: EvaluationResult = {
        success: true,
        value: result,
        type: this.getType(result),
        executionTime: Date.now() - startTime
      };

      // Cache result
      this.cache.set(expression, evaluationResult);

      this.emit('evaluationCompleted', evaluationResult);

      return evaluationResult;
    } catch (error) {
      const evaluationResult: EvaluationResult = {
        success: false,
        error: error as Error,
        executionTime: Date.now() - startTime
      };

      this.emit('evaluationError', evaluationResult);

      return evaluationResult;
    }
  }

  public async evaluatePreview(expression: string): Promise<unknown> {
    // Safe evaluation for preview
    try {
      return await this.evaluator.evaluateSafe(expression);
    } catch {
      return undefined;
    }
  }

  private getType(value: unknown): DataType {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';

    const type = typeof value;
    if (type === 'object' || type === 'string' || type === 'number' ||
        type === 'boolean' || type === 'function') {
      return type as DataType;
    }

    return 'unknown';
  }

  // ============================================================================
  // SYNTAX HIGHLIGHTING
  // ============================================================================

  public tokenize(expression: string): SyntaxToken[] {
    return this.syntaxHighlighter.tokenize(expression);
  }

  public highlight(expression: string, theme: string): string {
    const tokens = this.tokenize(expression);
    return this.syntaxHighlighter.toHTML(tokens, theme);
  }

  // ============================================================================
  // CODE ACTIONS
  // ============================================================================

  public getCodeActions(
    expression: string,
    range: Range,
    diagnostics: ValidationError[]
  ): CodeAction[] {
    const actions: CodeAction[] = [];

    // Quick fixes for errors
    for (const diagnostic of diagnostics) {
      const fixes = this.getQuickFixes(expression, diagnostic);
      actions.push(...fixes);
    }

    // Refactoring suggestions
    const refactorings = this.getRefactorings(expression, range);
    actions.push(...refactorings);

    return actions;
  }

  private getQuickFixes(_expression: string, error: ValidationError): CodeAction[] {
    const fixes: CodeAction[] = [];

    // Fix undefined variable
    if (error.code === 'undefined-variable') {
      fixes.push({
        id: generateId(),
        title: 'Declare variable',
        kind: 'quickfix',
        diagnostics: [error],
        edit: {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 }
          },
          newText: `let ${error.message.match(/'\w+'/)?.[0]?.replace(/'/g, '')} = null;\n`
        }
      });
    }

    // Fix missing parenthesis
    if (error.code === 'missing-parenthesis') {
      fixes.push({
        id: generateId(),
        title: 'Add missing parenthesis',
        kind: 'quickfix',
        diagnostics: [error],
        edit: {
          range: {
            start: { line: error.line, character: error.column },
            end: { line: error.line, character: error.column }
          },
          newText: ')'
        }
      });
    }

    return fixes;
  }

  private getRefactorings(expression: string, range: Range): CodeAction[] {
    const refactorings: CodeAction[] = [];

    // Extract variable
    refactorings.push({
      id: generateId(),
      title: 'Extract to variable',
      kind: 'refactor.extract',
      command: {
        id: 'extract-variable',
        title: 'Extract Variable',
        arguments: [expression, range]
      }
    });

    // Inline variable
    refactorings.push({
      id: generateId(),
      title: 'Inline variable',
      kind: 'refactor.inline',
      command: {
        id: 'inline-variable',
        title: 'Inline Variable',
        arguments: [expression, range]
      }
    });

    return refactorings;
  }

  // ============================================================================
  // HOVER & SIGNATURE HELP
  // ============================================================================

  public getHover(expression: string, position: Position): HoverInfo | null {
    const context = this.getContextAtPosition(expression, position);

    if (context.type === 'variable') {
      const variable = this.context.variables.find(v => v.name === context.word);
      if (variable) {
        return {
          contents: {
            kind: 'markdown',
            value: `**${variable.name}**: ${variable.type}\n\n${variable.description || ''}\n\nValue: \`${JSON.stringify(variable.value)}\``
          }
        };
      }
    }

    if (context.type === 'function') {
      const func = this.context.functions.find(f => context.word.includes(f.name));
      if (func) {
        return {
          contents: {
            kind: 'markdown',
            value: `**${func.name}**\n\n${func.signature}\n\n${func.description || ''}`
          }
        };
      }
    }

    return null;
  }

  public getSignatureHelp(expression: string, position: Position): SignatureHelp | null {
    const context = this.getContextAtPosition(expression, position);

    // Find function call
    const funcMatch = context.beforeCursor.match(/(\w+)\s*\(/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const func = this.context.functions.find(f => f.name === funcName);

      if (func) {
        return {
          signatures: [{
            label: func.signature,
            documentation: func.description,
            parameters: func.parameters.map(p => ({
              label: p.name,
              documentation: p.description
            }))
          }],
          activeSignature: 0,
          activeParameter: this.getActiveParameter(context.beforeCursor)
        };
      }
    }

    return null;
  }

  private getActiveParameter(text: string): number {
    // Count commas to determine active parameter
    const openParen = text.lastIndexOf('(');
    if (openParen === -1) return 0;

    const afterParen = text.substring(openParen + 1);
    const commas = afterParen.split(',').length - 1;

    return commas;
  }

  // ============================================================================
  // FORMATTING
  // ============================================================================

  public format(expression: string): string {
    return this.formatter.format(expression);
  }

  public formatSelection(expression: string, range: Range): string {
    return this.formatter.formatRange(expression, range);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  public updateContext(context: Partial<ExpressionContext>): void {
    Object.assign(this.context, context);
    this.suggestionEngine.updateContext(this.context);
    this.evaluator.updateContext(this.context);
    this.validator.updateContext(this.context);

    this.emit('contextUpdated', this.context);
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public dispose(): void {
    this.removeAllListeners();
    this.clearCache();
  }
}
