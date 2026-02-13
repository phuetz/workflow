/**
 * Expression Editor Types
 * All types and interfaces for the expression system
 */

/**
 * Expression Types
 */
export type ExpressionType =
  | 'javascript'
  | 'python'
  | 'jsonpath'
  | 'jmespath'
  | 'sql'
  | 'graphql'
  | 'regex'
  | 'template';

/**
 * Suggestion Types
 */
export interface Suggestion {
  id: string;
  type: SuggestionType;
  label: string;
  detail?: string;
  documentation?: string;
  insertText: string;
  snippet?: string;
  icon?: string;
  score: number;
  category?: string;
  deprecated?: boolean;
  tags?: string[];
  previewValue?: unknown;
  metadata?: Record<string, unknown>;
}

export type SuggestionType =
  | 'variable'
  | 'function'
  | 'method'
  | 'property'
  | 'keyword'
  | 'operator'
  | 'constant'
  | 'node'
  | 'snippet'
  | 'template';

/**
 * Expression Context
 */
export interface ExpressionContext {
  variables: Variable[];
  functions: FunctionDefinition[];
  nodes: NodeReference[];
  constants: Constant[];
  keywords: string[];
  operators: string[];
  snippets: Snippet[];
  templates: Template[];
  history: string[];
  metadata?: Record<string, unknown>;
}

export interface Variable {
  name: string;
  type: DataType;
  value?: unknown;
  scope: 'global' | 'local' | 'node' | 'workflow';
  description?: string;
  example?: unknown;
  mutable?: boolean;
  source?: string;
}

export interface FunctionDefinition {
  name: string;
  signature: string;
  parameters: Parameter[];
  returnType: DataType;
  description?: string;
  examples?: Example[];
  category?: string;
  deprecated?: boolean;
  async?: boolean;
  pure?: boolean;
}

export interface Parameter {
  name: string;
  type: DataType;
  optional?: boolean;
  defaultValue?: unknown;
  description?: string;
  rest?: boolean;
}

export interface NodeReference {
  id: string;
  name: string;
  type: string;
  outputs: NodeOutput[];
  inputs?: NodeInput[];
  description?: string;
  icon?: string;
}

export interface NodeOutput {
  name: string;
  path: string;
  type: DataType;
  value?: unknown;
  description?: string;
  example?: unknown;
}

export interface NodeInput {
  name: string;
  path: string;
  type: DataType;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface Constant {
  name: string;
  value: unknown;
  type: DataType;
  description?: string;
  category?: string;
}

export interface Snippet {
  id: string;
  name: string;
  prefix: string;
  body: string;
  description?: string;
  placeholders?: Placeholder[];
  category?: string;
  scope?: string[];
}

export interface Placeholder {
  index: number;
  name: string;
  defaultValue?: string;
  choices?: string[];
  transform?: string;
}

export interface Template {
  id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
  examples?: Example[];
  category?: string;
}

export interface Example {
  input: string;
  output: unknown;
  description?: string;
}

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'date'
  | 'function'
  | 'null'
  | 'undefined'
  | 'any'
  | 'unknown';

/**
 * Editor Configuration
 */
export interface EditorConfig {
  language: ExpressionType;
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  lineNumbers: boolean;
  lineWrapping: boolean;
  tabSize: number;
  autoCloseBrackets: boolean;
  autoCloseTags: boolean;
  matchBrackets: boolean;
  highlightSelectionMatches: boolean;
  showInvisibles: boolean;
  showGutter: boolean;
  showFoldGutter: boolean;
  enableSnippets: boolean;
  enableLiveAutocompletion: boolean;
  enableBasicAutocompletion: boolean;
  completionDelay: number;
  maxSuggestions: number;
  fuzzyMatching: boolean;
  caseSensitive: boolean;
  validateOnChange: boolean;
  formatOnPaste: boolean;
  formatOnType: boolean;
}

/**
 * Validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error';
  code?: string;
  source?: string;
}

export interface ValidationWarning {
  line: number;
  column: number;
  message: string;
  severity: 'warning';
  code?: string;
  source?: string;
}

export interface ValidationInfo {
  line: number;
  column: number;
  message: string;
  severity: 'info';
  code?: string;
  source?: string;
}

/**
 * Evaluation
 */
export interface EvaluationResult {
  success: boolean;
  value?: unknown;
  error?: Error;
  type?: DataType;
  executionTime?: number;
  memoryUsed?: number;
  console?: ConsoleOutput[];
}

export interface ConsoleOutput {
  type: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
}

/**
 * Syntax Highlighting
 */
export interface SyntaxToken {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export type TokenType =
  | 'keyword'
  | 'identifier'
  | 'string'
  | 'number'
  | 'boolean'
  | 'operator'
  | 'punctuation'
  | 'comment'
  | 'whitespace'
  | 'variable'
  | 'function'
  | 'property'
  | 'method'
  | 'type'
  | 'error';

/**
 * Code Actions
 */
export interface CodeAction {
  id: string;
  title: string;
  kind: CodeActionKind;
  diagnostics?: ValidationError[];
  edit?: TextEdit;
  command?: Command;
  isPreferred?: boolean;
}

export type CodeActionKind =
  | 'quickfix'
  | 'refactor'
  | 'refactor.extract'
  | 'refactor.inline'
  | 'refactor.rewrite'
  | 'source'
  | 'source.organizeImports';

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  character: number;
}

export interface Command {
  id: string;
  title: string;
  arguments?: unknown[];
}

/**
 * Hover Information
 */
export interface HoverInfo {
  contents: string | MarkupContent;
  range?: Range;
}

export interface MarkupContent {
  kind: 'plaintext' | 'markdown';
  value: string;
}

/**
 * Signature Help
 */
export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string | MarkupContent;
  parameters?: ParameterInformation[];
}

export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | MarkupContent;
}
