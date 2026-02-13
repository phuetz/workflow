/**
 * StopAndError Node Configuration
 * Stops workflow execution and throws an error
 */

import React from 'react';

interface StopAndErrorConfigProps {
  config: {
    errorType?: 'error' | 'warning';
    errorMessage?: string;
    includeInputData?: boolean;
  };
  onChange: (config: StopAndErrorConfigProps['config']) => void;
}

export const StopAndErrorConfig: React.FC<StopAndErrorConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<StopAndErrorConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Error Type
        </label>
        <select
          value={config.errorType || 'error'}
          onChange={(e) => updateConfig({ errorType: e.target.value as 'error' | 'warning' })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="error">Error - Stop workflow entirely</option>
          <option value="warning">Warning - Continue on error output</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Error Message
        </label>
        <textarea
          value={config.errorMessage || ''}
          onChange={(e) => updateConfig({ errorMessage: e.target.value })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Enter error message or use expression {{ $json.field }}"
        />
        <p className="mt-1 text-xs text-gray-500">
          The message to display when this node is executed.
          Supports expressions like {'{{ $json.errorReason }}'}
        </p>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="includeInputData"
          checked={config.includeInputData ?? false}
          onChange={(e) => updateConfig({ includeInputData: e.target.checked })}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="includeInputData" className="ml-2 text-sm text-gray-700">
          Include input data in error
        </label>
      </div>
    </div>
  );
};

export default StopAndErrorConfig;
