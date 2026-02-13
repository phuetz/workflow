import React from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface MCPClientConfigProps {
  node: WorkflowNode;
  onChange: (updates: Partial<WorkflowNode>) => void;
}

export const MCPClientConfig: React.FC<MCPClientConfigProps> = ({ node, onChange }) => {
  const config = (node.data?.config || {}) as Record<string, string | number | boolean>;

  const updateConfig = (key: string, value: string | number | boolean) => {
    onChange({
      data: {
        ...node.data,
        config: { ...config, [key]: value }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Connect to Model Context Protocol (MCP) servers to access AI tools, resources, and capabilities.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Connection Type
        </label>
        <select
          value={String(config.connectionType || 'stdio')}
          onChange={(e) => updateConfig('connectionType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="stdio">Standard I/O (Local Process)</option>
          <option value="sse">Server-Sent Events (HTTP)</option>
          <option value="websocket">WebSocket</option>
        </select>
      </div>

      {config.connectionType === 'stdio' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Command
            </label>
            <input
              type="text"
              value={String(config.command || '')}
              onChange={(e) => updateConfig('command', e.target.value)}
              placeholder="npx @modelcontextprotocol/server-filesystem"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arguments
            </label>
            <input
              type="text"
              value={String(config.args || '')}
              onChange={(e) => updateConfig('args', e.target.value)}
              placeholder="/path/to/directory"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </>
      )}

      {(config.connectionType === 'sse' || config.connectionType === 'websocket') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Server URL
          </label>
          <input
            type="text"
            value={String(config.serverUrl || '')}
            onChange={(e) => updateConfig('serverUrl', e.target.value)}
            placeholder="http://localhost:3001/mcp"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operation
        </label>
        <select
          value={String(config.operation || 'callTool')}
          onChange={(e) => updateConfig('operation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="callTool">Call Tool</option>
          <option value="listTools">List Available Tools</option>
          <option value="getResource">Get Resource</option>
          <option value="listResources">List Resources</option>
          <option value="getPrompt">Get Prompt Template</option>
          <option value="listPrompts">List Prompts</option>
        </select>
      </div>

      {config.operation === 'callTool' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tool Name
            </label>
            <input
              type="text"
              value={String(config.toolName || '')}
              onChange={(e) => updateConfig('toolName', e.target.value)}
              placeholder="read_file"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tool Arguments (JSON)
            </label>
            <textarea
              value={String(config.toolArguments || '{}')}
              onChange={(e) => updateConfig('toolArguments', e.target.value)}
              placeholder='{"path": "/example/file.txt"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>
        </>
      )}

      {config.operation === 'getResource' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Resource URI
          </label>
          <input
            type="text"
            value={String(config.resourceUri || '')}
            onChange={(e) => updateConfig('resourceUri', e.target.value)}
            placeholder="file:///path/to/resource"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {config.operation === 'getPrompt' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt Name
            </label>
            <input
              type="text"
              value={String(config.promptName || '')}
              onChange={(e) => updateConfig('promptName', e.target.value)}
              placeholder="summarize"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prompt Arguments (JSON)
            </label>
            <textarea
              value={String(config.promptArguments || '{}')}
              onChange={(e) => updateConfig('promptArguments', e.target.value)}
              placeholder='{"text": "{{ $json.content }}"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Timeout (ms)
        </label>
        <input
          type="number"
          value={Number(config.timeout) || 30000}
          onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
          min={1000}
          max={300000}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="keepAlive"
          checked={config.keepAlive !== false}
          onChange={(e) => updateConfig('keepAlive', e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded"
        />
        <label htmlFor="keepAlive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
          Keep connection alive between executions
        </label>
      </div>
    </div>
  );
};

export default MCPClientConfig;
