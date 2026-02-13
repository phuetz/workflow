/**
 * NodeTimeoutConfig - Reusable timeout configuration component
 * Can be added to any node config panel to enable per-node timeout settings
 */

import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';

/** Default timeout in milliseconds (30 seconds) */
export const DEFAULT_NODE_TIMEOUT = 30000;

/** Minimum timeout in milliseconds (1 second) */
export const MIN_NODE_TIMEOUT = 1000;

/** Maximum timeout in milliseconds (10 minutes) */
export const MAX_NODE_TIMEOUT = 600000;

interface NodeTimeoutConfigProps {
  nodeId: string;
  /** Current timeout value in milliseconds */
  timeout?: number;
  /** Optional callback when timeout changes */
  onTimeoutChange?: (timeout: number) => void;
}

/**
 * Converts milliseconds to a human-readable format
 */
function formatTimeout(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Preset timeout options for quick selection
 */
const TIMEOUT_PRESETS = [
  { label: '5 seconds', value: 5000 },
  { label: '30 seconds', value: 30000 },
  { label: '1 minute', value: 60000 },
  { label: '2 minutes', value: 120000 },
  { label: '5 minutes', value: 300000 },
  { label: '10 minutes', value: 600000 },
];

export default function NodeTimeoutConfig({
  nodeId,
  timeout,
  onTimeoutChange
}: NodeTimeoutConfigProps) {
  const { updateNode, darkMode } = useWorkflowStore();

  const currentTimeout = timeout ?? DEFAULT_NODE_TIMEOUT;

  const handleTimeoutChange = (newTimeout: number) => {
    // Clamp the value within valid range
    const clampedTimeout = Math.max(MIN_NODE_TIMEOUT, Math.min(MAX_NODE_TIMEOUT, newTimeout));

    updateNode(nodeId, { timeout: clampedTimeout });
    onTimeoutChange?.(clampedTimeout);
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      handleTimeoutChange(value);
    }
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seconds = parseFloat(e.target.value);
    if (!isNaN(seconds)) {
      handleTimeoutChange(seconds * 1000);
    }
  };

  const inputClasses = `w-full px-3 py-2 border rounded ${
    darkMode
      ? 'bg-gray-700 border-gray-600 text-white'
      : 'bg-white border-gray-300 text-gray-900'
  }`;

  const labelClasses = `block text-sm font-medium mb-1 ${
    darkMode ? 'text-gray-200' : 'text-gray-700'
  }`;

  return (
    <div className="node-timeout-config mb-4">
      <label className={labelClasses}>
        Timeout
      </label>

      <div className="flex gap-2 mb-2">
        <select
          value={TIMEOUT_PRESETS.some(p => p.value === currentTimeout) ? currentTimeout : 'custom'}
          onChange={handlePresetSelect}
          className={inputClasses}
        >
          {TIMEOUT_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
          {!TIMEOUT_PRESETS.some(p => p.value === currentTimeout) && (
            <option value="custom">Custom ({formatTimeout(currentTimeout)})</option>
          )}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={MIN_NODE_TIMEOUT / 1000}
          max={MAX_NODE_TIMEOUT / 1000}
          step={0.5}
          value={(currentTimeout / 1000).toFixed(1)}
          onChange={handleCustomInput}
          className={`${inputClasses} flex-1`}
          placeholder="Timeout in seconds"
        />
        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          seconds
        </span>
      </div>

      <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Maximum time this node can run before timing out (1s - 10m)
      </p>
    </div>
  );
}

export { NodeTimeoutConfig };
