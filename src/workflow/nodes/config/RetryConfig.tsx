/**
 * Retry Node Configuration
 * Retry failed operations with backoff
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface RetryConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const RetryConfig: React.FC<RetryConfigProps> = ({ config, onChange }) => {
  const [maxRetries, setMaxRetries] = useState((config.maxRetries as number) || 3);
  const [retryDelay, setRetryDelay] = useState((config.retryDelay as number) || 1000);
  const [backoffStrategy, setBackoffStrategy] = useState<'fixed' | 'linear' | 'exponential'>(
    (config.backoffStrategy as 'fixed' | 'linear' | 'exponential') || 'exponential'
  );
  const [retryOnCodes, setRetryOnCodes] = useState((config.retryOnCodes as string) || '500,502,503,504');
  const [continueOnFail, setContinueOnFail] = useState((config.continueOnFail as boolean) !== false);

  return (
    <div className="retry-config space-y-4">
      <div className="font-semibold text-lg mb-4">Retry Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Max Retry Attempts</label>
        <input
          type="number"
          value={maxRetries}
          onChange={(e) => {
            setMaxRetries(Number(e.target.value));
            onChange({ ...config, maxRetries: Number(e.target.value) });
          }}
          min={1}
          max={10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Number of retry attempts (1-10)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Initial Retry Delay (ms)</label>
        <input
          type="number"
          value={retryDelay}
          onChange={(e) => {
            setRetryDelay(Number(e.target.value));
            onChange({ ...config, retryDelay: Number(e.target.value) });
          }}
          min={100}
          step={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Delay before first retry (milliseconds)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Backoff Strategy</label>
        <select
          value={backoffStrategy}
          onChange={(e) => {
            setBackoffStrategy(e.target.value as 'fixed' | 'linear' | 'exponential');
            onChange({ ...config, backoffStrategy: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="fixed">Fixed - Same delay each retry</option>
          <option value="linear">Linear - Delay increases by initial amount</option>
          <option value="exponential">Exponential - Delay doubles each retry</option>
        </select>
      </div>

      {backoffStrategy === 'exponential' && (
        <div className="p-3 bg-blue-50 rounded text-sm">
          <strong>Delay progression:</strong>
          <ul className="list-disc list-inside mt-1">
            <li>Retry 1: {retryDelay}ms</li>
            <li>Retry 2: {retryDelay * 2}ms</li>
            <li>Retry 3: {retryDelay * 4}ms</li>
            {maxRetries > 3 && <li>Retry 4: {retryDelay * 8}ms</li>}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Retry on HTTP Status Codes</label>
        <input
          type="text"
          value={retryOnCodes}
          onChange={(e) => {
            setRetryOnCodes(e.target.value);
            onChange({ ...config, retryOnCodes: e.target.value });
          }}
          placeholder="500,502,503,504"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Comma-separated HTTP status codes to retry on</p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="continueOnFail"
          checked={continueOnFail}
          onChange={(e) => {
            setContinueOnFail(e.target.checked);
            onChange({ ...config, continueOnFail: e.target.checked });
          }}
          className="mr-2"
        />
        <label htmlFor="continueOnFail" className="text-sm">
          Continue workflow even if all retries fail
        </label>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📊 Outputs:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Output 1 (Success):</strong> Successful execution (original or after retry)</li>
          <li><strong>Output 2 (Failed):</strong> All retries exhausted</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm space-y-2">
        <div><strong>⚠️ Best Practices:</strong></div>
        <ul className="list-disc list-inside space-y-1">
          <li>Use exponential backoff for API rate limits</li>
          <li>Set reasonable max retries (3-5 typically)</li>
          <li>Don't retry on client errors (4xx codes)</li>
          <li>Log retry attempts for debugging</li>
        </ul>
      </div>
    </div>
  );
};
