/**
 * Try-Catch Configuration Component
 * AGENT 4 - Advanced Workflow Features
 * Implements error handling with catch blocks and retry logic
 */

import React, { useState } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface TryCatchConfigProps {
  node: WorkflowNode;
  onUpdate: (config: Record<string, unknown>) => void;
}

export const TryCatchConfig: React.FC<TryCatchConfigProps> = ({ node, onUpdate }) => {
  const config = node.data.config || {};

  const [errorHandling, setErrorHandling] = useState(config.errorHandling as string || 'catch');
  const [retryEnabled, setRetryEnabled] = useState(config.retryEnabled as boolean || false);
  const [retryCount, setRetryCount] = useState(config.retryCount as number || 3);
  const [retryDelay, setRetryDelay] = useState(config.retryDelay as number || 1000);
  const [retryBackoff, setRetryBackoff] = useState(config.retryBackoff as string || 'exponential');
  const [retryOn, setRetryOn] = useState(config.retryOn as string[] || ['timeout', 'network']);
  const [catchAllErrors, setCatchAllErrors] = useState<boolean>((config.catchAllErrors as boolean) ?? true);
  const [errorFilter, setErrorFilter] = useState(config.errorFilter as string || '');
  const [transformError, setTransformError] = useState<boolean>((config.transformError as boolean) ?? false);
  const [logErrors, setLogErrors] = useState<boolean>((config.logErrors as boolean) ?? true);

  const handleUpdate = (updates: Record<string, unknown>) => {
    const newConfig = { ...config, ...updates };
    onUpdate(newConfig);
  };

  const toggleRetryOn = (errorType: string) => {
    const newRetryOn = retryOn.includes(errorType)
      ? retryOn.filter(t => t !== errorType)
      : [...retryOn, errorType];
    setRetryOn(newRetryOn);
    handleUpdate({ retryOn: newRetryOn });
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Error Handling Strategy
        </label>
        <select
          value={errorHandling}
          onChange={(e) => {
            setErrorHandling(e.target.value);
            handleUpdate({ errorHandling: e.target.value });
          }}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="catch">Catch and Handle Errors</option>
          <option value="propagate">Propagate to Parent</option>
          <option value="silent">Silent (Ignore Errors)</option>
          <option value="custom">Custom Handler</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          How to handle errors from wrapped nodes
        </p>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium">Automatic Retry</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={retryEnabled}
              onChange={(e) => {
                setRetryEnabled(e.target.checked);
                handleUpdate({ retryEnabled: e.target.checked });
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {retryEnabled && (
          <div className="space-y-3 pl-4 border-l-2 border-blue-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Max Retries
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={retryCount}
                  onChange={(e) => {
                    setRetryCount(parseInt(e.target.value));
                    handleUpdate({ retryCount: parseInt(e.target.value) });
                  }}
                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Initial Delay (ms)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={retryDelay}
                  onChange={(e) => {
                    setRetryDelay(parseInt(e.target.value));
                    handleUpdate({ retryDelay: parseInt(e.target.value) });
                  }}
                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Backoff Strategy
              </label>
              <select
                value={retryBackoff}
                onChange={(e) => {
                  setRetryBackoff(e.target.value);
                  handleUpdate({ retryBackoff: e.target.value });
                }}
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="fixed">Fixed Delay</option>
                <option value="linear">Linear Backoff</option>
                <option value="exponential">Exponential Backoff</option>
                <option value="fibonacci">Fibonacci Backoff</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {retryBackoff === 'fixed' && `Constant ${retryDelay}ms delay`}
                {retryBackoff === 'linear' && `${retryDelay}ms, ${retryDelay * 2}ms, ${retryDelay * 3}ms...`}
                {retryBackoff === 'exponential' && `${retryDelay}ms, ${retryDelay * 2}ms, ${retryDelay * 4}ms...`}
                {retryBackoff === 'fibonacci' && `${retryDelay}ms, ${retryDelay}ms, ${retryDelay * 2}ms, ${retryDelay * 3}ms...`}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-2">
                Retry On Error Types
              </label>
              <div className="space-y-1">
                {['timeout', 'network', 'rate-limit', 'server-error', 'validation'].map(errorType => (
                  <label key={errorType} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={retryOn.includes(errorType)}
                      onChange={() => toggleRetryOn(errorType)}
                      className="rounded text-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-xs capitalize">{errorType.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium mb-2">
          Error Filtering
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={catchAllErrors}
              onChange={(e) => {
                setCatchAllErrors(e.target.checked);
                handleUpdate({ catchAllErrors: e.target.checked });
              }}
              className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm">Catch All Error Types</span>
          </label>

          {!catchAllErrors && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Error Pattern (Regex)
              </label>
              <input
                type="text"
                value={errorFilter}
                onChange={(e) => {
                  setErrorFilter(e.target.value);
                  handleUpdate({ errorFilter: e.target.value });
                }}
                placeholder="^(NetworkError|TimeoutError)"
                className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only catch errors matching this pattern
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={transformError}
            onChange={(e) => {
              setTransformError(e.target.checked);
              handleUpdate({ transformError: e.target.checked });
            }}
            className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Transform Error Data</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Convert errors to structured format with stack trace, timestamp, etc.
        </p>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={logErrors}
            onChange={(e) => {
              setLogErrors(e.target.checked);
              handleUpdate({ logErrors: e.target.checked });
            }}
            className="rounded text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Log Errors</span>
        </label>
        <p className="text-xs text-gray-500 ml-6">
          Send error details to logging system
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Output Handles</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li><code className="bg-blue-100 px-1 rounded">success</code> - Execution successful (no errors)</li>
          <li><code className="bg-blue-100 px-1 rounded">catch</code> - Error caught and handled</li>
          {!catchAllErrors && <li><code className="bg-blue-100 px-1 rounded">unhandled</code> - Error not matching filter</li>}
        </ul>
      </div>

      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">Error Object Format</h4>
        <pre className="text-xs text-yellow-800 font-mono bg-yellow-100 p-2 rounded overflow-x-auto">
{`{
  type: "NetworkError",
  message: "Connection failed",
  originalError: {...},
  timestamp: "2025-...",
  nodeId: "node_123",
  retryCount: 2,
  stack: "..."
}`}
        </pre>
      </div>
    </div>
  );
};
