/**
 * Variable Inspector Component
 * Features: Real-time variable values, watch list, history, expression tester
 * AGENT 5 - UI/UX IMPROVEMENTS
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  Eye, EyeOff, RefreshCw, Search, Plus, X, Code,
  TrendingUp, Clock, Copy, Check, Play
} from 'lucide-react';

interface WatchedVariable {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  history: Array<{ value: any; timestamp: Date }>;
}

interface VariableValue {
  name: string;
  value: any;
  type: string;
  source: 'global' | 'node' | 'env';
  nodeId?: string;
}

export default function VariableInspector() {
  const {
    globalVariables,
    currentEnvironment,
    nodeExecutionData,
    nodes,
    darkMode,
    isExecuting
  } = useWorkflowStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [watchedVariables, setWatchedVariables] = useState<WatchedVariable[]>([]);
  const [showAddWatch, setShowAddWatch] = useState(false);
  const [newWatchPath, setNewWatchPath] = useState('');
  const [expressionTest, setExpressionTest] = useState('');
  const [expressionResult, setExpressionResult] = useState<unknown>(null);
  const [expressionError, setExpressionError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Collect all variables from different sources
  const allVariables = useMemo((): VariableValue[] => {
    const variables: VariableValue[] = [];

    // Global variables
    const envVars = globalVariables[currentEnvironment] || {};
    Object.entries(envVars).forEach(([name, value]) => {
      variables.push({
        name,
        value,
        type: typeof value,
        source: 'global'
      });
    });

    // Node execution data
    Object.entries(nodeExecutionData).forEach(([nodeId, data]) => {
      const node = nodes.find(n => n.id === nodeId);
      if (node && data && typeof data === 'object' && 'output' in data) {
        const output = (data as { output?: Record<string, unknown> }).output;
        if (output && typeof output === 'object') {
          Object.entries(output).forEach(([key, value]) => {
            variables.push({
              name: `${node.data.label || nodeId}.${key}`,
              value,
              type: typeof value,
              source: 'node',
              nodeId
            });
          });
        }
      }
    });

    // Environment variables (only in browser with import.meta.env for Vite)
    try {
      if (typeof import.meta !== 'undefined') {
        const metaEnv = (import.meta as any).env;
        if (metaEnv && typeof metaEnv === 'object') {
          Object.entries(metaEnv).forEach(([name, value]) => {
            if (name.startsWith('VITE_')) {
              variables.push({
                name: name.replace('VITE_', ''),
                value,
                type: 'string',
                source: 'env'
              });
            }
          });
        }
      }
    } catch (error) {
      // Silently ignore if import.meta is not available
    }

    return variables;
  }, [globalVariables, currentEnvironment, nodeExecutionData, nodes]);

  // Filter variables
  const filteredVariables = useMemo(() => {
    if (!searchQuery) return allVariables;
    const query = searchQuery.toLowerCase();
    return allVariables.filter(v =>
      v.name.toLowerCase().includes(query) ||
      String(v.value).toLowerCase().includes(query)
    );
  }, [allVariables, searchQuery]);

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[Complex Object]';
      }
    }
    return String(value);
  };

  // Get type color
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-purple-600 dark:text-purple-400';
      case 'object': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Add watch
  const handleAddWatch = () => {
    if (!newWatchPath.trim()) return;

    const newWatch: WatchedVariable = {
      id: `watch_${Date.now()}`,
      name: newWatchPath.split('.').pop() || newWatchPath,
      path: newWatchPath,
      enabled: true,
      history: []
    };

    setWatchedVariables([...watchedVariables, newWatch]);
    setNewWatchPath('');
    setShowAddWatch(false);
  };

  // Remove watch
  const removeWatch = (id: string) => {
    setWatchedVariables(watchedVariables.filter(w => w.id !== id));
  };

  // Toggle watch
  const toggleWatch = (id: string) => {
    setWatchedVariables(
      watchedVariables.map(w =>
        w.id === id ? { ...w, enabled: !w.enabled } : w
      )
    );
  };

  // Update watched variables
  useEffect(() => {
    // Use functional setState to avoid dependency on watchedVariables
    setWatchedVariables(currentWatches => {
      const updatedWatches = [...currentWatches];
      let hasChanges = false;

      currentWatches.forEach((watch, index) => {
        if (!watch.enabled) return;

        // Try to find the variable value
        const variable = allVariables.find(v =>
          v.name === watch.path || v.name.endsWith(`.${watch.path}`)
        );

        if (variable) {
          const lastValue = watch.history[watch.history.length - 1]?.value;
          if (JSON.stringify(lastValue) !== JSON.stringify(variable.value)) {
            updatedWatches[index] = {
              ...watch,
              history: [
                ...watch.history.slice(-9),
                { value: variable.value, timestamp: new Date() }
              ]
            };
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updatedWatches : currentWatches;
    });
  }, [allVariables]);

  // Test expression
  const testExpression = () => {
    try {
      setExpressionError(null);

      // Create context with all variables
      const context: any = {};
      allVariables.forEach(v => {
        context[v.name] = v.value;
      });

      // Safe evaluation (limited)
      const result = new Function(...Object.keys(context), `return ${expressionTest}`)(
        ...Object.values(context)
      );

      setExpressionResult(result);
    } catch (error: any) {
      setExpressionError(error.message);
      setExpressionResult(null);
    }
  };

  // Copy path to clipboard
  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Toggle path expansion
  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  return (
    <div className={`variable-inspector h-full flex flex-col ${
      darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-900'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Eye size={20} />
            Variable Inspector
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'tree' ? 'flat' : 'tree')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {viewMode === 'tree' ? 'Tree' : 'Flat'}
            </button>

            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              isExecuting
                ? 'bg-green-600 text-white animate-pulse'
                : darkMode
                  ? 'bg-gray-700'
                  : 'bg-gray-100'
            }`}>
              {isExecuting ? 'Live' : 'Paused'}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            placeholder="Search variables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Variables List */}
        <div className="flex-1 overflow-auto p-4">
          <h3 className="text-sm font-semibold mb-2 opacity-60">
            All Variables ({filteredVariables.length})
          </h3>

          {filteredVariables.length === 0 ? (
            <div className="text-center py-8 opacity-60">
              <Code size={32} className="mx-auto mb-2" />
              <p>No variables found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredVariables.map((variable, index) => {
                const isExpanded = expandedPaths.has(variable.name);
                const isComplex = typeof variable.value === 'object';

                return (
                  <div
                    key={`${variable.name}-${index}`}
                    className={`p-2 rounded-lg ${
                      darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isComplex && (
                            <button
                              onClick={() => togglePath(variable.name)}
                              className="hover:bg-black/10 rounded p-0.5"
                            >
                              {isExpanded ? '▼' : '▶'}
                            </button>
                          )}

                          <span className="font-mono text-sm font-semibold">
                            {variable.name}
                          </span>

                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            variable.source === 'global'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                              : variable.source === 'node'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {variable.source}
                          </span>

                          <span className={`text-xs font-mono ${getTypeColor(variable.type)}`}>
                            {variable.type}
                          </span>
                        </div>

                        {(!isComplex || isExpanded) && (
                          <div className={`text-sm font-mono ml-6 ${
                            darkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {formatValue(variable.value)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyPath(variable.name)}
                          className={`p-1 rounded hover:bg-black/10 ${
                            copiedPath === variable.name ? 'text-green-500' : ''
                          }`}
                          title="Copy path"
                        >
                          {copiedPath === variable.name ? <Check size={14} /> : <Copy size={14} />}
                        </button>

                        <button
                          onClick={() => {
                            setNewWatchPath(variable.name);
                            setShowAddWatch(true);
                          }}
                          className="p-1 rounded hover:bg-black/10"
                          title="Watch variable"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Watched Variables */}
        <div className={`border-t p-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Watched Variables ({watchedVariables.filter(w => w.enabled).length})
            </h3>

            <button
              onClick={() => setShowAddWatch(!showAddWatch)}
              className={`p-1.5 rounded-lg ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <Plus size={16} />
            </button>
          </div>

          {showAddWatch && (
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Variable path..."
                value={newWatchPath}
                onChange={(e) => setNewWatchPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                className={`flex-1 px-3 py-1.5 rounded-lg border text-sm ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-white border-gray-300'
                }`}
                autoFocus
              />
              <button
                onClick={handleAddWatch}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-auto">
            {watchedVariables.map(watch => (
              <div
                key={watch.id}
                className={`p-2 rounded-lg ${
                  darkMode ? 'bg-gray-900' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleWatch(watch.id)}
                      className={watch.enabled ? 'text-blue-500' : 'opacity-40'}
                    >
                      {watch.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <span className="font-mono text-sm">{watch.name}</span>
                  </div>

                  <button
                    onClick={() => removeWatch(watch.id)}
                    className="p-1 hover:bg-red-500/20 rounded text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>

                {watch.enabled && watch.history.length > 0 && (
                  <div className="ml-6 text-xs space-y-1">
                    {watch.history.slice(-3).map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 opacity-60">
                        <Clock size={10} />
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span className="font-mono">{formatValue(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {watchedVariables.length === 0 && (
              <div className="text-center py-4 opacity-60 text-sm">
                No watched variables
              </div>
            )}
          </div>
        </div>

        {/* Expression Tester */}
        <div className={`border-t p-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className="text-sm font-semibold mb-3">Expression Tester</h3>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Enter expression (e.g., value1 + value2)"
              value={expressionTest}
              onChange={(e) => setExpressionTest(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && testExpression()}
              className={`flex-1 px-3 py-2 rounded-lg border font-mono text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            />
            <button
              onClick={testExpression}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Play size={16} />
              Test
            </button>
          </div>

          {expressionResult !== null && (
            <div className={`p-3 rounded-lg ${
              darkMode ? 'bg-green-900/30' : 'bg-green-50'
            }`}>
              <div className="text-xs font-semibold mb-1 text-green-600 dark:text-green-400">
                Result:
              </div>
              <div className="font-mono text-sm">{formatValue(expressionResult)}</div>
            </div>
          )}

          {expressionError && (
            <div className={`p-3 rounded-lg ${
              darkMode ? 'bg-red-900/30' : 'bg-red-50'
            }`}>
              <div className="text-xs font-semibold mb-1 text-red-600 dark:text-red-400">
                Error:
              </div>
              <div className="text-sm">{expressionError}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
