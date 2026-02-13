/**
 * Split Node Configuration
 * Split items into batches or multiple outputs
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SplitConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const SplitConfig: React.FC<SplitConfigProps> = ({ config, onChange }) => {
  const [splitMode, setSplitMode] = useState<string>((config.splitMode as string) || 'batches');
  const [batchSize, setBatchSize] = useState<number>((config.batchSize as number) || 10);
  const [splitField, setSplitField] = useState<string>((config.splitField as string) || '');
  const [numberOfSplits, setNumberOfSplits] = useState<number>((config.numberOfSplits as number) || 2);
  const [includeRemainder, setIncludeRemainder] = useState<boolean>((config.includeRemainder as boolean) !== false);

  const handleSplitModeChange = (mode: string) => {
    setSplitMode(mode);
    onChange({ ...config, splitMode: mode });
  };

  const handleBatchSizeChange = (size: string) => {
    const numSize = parseInt(size, 10) || 1;
    setBatchSize(numSize);
    onChange({ ...config, batchSize: numSize });
  };

  const handleSplitFieldChange = (field: string) => {
    setSplitField(field);
    onChange({ ...config, splitField: field });
  };

  const handleNumberOfSplitsChange = (num: string) => {
    const numSplits = parseInt(num, 10) || 2;
    setNumberOfSplits(numSplits);
    onChange({ ...config, numberOfSplits: numSplits });
  };

  const handleIncludeRemainderChange = (checked: boolean) => {
    setIncludeRemainder(checked);
    onChange({ ...config, includeRemainder: checked });
  };

  const splitModeDescriptions = {
    batches: 'Split items into fixed-size batches',
    even: 'Distribute items evenly across N outputs',
    field: 'Split based on field value (e.g., category)',
    individual: 'Split each item into separate output'
  };

  return (
    <div className="split-config space-y-4">
      <div className="font-semibold text-lg mb-4">Split Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Split Mode</label>
        <select
          value={splitMode}
          onChange={(e) => handleSplitModeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="batches">Batches - Fixed size groups</option>
          <option value="even">Even Distribution - N equal groups</option>
          <option value="field">By Field - Group by field value</option>
          <option value="individual">Individual - One per output</option>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {splitModeDescriptions[splitMode as keyof typeof splitModeDescriptions]}
        </p>
      </div>

      {splitMode === 'batches' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-2">Batch Size</label>
            <input
              type="number"
              min="1"
              value={batchSize}
              onChange={(e) => handleBatchSizeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-600 mt-1">
              Number of items per batch
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeRemainder"
              checked={includeRemainder}
              onChange={(e) => handleIncludeRemainderChange(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="includeRemainder" className="text-sm">
              Include remainder in final batch (even if smaller)
            </label>
          </div>
        </div>
      )}

      {splitMode === 'even' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-2">Number of Splits</label>
            <input
              type="number"
              min="2"
              max="10"
              value={numberOfSplits}
              onChange={(e) => handleNumberOfSplitsChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-600 mt-1">
              How many equal groups to create (2-10)
            </p>
          </div>
        </div>
      )}

      {splitMode === 'field' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-2">Split Field</label>
            <input
              type="text"
              value={splitField}
              onChange={(e) => handleSplitFieldChange(e.target.value)}
              placeholder="category"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Field to group by. Items with the same field value will be grouped together.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-3">
        <div><strong>💡 Split Examples:</strong></div>

        <div className="space-y-2">
          <div className="font-medium">Batches Mode (size=3):</div>
          <div className="bg-white p-2 rounded font-mono text-xs">
            Input: 10 items<br/>
            Output 1: Items 1-3<br/>
            Output 2: Items 4-6<br/>
            Output 3: Items 7-9<br/>
            Output 4: Item 10 (remainder)
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Even Distribution (N=3):</div>
          <div className="bg-white p-2 rounded font-mono text-xs">
            Input: 10 items<br/>
            Output 1: Items 1,4,7,10 (4 items)<br/>
            Output 2: Items 2,5,8 (3 items)<br/>
            Output 3: Items 3,6,9 (3 items)
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">By Field (field='status'):</div>
          <div className="bg-white p-2 rounded font-mono text-xs">
            Input: [&#123;status:"active"&#125;, &#123;status:"pending"&#125;, &#123;status:"active"&#125;]<br/>
            Output 1 (active): 2 items<br/>
            Output 2 (pending): 1 item
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Individual Mode:</div>
          <div className="bg-white p-2 rounded font-mono text-xs">
            Input: 5 items<br/>
            Creates 5 separate outputs, one per item
          </div>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>⚠️ Performance:</strong> Splitting into many outputs may create complex workflows. Consider using batches or even distribution for better performance.
      </div>
    </div>
  );
};
