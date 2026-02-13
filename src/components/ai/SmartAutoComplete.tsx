import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { Search, Zap, Code, Database, Globe, MessageCircle } from 'lucide-react';
import { logger } from '../../services/SimpleLogger';

interface Suggestion {
  id: string;
  type: 'node' | 'expression' | 'function' | 'variable' | 'api';
  label: string;
  description: string;
  category: string;
  icon: string;
  insertText: string;
  score: number;
}

interface SmartAutoCompleteProps {
  inputValue: string;
  onSuggestionSelect: (suggestion: Suggestion) => void;
  onInputChange: (value: string) => void;
  placeholder?: string;
  context?: 'node-config' | 'expression' | 'global';
}

export default function SmartAutoComplete({
  inputValue,
  onSuggestionSelect,
  onInputChange,
  placeholder = "Tapez pour voir les suggestions intelligentes...",
  context = 'global'
}: SmartAutoCompleteProps) {
  const { nodes, globalVariables, darkMode } = useWorkflowStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Base suggestions database
  const baseSuggestions: Suggestion[] = [
    // Expressions
    {
      id: 'json-extract',
      type: 'expression',
      label: '$json.fieldName',
      description: 'Extract field from JSON data',
      category: 'Data Access',
      icon: 'braces',
      insertText: '$json.',
      score: 95
    },
    {
      id: 'now-timestamp',
      type: 'expression',
      label: '$now',
      description: 'Current timestamp',
      category: 'Date/Time',
      icon: 'clock',
      insertText: '$now',
      score: 90
    },
    {
      id: 'uuid-generate',
      type: 'expression',
      label: '$uuid',
      description: 'Generate unique UUID',
      category: 'Utility',
      icon: 'hash',
      insertText: '$uuid',
      score: 85
    },
    {
      id: 'random-int',
      type: 'expression',
      label: '$randomInt(min, max)',
      description: 'Generate random integer',
      category: 'Utility',
      icon: 'shuffle',
      insertText: '$randomInt(1, 100)',
      score: 80
    },

    // Functions
    {
      id: 'length-function',
      type: 'function',
      label: '$length(text)',
      description: 'Get text or array length',
      category: 'Text Functions',
      icon: 'ruler',
      insertText: '$length(',
      score: 75
    },
    {
      id: 'upper-function',
      type: 'function',
      label: '$upper(text)',
      description: 'Convert to uppercase',
      category: 'Text Functions',
      icon: 'type',
      insertText: '$upper(',
      score: 70
    },
    {
      id: 'round-function',
      type: 'function',
      label: '$round(number, decimals)',
      description: 'Round number to decimals',
      category: 'Math Functions',
      icon: 'calculator',
      insertText: '$round(',
      score: 65
    },

    // API suggestions
    {
      id: 'http-get',
      type: 'api',
      label: 'GET Request',
      description: 'HTTP GET request template',
      category: 'HTTP',
      icon: 'globe',
      insertText: '{\n  "method": "GET",\n  "url": "https://api.example.com/data"\n}',
      score: 85
    },
    {
      id: 'http-post',
      type: 'api',
      label: 'POST Request',
      description: 'HTTP POST request template',
      category: 'HTTP',
      icon: 'globe',
      insertText: '{\n  "method": "POST",\n  "url": "https://api.example.com/data",\n  "body": {}\n}',
      score: 85
    },

    // Database suggestions
    {
      id: 'sql-select',
      type: 'api',
      label: 'SELECT Query',
      description: 'SQL SELECT statement',
      category: 'Database',
      icon: 'database',
      insertText: 'SELECT * FROM table_name WHERE condition',
      score: 80
    },
    {
      id: 'sql-insert',
      type: 'api',
      label: 'INSERT Query',
      description: 'SQL INSERT statement',
      category: 'Database',
      icon: 'database',
      insertText: 'INSERT INTO table_name (column1, column2) VALUES (value1, value2)',
      score: 75
    }
  ];

  // Generate smart suggestions based on input
  const generateSmartSuggestions = useCallback((input: string): Suggestion[] => {
    const inputLower = input.toLowerCase();
    const suggestions: Suggestion[] = [];

    // PERFORMANCE FIX: Early return for very short input to avoid unnecessary computation
    if (input.length < 2) {
      return baseSuggestions.slice(0, 8);
    }

    // Context-aware suggestions
    if (context === 'expression' || inputLower.startsWith('$')) {
      // Expression context - prioritize expressions and functions
      suggestions.push(...baseSuggestions.filter(s =>
        s.type === 'expression' || s.type === 'function'
      ));
    }

    // Smart pattern matching
    if (inputLower.includes('json') || inputLower.includes('data')) {
      suggestions.push({
        id: 'json-parse',
        type: 'expression',
        label: '$json.parse(text)',
        description: 'Parse JSON string',
        category: 'Data Processing',
        icon: 'braces',
        insertText: '$json.parse(',
        score: 90
      });
    }

    if (inputLower.includes('date') || inputLower.includes('time')) {
      suggestions.push(
        {
          id: 'date-format',
          type: 'function',
          label: '$dateTime.format()',
          description: 'Format current date/time',
          category: 'Date/Time',
          icon: 'calendar',
          insertText: '$dateTime().format("YYYY-MM-DD")',
          score: 88
        },
        {
          id: 'date-add',
          type: 'function',
          label: '$dateTime.plus()',
          description: 'Add time to date',
          category: 'Date/Time',
          icon: 'plus',
          insertText: '$dateTime().plus({ days: 1 })',
          score: 85
        }
      );
    }

    if (inputLower.includes('email') || inputLower.includes('mail')) {
      suggestions.push({
        id: 'email-validate',
        type: 'function',
        label: '$email.validate()',
        description: 'Validate email format',
        category: 'Validation',
        icon: 'mail',
        insertText: '$email.validate(',
        score: 85
      });
    }

    if (inputLower.includes('http') || inputLower.includes('api') || inputLower.includes('request')) {
      suggestions.push(...baseSuggestions.filter(s => s.category === 'HTTP'));
    }

    if (inputLower.includes('sql') || inputLower.includes('database') || inputLower.includes('query')) {
      suggestions.push(...baseSuggestions.filter(s => s.category === 'Database'));
    }

    // Add variables from current workflow
    Object.keys(globalVariables).forEach(varName => {
      if (varName.toLowerCase().includes(inputLower)) {
        suggestions.push({
          id: `var-${varName}`,
          type: 'variable',
          label: `$vars.${varName}`,
          description: `Global variable: ${varName}`,
          category: 'Variables',
          icon: 'variable',
          insertText: `$vars.${varName}`,
          score: 70
        });
      }
    });

    // Add node references
    nodes.forEach(node => {
      if (node.data.label.toLowerCase().includes(inputLower)) {
        suggestions.push({
          id: `node-${node.id}`,
          type: 'node',
          label: `$("${node.data.label}")`,
          description: `Reference to ${node.data.label} node`,
          category: 'Nodes',
          icon: 'box',
          insertText: `$("${node.data.label}").json`,
          score: 75
        });
      }
    });

    // Fuzzy matching for base suggestions
    baseSuggestions.forEach(suggestion => {
      const labelMatch = suggestion.label.toLowerCase().includes(inputLower);
      const descMatch = suggestion.description.toLowerCase().includes(inputLower);
      const categoryMatch = suggestion.category.toLowerCase().includes(inputLower);
      let score = suggestion.score;

      if (labelMatch || descMatch || categoryMatch) {
        // Boost score based on match quality
        if (labelMatch) score += 20;
        if (descMatch) score += 10;
        if (categoryMatch) score += 5;

        suggestions.push({ ...suggestion, score });
      }
    });

    // PERFORMANCE FIX: More efficient deduplication using Set
    const seen = new Set<string>();
    const uniqueSuggestions = suggestions.filter(suggestion => {
      if (seen.has(suggestion.id)) {
        return false;
      }
      seen.add(suggestion.id);
      return true;
    });

    // Sort by score and limit results
    return uniqueSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [baseSuggestions, context, nodes, globalVariables]);

  // STATE SYNC FIX: Debounce with request ordering to prevent race conditions
  useEffect(() => {
    if (inputValue.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // STATE SYNC FIX: Generate unique request ID to prevent out-of-order updates
    let isStale = false;
    const requestId = Date.now();

    // PERFORMANCE FIX: Debounce the expensive computation
    const timeoutId = setTimeout(() => {
      if (isStale) return; // Request was cancelled

      try {
        // STATE SYNC FIX: Pass request ID to track this specific request
        const filteredSuggestions = generateSmartSuggestions(inputValue);

        // STATE SYNC FIX: Only update state if this request is still current
        if (!isStale) {
          setSuggestions(filteredSuggestions);
          setShowSuggestions(filteredSuggestions.length > 0);
          setSelectedIndex(0);
        }
      } catch (error) {
        // STATE SYNC FIX: Handle errors gracefully without state corruption
        if (!isStale) {
          logger.error('Suggestion generation error:', error);
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    }, 200); // 200ms debounce delay

    return () => {
      clearTimeout(timeoutId);
      isStale = true; // Mark request as stale to prevent updates
    };
  }, [inputValue, nodes, globalVariables, context, generateSmartSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const selectSuggestion = (suggestion: Suggestion) => {
    onSuggestionSelect(suggestion);
    setShowSuggestions(false);
  };

  const getIcon = (iconName: string): React.ReactNode => {
    const icons: { [key: string]: React.ReactNode } = {
      braces: <Code size={16} />,
      clock: <Search size={16} />,
      hash: <Search size={16} />,
      globe: <Globe size={16} />,
      database: <Database size={16} />,
      mail: <MessageCircle size={16} />,
      default: <Zap size={16} />
    };
    return icons[iconName] || icons.default;
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'Data Access': 'text-blue-600',
      'Date/Time': 'text-green-600',
      'Utility': 'text-purple-600',
      'Text Functions': 'text-orange-600',
      'Math Functions': 'text-red-600',
      'HTTP': 'text-indigo-600',
      'Database': 'text-yellow-600',
      'Variables': 'text-pink-600',
      'Nodes': 'text-teal-600'
    };
    return colors[category] || 'text-gray-600';
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-10 border rounded-md ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 placeholder-gray-500'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <Zap size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        } border rounded-md shadow-lg max-h-64 overflow-y-auto`}>
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 flex items-center">
              <Zap size={12} className="mr-1" />
              Smart Suggestions
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  index === selectedIndex
                    ? darkMode ? 'bg-gray-700' : 'bg-blue-50'
                    : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex-shrink-0 ${getCategoryColor(suggestion.category)}`}>
                    {getIcon(suggestion.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {suggestion.label}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {suggestion.description}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded ${
                      darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {suggestion.category}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
