/**
 * Error Generator Node Configuration
 * Generate errors for testing error handling
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface ErrorGeneratorConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface ErrorGeneratorConfig {
  errorType?: string;
  errorMessage?: string;
  statusCode?: number;
  throwProbability?: number;
}

export const ErrorGeneratorConfig: React.FC<ErrorGeneratorConfigProps> = ({ config, onChange }) => {
  const typedConfig = config as ErrorGeneratorConfig;

  const [errorType, setErrorType] = useState(typedConfig.errorType || 'generic');
  const [errorMessage, setErrorMessage] = useState(typedConfig.errorMessage || 'Test error');
  const [statusCode, setStatusCode] = useState(typedConfig.statusCode || 500);
  const [throwProbability, setThrowProbability] = useState(typedConfig.throwProbability || 100);

  return (
    <div className="error-generator-config space-y-4">
      <div className="font-semibold text-lg mb-4">Error Generator (Testing)</div>

      <div className="p-3 bg-yellow-50 rounded text-sm mb-4">
        <strong>⚠️ Development/Testing Only:</strong> This node is designed for testing error handling in workflows.
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Error Type</label>
        <select
          value={errorType}
          onChange={(e) => {
            setErrorType(e.target.value);
            onChange({ ...config, errorType: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="generic">Generic Error</option>
          <option value="validation">Validation Error</option>
          <option value="network">Network Error</option>
          <option value="timeout">Timeout Error</option>
          <option value="authentication">Authentication Error</option>
          <option value="authorization">Authorization Error</option>
          <option value="ratelimit">Rate Limit Error</option>
          <option value="notfound">Not Found Error</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Error Message</label>
        <input
          type="text"
          value={errorMessage}
          onChange={(e) => {
            setErrorMessage(e.target.value);
            onChange({ ...config, errorMessage: e.target.value });
          }}
          placeholder="Custom error message"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">HTTP Status Code</label>
        <select
          value={statusCode}
          onChange={(e) => {
            setStatusCode(Number(e.target.value));
            onChange({ ...config, statusCode: Number(e.target.value) });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={400}>400 - Bad Request</option>
          <option value={401}>401 - Unauthorized</option>
          <option value={403}>403 - Forbidden</option>
          <option value={404}>404 - Not Found</option>
          <option value={429}>429 - Too Many Requests</option>
          <option value={500}>500 - Internal Server Error</option>
          <option value={502}>502 - Bad Gateway</option>
          <option value={503}>503 - Service Unavailable</option>
          <option value={504}>504 - Gateway Timeout</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Error Probability: {throwProbability}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={throwProbability}
          onChange={(e) => {
            setThrowProbability(Number(e.target.value));
            onChange({ ...config, throwProbability: Number(e.target.value) });
          }}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          Percentage chance the error will be thrown (useful for intermittent error testing)
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>🧪 Testing Scenarios:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Test retry logic with rate limit errors</li>
          <li>Test error workflow execution</li>
          <li>Test error notifications</li>
          <li>Test graceful degradation</li>
          <li>Test intermittent failures (set probability &lt; 100%)</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-purple-50 rounded text-sm space-y-2">
        <div><strong>💡 Pro Tip:</strong></div>
        <div>
          Use with Try/Catch or Retry nodes to test your error handling logic. Set probability to 50% to simulate flaky APIs.
        </div>
      </div>
    </div>
  );
};
