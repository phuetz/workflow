/**
 * SplitInBatches Node Configuration
 * Process items in batches of specified size
 */

import React from 'react';

interface SplitInBatchesConfigProps {
  config: {
    batchSize?: number;
    resetBetweenBatches?: boolean;
    addBatchInfo?: boolean;
    outputField?: string;
  };
  onChange: (config: SplitInBatchesConfigProps['config']) => void;
}

export const SplitInBatchesConfig: React.FC<SplitInBatchesConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<SplitInBatchesConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <strong>How it works:</strong>
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>Splits input items into batches of specified size</li>
          <li>Output 1: Current batch of items</li>
          <li>Output 2: Triggered when all batches are done</li>
          <li>Connect Output 1 back to process each batch</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Batch Size
        </label>
        <input
          type="number"
          value={config.batchSize || 10}
          onChange={(e) => updateConfig({ batchSize: parseInt(e.target.value, 10) })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          min={1}
        />
        <p className="mt-1 text-xs text-gray-500">
          Number of items to process in each batch
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="resetBetweenBatches"
            checked={config.resetBetweenBatches ?? false}
            onChange={(e) => updateConfig({ resetBetweenBatches: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="resetBetweenBatches" className="ml-2 text-sm text-gray-700">
            Reset between batches
          </label>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          Clear any accumulated data from previous batches
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="addBatchInfo"
            checked={config.addBatchInfo ?? true}
            onChange={(e) => updateConfig({ addBatchInfo: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="addBatchInfo" className="ml-2 text-sm text-gray-700">
            Add batch info to items
          </label>
        </div>
        <p className="text-xs text-gray-500 ml-6">
          Adds $batchIndex, $batchTotal, $itemIndex to each item
        </p>
      </div>

      <div className="bg-gray-50 border rounded-md p-3">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Example Usage</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Input: 25 items with batch size 10</p>
          <p>Batch 1: items 0-9</p>
          <p>Batch 2: items 10-19</p>
          <p>Batch 3: items 20-24</p>
          <p>Then: Output 2 triggered (done)</p>
        </div>
      </div>
    </div>
  );
};

export default SplitInBatchesConfig;
