/**
 * ExpressionEditorMonaco - Monaco-based expression editor with autocomplete
 *
 * Features:
 * - Monaco editor integration
 * - Syntax highlighting for {{ }} expressions
 * - Autocomplete for context variables and functions
 * - Real-time error checking
 * - Test evaluation panel
 * - Variable browser
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { SecureExpressionEngineV2 as ExpressionEngine } from '../../expressions/SecureExpressionEngineV2';
import { ExpressionContext } from '../../expressions/ExpressionContext';
import { getAllCompletions, getCompletionsByCategory } from '../../expressions/autocomplete';
import type { editor, IDisposable } from 'monaco-editor';
import { logger } from '../../services/SimpleLogger';

interface ExpressionEditorMonacoProps {
  value: string;
  onChange: (value: string) => void;
  context?: Record<string, any>;
  height?: string;
  showTestPanel?: boolean;
  showVariables?: boolean;
  placeholder?: string;
  label?: string;
}

export const ExpressionEditorMonaco: React.FC<ExpressionEditorMonacoProps> = ({
  value,
  onChange,
  context = {},
  height = '200px',
  showTestPanel = true,
  showVariables = true,
  placeholder = 'Enter expression...',
  label,
}) => {
  const [testResult, setTestResult] = useState<unknown>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Context Variables');
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const completionProviderRef = useRef<IDisposable | null>(null);
  const languageRegisteredRef = useRef<boolean>(false);

  // Handle editor mount
  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register custom language for expressions (only once)
    if (!languageRegisteredRef.current) {
      // Check if language is already registered
      const languages = monaco.languages.getLanguages();
      const languageExists = languages.some(lang => lang.id === 'n8n-expression');

      if (!languageExists) {
        monaco.languages.register({ id: 'n8n-expression' });
      }

      languageRegisteredRef.current = true;
    }

    // Define tokens for syntax highlighting
    monaco.languages.setMonarchTokensProvider('n8n-expression', {
      tokenizer: {
        root: [
          // Expression delimiters
          [/\{\{/, 'delimiter.expression'],
          [/\}\}/, 'delimiter.expression'],

          // Context variables
          [/\$[a-zA-Z_][a-zA-Z0-9_]*/, 'variable.context'],

          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          [/`/, 'string', '@string_backtick'],

          // Numbers
          [/\d+\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/\d+/, 'number'],

          // Keywords
          [/\b(new|return|if|else|true|false|null|undefined)\b/, 'keyword'],

          // Functions
          [/[a-zA-Z_][a-zA-Z0-9_]*(?=\()/, 'function'],

          // Operators
          [/[+\-*/%<>=!&|?:]/, 'operator'],
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop'],
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop'],
        ],
        string_backtick: [
          [/[^\\`$]+/, 'string'],
          [/\$\{/, 'delimiter.expression', '@expression'],
          [/\\./, 'string.escape'],
          [/`/, 'string', '@pop'],
        ],
        expression: [
          [/\}/, 'delimiter.expression', '@pop'],
          { include: 'root' },
        ],
      },
    });

    // Define custom theme
    monaco.editor.defineTheme('n8n-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'delimiter.expression', foreground: 'FFA500', fontStyle: 'bold' },
        { token: 'variable.context', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'operator', foreground: 'D4D4D4' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editorCursor.foreground': '#AEAFAD',
        'editor.lineHighlightBackground': '#2A2A2A',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
      },
    });

    // Register autocomplete provider (store disposable reference)
    const completionProvider = monaco.languages.registerCompletionItemProvider('n8n-expression', {
      provideCompletionItems: (model, position) => {
        const wordInfo = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        };

        const completions = getAllCompletions();
        const suggestions: any[] = completions.map(item => {
          // Map kind to Monaco completion item kind
          let kind: any;
          switch (item.kind) {
            case 'variable':
              kind = monaco.languages.CompletionItemKind.Variable;
              break;
            case 'function':
              kind = monaco.languages.CompletionItemKind.Function;
              break;
            case 'property':
              kind = monaco.languages.CompletionItemKind.Property;
              break;
            case 'keyword':
              kind = monaco.languages.CompletionItemKind.Keyword;
              break;
            case 'snippet':
              kind = monaco.languages.CompletionItemKind.Snippet;
              break;
            default:
              kind = monaco.languages.CompletionItemKind.Text;
          }

          return {
            label: item.label,
            kind,
            detail: item.detail,
            documentation: item.documentation
              ? {
                  value: `${item.documentation}\n\n**Example:**\n\`\`\`\n${item.example}\n\`\`\``,
                }
              : undefined,
            insertText: item.insertText || item.label,
            insertTextRules: item.insertText?.includes('${')
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            range,
          };
        });

        return { suggestions };
      },
    });

    // Store completion provider reference for cleanup
    completionProviderRef.current = completionProvider;

    // Set theme
    monaco.editor.setTheme('n8n-theme');
  }, []);

  // Handle value change
  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue || '');
    },
    [onChange]
  );

  // Test expression evaluation
  const testExpression = useCallback(() => {
    if (!value) {
      setTestResult(null);
      setTestError(null);
      return;
    }

    setIsEvaluating(true);
    setTestError(null);

    try {
      const result = ExpressionEngine.evaluateAll(value, context);

      if (result.success) {
        setTestResult(result.value);
        setTestError(null);
      } else {
        setTestResult(null);
        setTestError(result.error || 'Unknown error');
      }
    } catch (error) {
      setTestResult(null);
      setTestError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsEvaluating(false);
    }
  }, [value, context]);

  // Auto-test when value or context changes
  useEffect(() => {
    if (showTestPanel && value) {
      const timer = setTimeout(testExpression, 500);
      return () => clearTimeout(timer);
    }
  }, [value, context, showTestPanel, testExpression]);

  // Cleanup effect - dispose all Monaco resources on unmount
  useEffect(() => {
    return () => {
      // Dispose completion provider
      if (completionProviderRef.current) {
        try {
          completionProviderRef.current.dispose();
          completionProviderRef.current = null;
        } catch (error) {
          logger.error('Error disposing completion provider:', error);
        }
      }

      // Dispose editor instance
      if (editorRef.current) {
        try {
          editorRef.current.dispose();
          editorRef.current = null;
        } catch (error) {
          logger.error('Error disposing editor:', error);
        }
      }

      // Clear Monaco reference
      monacoRef.current = null;

      // Reset language registration flag
      languageRegisteredRef.current = false;
    };
  }, []);

  // Get available variables from context
  const availableVariables = ExpressionEngine.getAvailableVariables(context);

  // Get completions by category
  const completionsByCategory = getCompletionsByCategory();
  const categories = Object.keys(completionsByCategory);

  return (
    <div className="expression-editor">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="flex gap-4">
        {/* Editor */}
        <div className="flex-1">
          <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
            <Editor
              height={height}
              defaultLanguage="n8n-expression"
              value={value}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                lineNumbers: 'off',
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                tabSize: 2,
                fontSize: 14,
                fontFamily: 'Monaco, Menlo, "Courier New", monospace',
              }}
            />
          </div>

          {/* Test Panel */}
          {showTestPanel && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Test Result
                </h4>
                <button
                  onClick={testExpression}
                  disabled={isEvaluating || !value}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEvaluating ? 'Testing...' : 'Test'}
                </button>
              </div>

              {testError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  <strong>Error:</strong> {testError}
                </div>
              )}

              {testResult !== null && !testError && (
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  <pre className="bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-auto max-h-40">
                    {typeof testResult === 'string'
                      ? testResult
                      : JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}

              {!value && (
                <div className="text-sm text-gray-500 italic">
                  Enter an expression to see the result
                </div>
              )}
            </div>
          )}
        </div>

        {/* Variables Sidebar */}
        {showVariables && (
          <div className="w-80 border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Available Functions & Variables
            </h3>

            {/* Category Tabs */}
            <div className="mb-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Completions List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {completionsByCategory[selectedCategory]?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-colors"
                  onClick={() => {
                    if (editorRef.current) {
                      const selection = editorRef.current.getSelection();
                      if (selection) {
                        editorRef.current.executeEdits('', [
                          {
                            range: selection,
                            text: item.insertText || item.label,
                          },
                        ]);
                        editorRef.current.focus();
                      }
                    }
                  }}
                >
                  <div className="font-mono text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {item.label}
                  </div>
                  {item.detail && (
                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.detail}
                    </div>
                  )}
                  {item.documentation && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {item.documentation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Context Variables */}
            {selectedCategory === 'Context Variables' && availableVariables.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Available in Context
                </h4>
                <div className="space-y-1">
                  {availableVariables.slice(0, 20).map((variable, idx) => (
                    <div
                      key={idx}
                      className="text-xs font-mono text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                      onClick={() => {
                        if (editorRef.current) {
                          const selection = editorRef.current.getSelection();
                          if (selection) {
                            editorRef.current.executeEdits('', [
                              {
                                range: selection,
                                text: variable,
                              },
                            ]);
                            editorRef.current.focus();
                          }
                        }
                      }}
                    >
                      {variable}
                    </div>
                  ))}
                  {availableVariables.length > 20 && (
                    <div className="text-xs text-gray-500 italic">
                      ...and {availableVariables.length - 20} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Examples */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
          Quick Examples
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Access JSON data', code: '{{ $json.email }}' },
            { label: 'Uppercase text', code: '{{ toUpperCase($json.name) }}' },
            { label: 'Current date', code: '{{ $now.toISOString() }}' },
            { label: 'Filter array', code: '{{ $items.filter(i => i.json.active) }}' },
          ].map((example, idx) => (
            <button
              key={idx}
              onClick={() => onChange(example.code)}
              className="text-left p-2 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-700 hover:border-blue-500 transition-colors"
            >
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {example.label}
              </div>
              <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-1">
                {example.code}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpressionEditorMonaco;
