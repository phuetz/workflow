/**
 * Suggestion Engine
 * Provides autocomplete suggestions based on context
 */

import type {
  ExpressionContext,
  Suggestion,
  SuggestionType,
  FunctionDefinition,
  Position
} from '../types';

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

export type ContextType =
  | 'general'
  | 'variable'
  | 'function'
  | 'property'
  | 'node'
  | 'string'
  | 'comment';

export interface CompletionContext {
  word: string;
  line: string;
  beforeCursor: string;
  afterCursor: string;
  type: ContextType;
  scope: string[];
  position: Position;
}

export class SuggestionEngine {
  constructor(private context: ExpressionContext) {}

  getSuggestions(context: CompletionContext, _triggerCharacter?: string): Suggestion[] {
    const suggestions: Suggestion[] = [];

    switch (context.type) {
      case 'variable':
        suggestions.push(...this.getVariableSuggestions());
        break;

      case 'function':
        suggestions.push(...this.getFunctionSuggestions());
        break;

      case 'property':
        suggestions.push(...this.getPropertySuggestions(context));
        break;

      case 'node':
        suggestions.push(...this.getNodeSuggestions());
        break;

      default:
        suggestions.push(...this.getGeneralSuggestions());
    }

    // Filter by prefix
    if (context.word) {
      return suggestions.filter(s =>
        s.label.toLowerCase().startsWith(context.word.toLowerCase())
      );
    }

    return suggestions;
  }

  private getVariableSuggestions(): Suggestion[] {
    return this.context.variables.map(variable => ({
      id: generateId(),
      type: 'variable' as SuggestionType,
      label: `$${variable.name}`,
      detail: `${variable.type} - ${variable.scope}`,
      documentation: variable.description,
      insertText: `$${variable.name}`,
      icon: '📦',
      score: 100,
      category: 'Variables',
      previewValue: variable.value
    }));
  }

  private getFunctionSuggestions(): Suggestion[] {
    return this.context.functions.map(func => ({
      id: generateId(),
      type: 'function' as SuggestionType,
      label: func.name,
      detail: func.signature,
      documentation: func.description,
      insertText: `${func.name}($0)`,
      snippet: this.buildFunctionSnippet(func),
      icon: '🔧',
      score: 90,
      category: func.category || 'Functions',
      deprecated: func.deprecated
    }));
  }

  private buildFunctionSnippet(func: FunctionDefinition): string {
    const params = func.parameters.map((p, i) => {
      const placeholder = p.defaultValue ? String(p.defaultValue) : p.name;
      return `\${${i + 1}:${placeholder}}`;
    }).join(', ');

    return `${func.name}(${params})`;
  }

  private getPropertySuggestions(context: CompletionContext): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Parse object before dot
    const parts = context.word.split('.');
    const objectName = parts[0];

    // Find matching node
    const node = this.context.nodes.find(n => n.name === objectName);
    if (node) {
      suggestions.push(...node.outputs.map(output => ({
        id: generateId(),
        type: 'property' as SuggestionType,
        label: output.name,
        detail: `${output.type}`,
        documentation: output.description,
        insertText: output.name,
        icon: '📤',
        score: 95,
        category: 'Node Outputs',
        previewValue: output.value
      })));
    }

    return suggestions;
  }

  private getNodeSuggestions(): Suggestion[] {
    return this.context.nodes.map(node => ({
      id: generateId(),
      type: 'node' as SuggestionType,
      label: node.name,
      detail: node.type,
      documentation: node.description,
      insertText: node.name,
      icon: node.icon || '📋',
      score: 85,
      category: 'Nodes'
    }));
  }

  private getGeneralSuggestions(): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Add keywords
    suggestions.push(...this.context.keywords.map(keyword => ({
      id: generateId(),
      type: 'keyword' as SuggestionType,
      label: keyword,
      insertText: keyword,
      icon: '🔑',
      score: 70,
      category: 'Keywords'
    })));

    // Add operators
    suggestions.push(...this.context.operators.map(operator => ({
      id: generateId(),
      type: 'operator' as SuggestionType,
      label: operator,
      insertText: operator,
      icon: '➕',
      score: 60,
      category: 'Operators'
    })));

    // Add snippets
    suggestions.push(...this.context.snippets.map(snippet => ({
      id: snippet.id,
      type: 'snippet' as SuggestionType,
      label: snippet.name,
      detail: snippet.prefix,
      documentation: snippet.description,
      insertText: snippet.body,
      icon: '📝',
      score: 80,
      category: snippet.category || 'Snippets'
    })));

    return suggestions;
  }

  updateContext(context: ExpressionContext): void {
    this.context = context;
  }
}
