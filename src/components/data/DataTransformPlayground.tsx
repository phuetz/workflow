/**
 * Data Transform Playground
 * Interactive interface for testing and building data transformations
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Save,
  History,
  Search,
  Plus,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Copy
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { DataTransformService } from '../../services/DataTransformService';
import { useToast } from '../ui/Toast';
import type {
  TransformPlayground,
  DataTransformFunction,
  TransformCategory,
  TransformSuggestion,
  ValidationResult,
  PlaygroundHistoryEntry
} from '../../types/dataTransform';


function DataTransformPlayground() {
  const { darkMode } = useWorkflowStore();
  const toast = useToast();
  const [playground, setPlayground] = useState<TransformPlayground | null>(null);
  const [functions, setFunctions] = useState<DataTransformFunction[]>([]);
  const [filteredFunctions, setFilteredFunctions] = useState<DataTransformFunction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TransformCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [suggestions, setSuggestions] = useState<TransformSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const expressionRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const categories: Array<{ key: TransformCategory | 'all', label: string, icon: string }> = [
    { key: 'all', label: 'All Functions', icon: '🔧' },
    { key: 'string', label: 'String', icon: '📝' },
    { key: 'number', label: 'Numbers', icon: '🔢' },
    { key: 'array', label: 'Arrays', icon: '📋' },
    { key: 'object', label: 'Objects', icon: '📦' },
    { key: 'date', label: 'Dates', icon: '📅' },
    { key: 'conversion', label: 'Conversion', icon: '🔄' },
    { key: 'validation', label: 'Validation', icon: '✅' },
    { key: 'math', label: 'Math', icon: '➕' }
  ];

  const dataTransformService = DataTransformService.getInstance();

  const initializePlayground = () => {
    const newPlayground: TransformPlayground = {
      id: Date.now().toString(),
      name: 'New Playground',
      input: {},
      expression: '',
      output: null,
      error: null,
      executionTime: 0,
      history: [],
      savedExpressions: []
    };

    newPlayground.input = {
      name: "John Doe",
      email: "john@example.com",
      age: 30,
      tags: ["developer", "react", "typescript"],
      address: {
        city: "Paris",
        country: "France"
      }
    };
    newPlayground.expression = 'upper($input.name)';
    setPlayground(newPlayground);
  };

  const loadFunctions = () => {
    const allFunctions = dataTransformService.listFunctions();
    setFunctions(allFunctions);
  };

  const getFilteredFunctions = () => {
    let filtered = functions;
    const query = searchQuery.toLowerCase();
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query) ||
        f.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  useEffect(() => {
    initializePlayground();
    loadFunctions();
  }, []);

  useEffect(() => {
    const filtered = getFilteredFunctions();
    setFilteredFunctions(filtered);
  }, [functions, selectedCategory, searchQuery]);

  const validatePlayground = () => {
    if (!playground) return;

    const result = dataTransformService.validateExpression(playground.expression);
    setValidation(result);
  };

  useEffect(() => {
    validatePlayground();
  }, [playground]);

  const executeTransform = async () => {
    if (!playground || isExecuting) return;

    setIsExecuting(true);
    try {
      const result = await dataTransformService.testExpression(playground.expression, playground.input);

      setPlayground(prev => ({
        ...prev!,
        output: result.output,
        error: result.error,
        executionTime: result.executionTime,
        history: [result, ...prev!.history].slice(0, 50) // Keep last 50 entries
      }));

    } catch (error) {
      setPlayground(prev => ({
        ...prev!,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: undefined
      }));
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddFunction = (func: DataTransformFunction) => {
    if (!playground || !expressionRef.current) return;


    // Create function call with placeholder arguments
    const placeholderArgs = func.signature.inputs
      .filter(input => input.required)
      .map(input => input.name === 'input' ? '$input' : `"${input.name}"`)
      .join(', ');

    const functionName = func.name || 'functionName';
    const functionCall = `${functionName}(${placeholderArgs})`;
    const textarea = expressionRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = playground.expression || '';
    const newText = currentText.slice(0, start) + functionCall + currentText.slice(end);

    setPlayground(prev => ({
      ...prev!,
      expression: newText
    }));

    // Focus back to textarea
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + functionCall.length, start + functionCall.length);
    }, 0);
  };

  const handleExpressionChange = (value: string) => {
    setPlayground(prev => ({
      ...prev!,
      expression: value
    }));
    
    // Get suggestions for autocomplete
    if (expressionRef.current) {
      const position = expressionRef.current.selectionStart;
      const textBeforeCursor = value.slice(0, position);
      const currentWord = textBeforeCursor.split(/[\s\(\),\[\]{}]/).pop() || '';
      
      if (currentWord.length > 0) {
        // Get suggestions based on available functions
        const matchingFunctions = functions.filter(f =>
          f.name.toLowerCase().startsWith(currentWord.toLowerCase())
        );
        const newSuggestions: TransformSuggestion[] = matchingFunctions.map(f => ({
          label: f.name,
          value: f.name,
          type: 'function' as const,
          description: f.description,
          category: f.category,
          score: 1
        }));
        setSuggestions(newSuggestions);
        setShowSuggestions(newSuggestions.length > 0);
        setCursorPosition(position);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const handleCompleteSuggestion = (suggestion: string) => {
    if (!playground || !expressionRef.current) return;
    
    const textarea = expressionRef.current;
    const text = playground.expression;
    const cursorPos = textarea.selectionStart || 0;
    
    // Find the word being completed
    const beforeCursor = text.substring(0, cursorPos);
    const lastWordMatch = beforeCursor.match(/[\w.]+$/);
    const wordStart = lastWordMatch ? cursorPos - lastWordMatch[0].length : cursorPos;
    
    const newText = text.substring(0, wordStart) + suggestion + text.substring(cursorPos);
    const newPosition = wordStart + suggestion.length;
    
    setPlayground(prev => ({
      ...prev!,
      expression: newText
    }));
    
    setShowSuggestions(false);
    
    // Focus and position cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const saveExpression = () => {
    if (!playground) return;

    const name = prompt('Enter a name for this expression:');
    if (name) {
      // Store in localStorage for now
      const savedExpressions = JSON.parse(localStorage.getItem('savedExpressions') || '[]');
      savedExpressions.push({
        name,
        expression: playground.expression,
        description: '',
        category: 'Custom',
        savedAt: new Date().toISOString()
      });
      localStorage.setItem('savedExpressions', JSON.stringify(savedExpressions));
      toast.success(`Expression "${name}" saved successfully!`);
    }
  };

  const loadFromHistory = (entry: any) => {
    if (!playground) return;
    
    setPlayground(prev => ({
      ...prev!,
      expression: entry.expression,
      input: entry.input,
      output: entry.output,
      error: entry.error
    }));
  };

  const formatOutput = (output: any): string => {
    if (output === null) return 'null';
    if (output === undefined) return 'undefined';
    if (typeof output === 'string') return output;
    return JSON.stringify(output, null, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (!playground) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} pt-20`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            🧪 Data Transform Playground
          </h1>
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Test and build powerful data transformations with our built-in functions and expression engine
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Function Library */}
          {showLibrary && (
            <div className="col-span-12 lg:col-span-3">
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Function Library
                    </h3>
                    <button
                      onClick={() => setShowLibrary(false)}
                      className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    >
                      <EyeOff size={16} />
                    </button>
                  </div>
                  
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <input
                      type="text"
                      placeholder="Search functions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    />
                  </div>
                  
                  {/* Categories */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {categories.map(category => (
                      <button
                        key={category.key}
                        onClick={() => setSelectedCategory(category.key)}
                        className={`px-2 py-1 text-xs rounded-full transition-colors ${
                          selectedCategory === category.key
                            ? 'bg-blue-500 text-white'
                            : darkMode
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.icon} {category.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Functions List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredFunctions.map(func => (
                    <div
                      key={func.id}
                      className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer`}
                      onClick={() => {
                        // Insert function at cursor position
                        if (!playground || !expressionRef.current) return;
                        const textarea = expressionRef.current;
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        const currentText = playground.expression || '';
                        const functionCall = `${func.name}()`;
                        const newText = currentText.slice(0, start) + functionCall + currentText.slice(end);
                        setPlayground(prev => ({ ...prev!, expression: newText }));
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + functionCall.length - 1, start + functionCall.length - 1);
                        }, 0);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <code className={`text-sm font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              {func.name}()
                            </code>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {func.category}
                            </span>
                          </div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {func.description}
                          </p>
                        </div>
                        <Plus size={14} className={`${darkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 ml-2`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Playground */}
          <div className={`${showLibrary ? 'col-span-12 lg:col-span-6' : 'col-span-12 lg:col-span-8'}`}>
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Expression Editor
                  </h3>
                  <div className="flex items-center space-x-2">
                    {!showLibrary && (
                      <button
                        onClick={() => setShowLibrary(true)}
                        className={`px-3 py-1.5 text-sm rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition-colors`}
                      >
                        <Eye size={14} className="inline mr-1" />
                        Show Library
                      </button>
                    )}
                    <button
                      onClick={executeTransform}
                      disabled={isExecuting || !validation?.valid}
                      className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center space-x-2 transition-colors ${
                        isExecuting || !validation?.valid
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      <Play size={16} />
                      <span>{isExecuting ? 'Running...' : 'Run'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Expression Input */}
                <div className="relative">
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Expression
                  </label>
                  <div className="relative">
                    <textarea
                      ref={expressionRef}
                      value={playground.expression}
                      onChange={(e) => handleExpressionChange(e.target.value)}
                      className={`w-full h-24 px-3 py-2 text-sm font-mono rounded-lg border resize-none ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                      placeholder="Enter your transformation expression..."
                    />
                    
                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className={`absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg z-10 ${
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      }`}>
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => handleCompleteSuggestion(suggestion.label)}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <code className={`text-sm font-mono ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                  {suggestion.label}
                                </code>
                                {suggestion.description && (
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                                    {suggestion.description}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {suggestion.category || suggestion.type}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Validation Status */}
                  {validation && (
                    <div className="mt-2">
                      {validation.valid ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle size={16} />
                          <span className="text-sm">Expression is valid</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {validation.errors.map((error, index) => (
                            <div key={index} className="flex items-center space-x-2 text-red-600">
                              <AlertTriangle size={16} />
                              <span className="text-sm">{error.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {validation.warnings.length > 0 && (
                        <div className="mt-1 space-y-1">
                          {validation.warnings.map((warning, index) => (
                            <div key={index} className="flex items-center space-x-2 text-yellow-600">
                              <Info size={16} />
                              <span className="text-sm">{warning.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Input Data */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Input Data
                  </label>
                  <textarea
                    ref={inputRef}
                    value={JSON.stringify(playground.input, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setPlayground(prev => ({ ...prev!, input: parsed }));
                      } catch {
                        // Invalid JSON, keep as is for now
                      }
                    }}
                    className={`w-full h-32 px-3 py-2 text-sm font-mono rounded-lg border resize-none ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                    placeholder="Enter JSON input data..."
                  />
                </div>

                {/* Output */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Output
                    </label>
                    <div className="flex items-center space-x-2">
                      {playground.executionTime && (
                        <span className={`text-xs flex items-center space-x-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Clock size={12} />
                          <span>{playground.executionTime}ms</span>
                        </span>
                      )}
                      {(playground.output !== undefined || playground.error) && (
                        <button
                          onClick={() => copyToClipboard(playground.error || formatOutput(playground.output))}
                          className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                          <Copy size={12} className="inline mr-1" />
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className={`min-h-32 px-3 py-2 text-sm font-mono rounded-lg border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}>
                    {playground.error ? (
                      <div className="text-red-500">
                        <div className="font-medium mb-1">Error:</div>
                        <div>{playground.error}</div>
                      </div>
                    ) : playground.output !== undefined ? (
                      <pre className="whitespace-pre-wrap">{formatOutput(playground.output)}</pre>
                    ) : (
                      <div className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} italic`}>
                        Click "Run" to see the output
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History & Tools */}
          <div className={`${showLibrary ? 'col-span-12 lg:col-span-3' : 'col-span-12 lg:col-span-4'}`}>
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm p-4`}>
                <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={saveExpression}
                    className={`p-3 text-sm rounded-lg border-2 border-dashed transition-colors ${
                      darkMode 
                        ? 'border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300' 
                        : 'border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700'
                    }`}
                  >
                    <Save size={16} className="mx-auto mb-1" />
                    <div>Save</div>
                  </button>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`p-3 text-sm rounded-lg border-2 border-dashed transition-colors ${
                      darkMode 
                        ? 'border-gray-600 hover:border-gray-500 text-gray-400 hover:text-gray-300' 
                        : 'border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700'
                    }`}
                  >
                    <History size={16} className="mx-auto mb-1" />
                    <div>History</div>
                  </button>
                </div>
              </div>

              {/* History */}
              {showHistory && playground.history.length > 0 && (
                <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm`}>
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Execution History
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {playground.history.map((entry, index) => (
                      <div
                        key={index}
                        onClick={() => loadFromHistory(entry)}
                        className={`p-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer last:border-b-0`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <code className={`text-xs font-mono block truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {entry.expression}
                            </code>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {entry.timestamp.toLocaleTimeString()}
                              </span>
                              {entry.executionTime && (
                                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {entry.executionTime}ms
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-2">
                            {entry.error ? (
                              <AlertTriangle size={14} className="text-red-500" />
                            ) : (
                              <CheckCircle size={14} className="text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTransformPlayground;