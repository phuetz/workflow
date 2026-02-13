/**
 * Merge Node Configuration
 * Combine data from multiple input branches
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface MergeConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const MergeConfig: React.FC<MergeConfigProps> = ({ config, onChange }) => {
  const [mergeMode, setMergeMode] = useState<string>((config.mergeMode as string) || 'append');
  const [clashHandling, setClashHandling] = useState<string>((config.clashHandling as string) || 'prefer-first');
  const [mergeByKey, setMergeByKey] = useState<boolean>((config.mergeByKey as boolean) || false);
  const [keyField, setKeyField] = useState<string>((config.keyField as string) || 'id');
  const [waitForAll, setWaitForAll] = useState<boolean>((config.waitForAll as boolean) !== false);

  const handleMergeModeChange = (mode: string) => {
    setMergeMode(mode);
    onChange({ ...config, mergeMode: mode });
  };

  const handleClashHandlingChange = (handling: string) => {
    setClashHandling(handling);
    onChange({ ...config, clashHandling: handling });
  };

  const handleMergeByKeyChange = (checked: boolean) => {
    setMergeByKey(checked);
    onChange({ ...config, mergeByKey: checked });
  };

  const handleKeyFieldChange = (field: string) => {
    setKeyField(field);
    onChange({ ...config, keyField: field });
  };

  const handleWaitForAllChange = (checked: boolean) => {
    setWaitForAll(checked);
    onChange({ ...config, waitForAll: checked });
  };

  const mergeModeDescriptions = {
    append: 'Combine all items into a single array',
    merge: 'Merge items with the same key into one object',
    multiplex: 'Create pairs of items from each input',
    wait: 'Wait for all inputs, then pass first input through'
  };

  return (
    <div className="merge-config space-y-4">
      <div className="font-semibold text-lg mb-4">Merge Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Merge Mode</label>
        <select
          value={mergeMode}
          onChange={(e) => handleMergeModeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="append">Append - Combine all items</option>
          <option value="merge">Merge - Merge by key field</option>
          <option value="multiplex">Multiplex - Create pairs</option>
          <option value="wait">Wait - Wait for all inputs</option>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {mergeModeDescriptions[mergeMode as keyof typeof mergeModeDescriptions]}
        </p>
      </div>

      {mergeMode === 'merge' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-2">Key Field</label>
            <input
              type="text"
              value={keyField}
              onChange={(e) => handleKeyFieldChange(e.target.value)}
              placeholder="id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Field to match items across inputs (e.g., 'id', 'email', 'userId')
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Clash Handling</label>
            <select
              value={clashHandling}
              onChange={(e) => handleClashHandlingChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="prefer-first">Prefer First - Keep first input's values</option>
              <option value="prefer-last">Prefer Last - Keep last input's values</option>
              <option value="merge-deep">Deep Merge - Merge nested objects</option>
              <option value="array">Array - Keep all values as array</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              How to handle when the same field exists in multiple inputs
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3 p-3 border-t border-gray-200">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="waitForAll"
            checked={waitForAll}
            onChange={(e) => handleWaitForAllChange(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="waitForAll" className="text-sm">
            Wait for all inputs before processing
          </label>
        </div>
        <p className="text-xs text-gray-600 ml-6">
          If unchecked, node will process as soon as any input arrives
        </p>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-3">
        <div><strong>💡 Merge Examples:</strong></div>

        <div className="space-y-2">
          <div className="font-medium">Append Mode:</div>
          <div className="bg-white p-2 rounded font-mono text-xs">
            Input 1: [&#123;a:1&#125;, &#123;a:2&#125;]<br/>
            Input 2: [&#123;b:3&#125;, &#123;b:4&#125;]<br/>
            Output: [&#123;a:1&#125;, &#123;a:2&#125;, &#123;b:3&#125;, &#123;b:4&#125;]
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Merge Mode (by 'id'):</div>
          <div className="bg-white p-2 rounded font-mono text-xs">
            Input 1: [&#123;id:1, name:"A"&#125;]<br/>
            Input 2: [&#123;id:1, age:30&#125;]<br/>
            Output: [&#123;id:1, name:"A", age:30&#125;]
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Multiplex Mode:</div>
          <div className="bg-white p-2 rounded font-mono text-xs">
            Input 1: [&#123;a:1&#125;, &#123;a:2&#125;]<br/>
            Input 2: [&#123;b:3&#125;, &#123;b:4&#125;]<br/>
            Output: [&#123;a:1, b:3&#125;, &#123;a:1, b:4&#125;, &#123;a:2, b:3&#125;, &#123;a:2, b:4&#125;]
          </div>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>⚠️ Note:</strong> Merge node requires multiple incoming connections. Ensure your workflow has multiple branches leading to this node.
      </div>
    </div>
  );
};
