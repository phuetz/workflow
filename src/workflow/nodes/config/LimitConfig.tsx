/**
 * Limit Node Configuration
 * Limit the number of items passing through
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';

interface LimitConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const LimitConfig: React.FC<LimitConfigProps> = ({ config, onChange }) => {
  const [maxItems, setMaxItems] = useState<number>((config.maxItems as number) || 10);
  const [skipItems, setSkipItems] = useState<number>((config.skipItems as number) || 0);
  const [keepFromEnd, setKeepFromEnd] = useState<boolean>((config.keepFromEnd as boolean) || false);

  const handleMaxItemsChange = (value: string) => {
    const num = parseInt(value, 10) || 1;
    setMaxItems(num);
    onChange({ ...config, maxItems: num });
  };

  const handleSkipItemsChange = (value: string) => {
    const num = parseInt(value, 10) || 0;
    setSkipItems(num);
    onChange({ ...config, skipItems: num });
  };

  const handleKeepFromEndChange = (checked: boolean) => {
    setKeepFromEnd(checked);
    onChange({ ...config, keepFromEnd: checked });
  };

  const calculateRange = () => {
    if (keepFromEnd) {
      return `Last ${maxItems} items${skipItems > 0 ? `, skipping ${skipItems} from end` : ''}`;
    } else {
      return `Items ${skipItems + 1} to ${skipItems + maxItems}`;
    }
  };

  return (
    <div className="limit-config space-y-4">
      <div className="font-semibold text-lg mb-4">Limit Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Maximum Items
        </label>
        <input
          type="number"
          min="1"
          value={maxItems}
          onChange={(e) => handleMaxItemsChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-600 mt-1">
          Maximum number of items to pass through (must be at least 1)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Skip Items
        </label>
        <input
          type="number"
          min="0"
          value={skipItems}
          onChange={(e) => handleSkipItemsChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        <p className="text-xs text-gray-600 mt-1">
          Number of items to skip from the start (offset)
        </p>
      </div>

      <div className="flex items-center pt-3 border-t border-gray-200">
        <input
          type="checkbox"
          id="keepFromEnd"
          checked={keepFromEnd}
          onChange={(e) => handleKeepFromEndChange(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="keepFromEnd" className="text-sm">
          Keep from end (reverse direction)
        </label>
      </div>
      <p className="text-xs text-gray-600 ml-6">
        If checked, takes the last N items instead of the first N items
      </p>

      <div className="p-3 bg-blue-100 rounded">
        <div className="text-sm font-medium mb-1">Current Configuration:</div>
        <div className="text-sm">{calculateRange()}</div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-3">
        <div><strong>💡 Limit Examples:</strong></div>

        <div className="space-y-2">
          <div className="font-medium">Example 1: First 10 Items</div>
          <div className="bg-white p-2 rounded text-xs">
            <strong>Max Items:</strong> 10<br/>
            <strong>Skip Items:</strong> 0<br/>
            <strong>Keep From End:</strong> No<br/>
            <strong>Input:</strong> 100 items<br/>
            <strong>Output:</strong> Items 1-10
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Example 2: Pagination (Page 3)</div>
          <div className="bg-white p-2 rounded text-xs">
            <strong>Max Items:</strong> 20<br/>
            <strong>Skip Items:</strong> 40<br/>
            <strong>Keep From End:</strong> No<br/>
            <strong>Input:</strong> 100 items<br/>
            <strong>Output:</strong> Items 41-60 (page 3 with 20 items per page)
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Example 3: Last 5 Items</div>
          <div className="bg-white p-2 rounded text-xs">
            <strong>Max Items:</strong> 5<br/>
            <strong>Skip Items:</strong> 0<br/>
            <strong>Keep From End:</strong> Yes<br/>
            <strong>Input:</strong> 100 items<br/>
            <strong>Output:</strong> Items 96-100 (last 5)
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Example 4: Sample from Middle</div>
          <div className="bg-white p-2 rounded text-xs">
            <strong>Max Items:</strong> 10<br/>
            <strong>Skip Items:</strong> 45<br/>
            <strong>Keep From End:</strong> No<br/>
            <strong>Input:</strong> 100 items<br/>
            <strong>Output:</strong> Items 46-55
          </div>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>💡 Use Cases:</strong>
        <ul className="list-disc ml-4 mt-1 space-y-1">
          <li>Pagination: Process data in pages</li>
          <li>Sampling: Take a subset for testing</li>
          <li>Rate limiting: Limit processing to N items</li>
          <li>Top/Bottom N: Get most/least recent items</li>
        </ul>
      </div>

      <div className="mt-2 p-3 bg-green-50 rounded text-sm">
        <strong>✅ Pro Tip:</strong> Combine with Sort node to get "Top N" results (e.g., top 10 by price, most recent 20 items)
      </div>
    </div>
  );
};
