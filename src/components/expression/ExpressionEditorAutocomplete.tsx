/**
 * Expression Editor with Autocomplete
 * Advanced expression editor with IntelliSense-like autocomplete
 * Supports variables, functions, node outputs, and custom expressions
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// Import types from extracted module
import type {
  ExpressionContext,
  Suggestion,
  ValidationResult,
  EvaluationResult,
  HoverInfo,
  Position,
  EditorConfig
} from './types';

// Import engine from extracted module
import { ExpressionEngine } from './engine';

// Re-export types for backwards compatibility
export * from './types';
export { ExpressionEngine } from './engine';

// ============================================================================
// REACT COMPONENT
// ============================================================================

interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onEvaluate?: (result: EvaluationResult) => void;
  context?: ExpressionContext;
  config?: Partial<EditorConfig>;
  readOnly?: boolean;
  height?: string | number;
  className?: string;
}

export const ExpressionEditorAutocomplete: React.FC<ExpressionEditorProps> = ({
  value,
  onChange,
  onEvaluate,
  context,
  config,
  readOnly = false,
  height = '200px',
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<Position>({ line: 0, character: 0 });
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const engineRef = useRef<ExpressionEngine>();
  
  const defaultContext: ExpressionContext = useMemo(() => ({
    variables: [],
    functions: [],
    nodes: [],
    constants: [],
    keywords: ['if', 'else', 'for', 'while', 'function', 'return', 'const', 'let', 'var'],
    operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>='],
    snippets: [],
    templates: [],
    history: []
  }), []);
  
  useEffect(() => {
    engineRef.current = new ExpressionEngine(context || defaultContext);
    
    return () => {
      engineRef.current?.dispose();
    };
  }, [context, defaultContext]);
  
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
    
    // Update cursor position
    const pos = {
      line: newValue.substring(0, e.target.selectionStart).split('\n').length - 1,
      character: e.target.selectionStart - newValue.lastIndexOf('\n', e.target.selectionStart - 1) - 1
    };
    setCursorPosition(pos);
    
    // Get suggestions
    if (engineRef.current && config?.enableLiveAutocompletion !== false) {
      const suggestions = engineRef.current.getSuggestions(newValue, pos);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    }
    
    // Validate
    if (engineRef.current && config?.validateOnChange !== false) {
      const result = engineRef.current.validateRealtime(newValue, pos);
      setValidationResult(result);
    }
  }, [onChange, config]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestion]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
    
    // Ctrl+Space for manual trigger
    if (e.ctrlKey && e.key === ' ') {
      e.preventDefault();
      if (engineRef.current) {
        const suggestions = engineRef.current.getSuggestions(internalValue, cursorPosition);
        setSuggestions(suggestions);
        setShowSuggestions(true);
      }
    }
    
    // Ctrl+Enter to evaluate
    if (e.ctrlKey && e.key === 'Enter' && onEvaluate && engineRef.current) {
      e.preventDefault();
      engineRef.current.evaluate(internalValue).then(onEvaluate);
    }
  }, [showSuggestions, suggestions, selectedSuggestion, internalValue, cursorPosition, onEvaluate]);
  
  const applySuggestion = useCallback((suggestion: Suggestion) => {
    if (!editorRef.current) return;
    
    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Find word boundaries
    let wordStart = start;
    while (wordStart > 0 && /\w/.test(internalValue[wordStart - 1])) {
      wordStart--;
    }
    
    const newValue = 
      internalValue.substring(0, wordStart) +
      suggestion.insertText +
      internalValue.substring(end);
    
    setInternalValue(newValue);
    onChange(newValue);
    setShowSuggestions(false);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      const newPosition = wordStart + suggestion.insertText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  }, [internalValue, onChange]);
  
  return (
    <div className={`expression-editor-container ${className}`}>
      <div className="editor-wrapper" style={{ height }}>
        <textarea
          ref={editorRef}
          value={internalValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          className="expression-editor-textarea"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        
        {showSuggestions && (
          <div className="suggestions-dropdown">
            {suggestions.slice(0, config?.maxSuggestions || 10).map((suggestion, index) => (
              <div
                key={suggestion.id}
                className={`suggestion-item ${index === selectedSuggestion ? 'selected' : ''}`}
                onClick={() => applySuggestion(suggestion)}
              >
                <span className="suggestion-icon">{suggestion.icon}</span>
                <span className="suggestion-label">{suggestion.label}</span>
                {suggestion.detail && (
                  <span className="suggestion-detail">{suggestion.detail}</span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {validationResult && !validationResult.valid && (
          <div className="validation-errors">
            {validationResult.errors.map((error, index) => (
              <div key={index} className="validation-error">
                Line {error.line + 1}: {error.message}
              </div>
            ))}
          </div>
        )}
        
        {hoverInfo && (
          <div className="hover-tooltip">
            {typeof hoverInfo.contents === 'string' 
              ? hoverInfo.contents 
              : hoverInfo.contents.value}
          </div>
        )}
      </div>
      
      <style>{`
        .expression-editor-container {
          position: relative;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }
        
        .editor-wrapper {
          position: relative;
          border: 1px solid #ddd;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .expression-editor-textarea {
          width: 100%;
          height: 100%;
          padding: 8px;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.5;
          border: none;
          outline: none;
          resize: none;
          background: #fff;
        }
        
        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          background: #fff;
          border: 1px solid #ddd;
          border-top: none;
          border-radius: 0 0 4px 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 1000;
        }
        
        .suggestion-item {
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .suggestion-item:hover,
        .suggestion-item.selected {
          background: #f5f5f5;
        }
        
        .suggestion-icon {
          flex-shrink: 0;
        }
        
        .suggestion-label {
          flex-grow: 1;
          font-weight: 500;
        }
        
        .suggestion-detail {
          font-size: 12px;
          color: #666;
        }
        
        .validation-errors {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #fee;
          border-top: 1px solid #fcc;
          padding: 4px 8px;
          font-size: 12px;
          color: #c00;
        }
        
        .hover-tooltip {
          position: absolute;
          background: #333;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          pointer-events: none;
          z-index: 1001;
        }
      `}</style>
    </div>
  );
};

export default ExpressionEditorAutocomplete;