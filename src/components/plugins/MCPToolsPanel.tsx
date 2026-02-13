/**
 * MCP Tools Panel Component
 * UI for browsing and executing MCP tools
 */

import React, { useState, useEffect } from 'react';
import { Search, Play, Loader2, AlertCircle, Check, X } from 'lucide-react';
import type { MCPTool, MCPToolCallResult } from '../../types/mcp';

interface MCPToolsPanelProps {
  tools: MCPTool[];
  onExecuteTool: (toolName: string, args: Record<string, unknown>) => Promise<MCPToolCallResult>;
  darkMode?: boolean;
}

export const MCPToolsPanel: React.FC<MCPToolsPanelProps> = ({
  tools,
  onExecuteTool,
  darkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
  const [toolArgs, setToolArgs] = useState<Record<string, unknown>>({});
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<MCPToolCallResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExecute = async () => {
    if (!selectedTool) return;

    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      const executionResult = await onExecuteTool(selectedTool.name, toolArgs);
      setResult(executionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setExecuting(false);
    }
  };

  const handleArgChange = (key: string, value: string) => {
    setToolArgs((prev) => {
      const newArgs = { ...prev };

      // Try to parse as JSON for object/array types
      try {
        if (value.startsWith('{') || value.startsWith('[')) {
          newArgs[key] = JSON.parse(value);
        } else if (value === 'true' || value === 'false') {
          newArgs[key] = value === 'true';
        } else if (!isNaN(Number(value)) && value !== '') {
          newArgs[key] = Number(value);
        } else {
          newArgs[key] = value;
        }
      } catch {
        newArgs[key] = value;
      }

      return newArgs;
    });
  };

  useEffect(() => {
    // Reset args when tool changes
    if (selectedTool) {
      const initialArgs: Record<string, unknown> = {};
      for (const [key, param] of Object.entries(selectedTool.inputSchema.properties)) {
        if (param.default !== undefined) {
          initialArgs[key] = param.default;
        }
      }
      setToolArgs(initialArgs);
    }
    setResult(null);
    setError(null);
  }, [selectedTool]);

  return (
    <div className={`h-full flex ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Tool List */}
      <div className={`w-1/3 border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex flex-col`}>
        <div className="p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
          <h2 className="text-lg font-semibold mb-3">MCP Tools</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 focus:border-blue-500'
                  : 'bg-white border-gray-300 focus:border-blue-500'
              } focus:outline-none`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTools.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {tools.length === 0 ? 'No tools available' : 'No tools match your search'}
            </div>
          ) : (
            <div className="divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}">
              {filteredTools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => setSelectedTool(tool)}
                  className={`w-full p-4 text-left transition-colors ${
                    selectedTool?.name === tool.name
                      ? darkMode
                        ? 'bg-blue-900/30'
                        : 'bg-blue-50'
                      : darkMode
                      ? 'hover:bg-gray-800'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{tool.name}</div>
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">{tool.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tool Details and Execution */}
      <div className="flex-1 flex flex-col">
        {selectedTool ? (
          <>
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className="text-xl font-semibold mb-2">{selectedTool.name}</h3>
              <p className="text-gray-500 mb-4">{selectedTool.description}</p>

              {/* Tool Arguments */}
              <div className="space-y-4">
                <h4 className="font-medium">Arguments</h4>
                {Object.entries(selectedTool.inputSchema.properties).length === 0 ? (
                  <p className="text-sm text-gray-500">No arguments required</p>
                ) : (
                  Object.entries(selectedTool.inputSchema.properties).map(([key, param]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1">
                        {key}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {param.description && (
                        <p className="text-xs text-gray-500 mb-2">{param.description}</p>
                      )}
                      {param.enum ? (
                        <select
                          value={String(toolArgs[key] || '')}
                          onChange={(e) => handleArgChange(key, e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            darkMode
                              ? 'bg-gray-800 border-gray-700'
                              : 'bg-white border-gray-300'
                          } focus:outline-none focus:border-blue-500`}
                        >
                          <option value="">Select...</option>
                          {param.enum.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : param.type === 'boolean' ? (
                        <select
                          value={String(toolArgs[key] || 'false')}
                          onChange={(e) => handleArgChange(key, e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            darkMode
                              ? 'bg-gray-800 border-gray-700'
                              : 'bg-white border-gray-300'
                          } focus:outline-none focus:border-blue-500`}
                        >
                          <option value="false">False</option>
                          <option value="true">True</option>
                        </select>
                      ) : param.type === 'object' || param.type === 'array' ? (
                        <textarea
                          value={
                            typeof toolArgs[key] === 'string'
                              ? toolArgs[key]
                              : JSON.stringify(toolArgs[key] || (param.type === 'array' ? [] : {}), null, 2)
                          }
                          onChange={(e) => handleArgChange(key, e.target.value)}
                          placeholder={param.type === 'array' ? '[]' : '{}'}
                          rows={4}
                          className={`w-full px-3 py-2 rounded-lg border font-mono text-sm ${
                            darkMode
                              ? 'bg-gray-800 border-gray-700'
                              : 'bg-white border-gray-300'
                          } focus:outline-none focus:border-blue-500`}
                        />
                      ) : (
                        <input
                          type={param.type === 'number' ? 'number' : 'text'}
                          value={String(toolArgs[key] || '')}
                          onChange={(e) => handleArgChange(key, e.target.value)}
                          placeholder={param.default !== undefined ? String(param.default) : ''}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            darkMode
                              ? 'bg-gray-800 border-gray-700'
                              : 'bg-white border-gray-300'
                          } focus:outline-none focus:border-blue-500`}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={handleExecute}
                disabled={executing}
                className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {executing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Tool
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-900">Error</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h4 className="font-medium">Result</h4>
                    {result.isError ? (
                      <X className="w-5 h-5 text-red-500" />
                    ) : (
                      <Check className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-4 ${
                      result.isError
                        ? 'bg-red-50 border border-red-200'
                        : darkMode
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {result.content.map((content, index) => (
                      <div key={index} className="font-mono text-sm whitespace-pre-wrap">
                        {content.type === 'text' ? content.text : JSON.stringify(content, null, 2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select a tool to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MCPToolsPanel;
