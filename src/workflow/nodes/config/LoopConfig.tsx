/**
 * Loop Node Configuration
 * Iterate through items with optional conditions
 * AGENT 9: Node Library Expansion - Phase 1
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface LoopConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

interface LoopNodeConfig extends NodeConfig {
  loopType?: 'items' | 'count' | 'expression';
  maxIterations?: number;
  batchSize?: number;
  stopCondition?: string;
}

export const LoopConfig: React.FC<LoopConfigProps> = ({ config, onChange }) => {
  const loopConfig = config as LoopNodeConfig;

  const [loopType, setLoopType] = useState<'items' | 'count' | 'expression'>(loopConfig.loopType || 'items');
  const [maxIterations, setMaxIterations] = useState(loopConfig.maxIterations || 100);
  const [batchSize, setBatchSize] = useState(loopConfig.batchSize || 1);
  const [stopCondition, setStopCondition] = useState(loopConfig.stopCondition || '');

  const handleLoopTypeChange = (type: 'items' | 'count' | 'expression') => {
    setLoopType(type);
    onChange({ ...config, loopType: type });
  };

  return (
    <div className="loop-config space-y-4">
      <div className="font-semibold text-lg mb-4">Loop Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Loop Type</label>
        <select
          value={loopType}
          onChange={(e) => handleLoopTypeChange(e.target.value as 'items' | 'count' | 'expression')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="items">Loop Through Items (For Each)</option>
          <option value="count">Fixed Count Loop</option>
          <option value="expression">Expression-Based Loop</option>
        </select>
      </div>

      {loopType === 'count' && (
        <div>
          <label className="block text-sm font-medium mb-2">Number of Iterations</label>
          <input
            type="number"
            value={maxIterations}
            onChange={(e) => {
              setMaxIterations(Number(e.target.value));
              onChange({ ...config, maxIterations: Number(e.target.value) });
            }}
            min={1}
            max={10000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {loopType === 'items' && (
        <div>
          <label className="block text-sm font-medium mb-2">Batch Size</label>
          <input
            type="number"
            value={batchSize}
            onChange={(e) => {
              setBatchSize(Number(e.target.value));
              onChange({ ...config, batchSize: Number(e.target.value) });
            }}
            min={1}
            max={1000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <p className="text-xs text-gray-500 mt-1">Process items in batches (1 = one at a time)</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Max Iterations (Safety Limit)</label>
        <input
          type="number"
          value={maxIterations}
          onChange={(e) => {
            setMaxIterations(Number(e.target.value));
            onChange({ ...config, maxIterations: Number(e.target.value) });
          }}
          min={1}
          max={10000}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-500 mt-1">Prevent infinite loops (max 10,000)</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Stop Condition (Optional)</label>
        <input
          type="text"
          value={stopCondition}
          onChange={(e) => {
            setStopCondition(e.target.value);
            onChange({ ...config, stopCondition: e.target.value });
          }}
          placeholder="{{ $json.status === 'complete' }}"
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">Expression that stops the loop when true</p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
        <strong>📊 Outputs:</strong>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Output 1 (Loop):</strong> Connects back to create loop</li>
          <li><strong>Output 2 (Done):</strong> Continues after loop completes</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm space-y-2">
        <div><strong>💡 Loop Variables:</strong></div>
        <div className="space-y-1">
          <div><code className="bg-white px-2 py-1 rounded">{'{{ $index }}'}</code> - Current iteration index (0-based)</div>
          <div><code className="bg-white px-2 py-1 rounded">{'{{ $item }}'}</code> - Current item (for item loops)</div>
          <div><code className="bg-white px-2 py-1 rounded">{'{{ $totalItems }}'}</code> - Total number of items</div>
        </div>
      </div>
    </div>
  );
};
