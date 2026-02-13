/**
 * Expression Editor Pro
 * Rich expression editor with autocomplete and syntax highlighting (like n8n)
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Code,
  Variable,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Info,
  Wand2,
  Zap,
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface ExpressionEditorProProps {
  value: string;
  onChange: (value: string) => void;
  nodeId: string;
  placeholder?: string;
  onClose?: () => void;
}

interface Suggestion {
  type: 'variable' | 'function' | 'property';
  label: string;
  value: string;
  description?: string;
  returnType?: string;
}

// Built-in functions
const BUILTIN_FUNCTIONS: Suggestion[] = [
  { type: 'function', label: '$now', value: '$now', description: 'Current date/time', returnType: 'DateTime' },
  { type: 'function', label: '$today', value: '$today', description: 'Today at midnight', returnType: 'DateTime' },
  { type: 'function', label: '$json', value: '$json', description: 'Current item JSON data', returnType: 'Object' },
  { type: 'function', label: '$items()', value: '$items()', description: 'All items from previous node', returnType: 'Array' },
  { type: 'function', label: '$item', value: '$item', description: 'Current item index', returnType: 'Number' },
  { type: 'function', label: '$node', value: '$node', description: 'Access other nodes data', returnType: 'Object' },
  { type: 'function', label: '$workflow', value: '$workflow', description: 'Workflow metadata', returnType: 'Object' },
  { type: 'function', label: '$execution', value: '$execution', description: 'Execution info', returnType: 'Object' },
  { type: 'function', label: '$env', value: '$env', description: 'Environment variables', returnType: 'Object' },
  { type: 'function', label: '$vars', value: '$vars', description: 'Workflow variables', returnType: 'Object' },
];

// String functions
const STRING_FUNCTIONS: Suggestion[] = [
  { type: 'function', label: '.toLowerCase()', value: '.toLowerCase()', description: 'Convert to lowercase', returnType: 'String' },
  { type: 'function', label: '.toUpperCase()', value: '.toUpperCase()', description: 'Convert to uppercase', returnType: 'String' },
  { type: 'function', label: '.trim()', value: '.trim()', description: 'Remove whitespace', returnType: 'String' },
  { type: 'function', label: '.split()', value: '.split("")', description: 'Split string into array', returnType: 'Array' },
  { type: 'function', label: '.replace()', value: '.replace("", "")', description: 'Replace substring', returnType: 'String' },
  { type: 'function', label: '.includes()', value: '.includes("")', description: 'Check if contains', returnType: 'Boolean' },
  { type: 'function', label: '.substring()', value: '.substring(0, 10)', description: 'Extract substring', returnType: 'String' },
  { type: 'function', label: '.length', value: '.length', description: 'String length', returnType: 'Number' },
];

// Array functions
const ARRAY_FUNCTIONS: Suggestion[] = [
  { type: 'function', label: '.map()', value: '.map(item => item)', description: 'Transform each item', returnType: 'Array' },
  { type: 'function', label: '.filter()', value: '.filter(item => item)', description: 'Filter items', returnType: 'Array' },
  { type: 'function', label: '.find()', value: '.find(item => item)', description: 'Find first match', returnType: 'Any' },
  { type: 'function', label: '.reduce()', value: '.reduce((acc, item) => acc, 0)', description: 'Reduce to value', returnType: 'Any' },
  { type: 'function', label: '.join()', value: '.join(", ")', description: 'Join to string', returnType: 'String' },
  { type: 'function', label: '.length', value: '.length', description: 'Array length', returnType: 'Number' },
  { type: 'function', label: '.first()', value: '.first()', description: 'First item', returnType: 'Any' },
  { type: 'function', label: '.last()', value: '.last()', description: 'Last item', returnType: 'Any' },
];

const ExpressionEditorPro: React.FC<ExpressionEditorProProps> = ({
  value,
  onChange,
  nodeId,
  placeholder = 'Enter expression...',
  onClose,
}) => {
  const { nodes, executionResults } = useWorkflowStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [previewResult, setPreviewResult] = useState<{ value: unknown; error?: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get available variables from previous nodes
  const nodeVariables = useMemo(() => {
    const currentNodeIndex = nodes.findIndex(n => n.id === nodeId);
    const previousNodes = nodes.slice(0, currentNodeIndex);

    return previousNodes.map(node => ({
      type: 'variable' as const,
      label: `$node["${node.data?.label || node.id}"]`,
      value: `$node["${node.data?.label || node.id}"].json`,
      description: `Output from ${node.data?.label || node.data?.type}`,
      returnType: 'Object',
    }));
  }, [nodes, nodeId]);

  // All available suggestions
  const allSuggestions = useMemo(() => {
    return [...BUILTIN_FUNCTIONS, ...nodeVariables, ...STRING_FUNCTIONS, ...ARRAY_FUNCTIONS];
  }, [nodeVariables]);

  // Filter suggestions based on input
  const filterSuggestions = useCallback((text: string, position: number) => {
    // Get the word being typed
    const beforeCursor = text.substring(0, position);
    const match = beforeCursor.match(/[\$\w\.]+$/);
    const searchTerm = match ? match[0].toLowerCase() : '';

    if (!searchTerm || searchTerm.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = allSuggestions.filter(s =>
      s.label.toLowerCase().includes(searchTerm) ||
      s.value.toLowerCase().includes(searchTerm)
    ).slice(0, 10);

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(0);
  }, [allSuggestions]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart || 0;
    onChange(newValue);
    setCursorPosition(position);
    filterSuggestions(newValue, position);

    // Try to evaluate expression for preview
    try {
      // Simple preview - in real implementation would use expression engine
      if (newValue.startsWith('{{') && newValue.endsWith('}}')) {
        const expr = newValue.slice(2, -2).trim();
        // Mock evaluation for demo
        if (expr === '$now') {
          setPreviewResult({ value: new Date().toISOString() });
        } else if (expr === '$today') {
          setPreviewResult({ value: new Date().toDateString() });
        } else {
          setPreviewResult({ value: expr, error: undefined });
        }
      } else {
        setPreviewResult(null);
      }
    } catch (err) {
      setPreviewResult({ value: null, error: (err as Error).message });
    }
  }, [onChange, filterSuggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: Suggestion) => {
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);

    // Find and replace the search term
    const match = beforeCursor.match(/[\$\w\.]+$/);
    const startPos = match ? cursorPosition - match[0].length : cursorPosition;
    const newValue = value.substring(0, startPos) + suggestion.value + afterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Focus back and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = startPos + suggestion.value.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  }, [value, cursorPosition, onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
      case 'Tab':
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex, handleSelectSuggestion]);

  // Insert expression template
  const insertTemplate = useCallback((template: string) => {
    const newValue = value ? value + ' ' + template : template;
    onChange(newValue);
    textareaRef.current?.focus();
  }, [value, onChange]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Code size={16} className="text-purple-600" />
          <span className="text-sm font-medium text-gray-700">Expression Editor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertTemplate('{{ }}')}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
            title="Insert expression"
          >
            <Wand2 size={12} className="inline mr-1" />
            {'{{ }}'}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
              <X size={14} className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Quick insert bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 bg-gray-50/50 overflow-x-auto">
        <span className="text-xs text-gray-500 mr-2">Quick:</span>
        {BUILTIN_FUNCTIONS.slice(0, 5).map(fn => (
          <button
            key={fn.label}
            onClick={() => insertTemplate(`{{ ${fn.value} }}`)}
            className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            {fn.label}
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full p-3 text-sm font-mono resize-none focus:outline-none min-h-[100px]"
          style={{
            background: 'linear-gradient(to right, #faf5ff 0%, white 20%)',
          }}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full z-50 bg-white border border-gray-200 rounded-b-lg shadow-xl max-h-64 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.value}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className={`p-1 rounded ${
                  suggestion.type === 'variable'
                    ? 'bg-blue-100 text-blue-600'
                    : suggestion.type === 'function'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {suggestion.type === 'variable' ? (
                    <Variable size={14} />
                  ) : (
                    <Zap size={14} />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-gray-900">{suggestion.label}</p>
                  {suggestion.description && (
                    <p className="text-xs text-gray-500 truncate">{suggestion.description}</p>
                  )}
                </div>
                {suggestion.returnType && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {suggestion.returnType}
                  </span>
                )}
                <ChevronRight size={14} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview / Error */}
      {previewResult && (
        <div className={`px-3 py-2 border-t text-sm ${
          previewResult.error
            ? 'bg-red-50 border-red-200'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start gap-2">
            {previewResult.error ? (
              <AlertCircle size={14} className="text-red-500 mt-0.5" />
            ) : (
              <Check size={14} className="text-green-500 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-600 mb-0.5">
                {previewResult.error ? 'Error' : 'Preview'}
              </p>
              <p className={`font-mono text-xs truncate ${
                previewResult.error ? 'text-red-600' : 'text-green-700'
              }`}>
                {previewResult.error || JSON.stringify(previewResult.value)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer help */}
      <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Info size={12} />
          Use {'{{ }}'} for expressions
        </span>
        <span>Tab to complete</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
};

export default ExpressionEditorPro;
