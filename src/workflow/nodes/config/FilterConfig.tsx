/**
 * Filter Node Configuration
 * Filter items based on conditions
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface FilterCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'exists' | 'notExists' | 'regex';
  value: string;
  combineWith?: 'AND' | 'OR';
}

interface FilterConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const FilterConfig: React.FC<FilterConfigProps> = ({ config, onChange }) => {
  const [conditions, setConditions] = useState<FilterCondition[]>(
    (config.conditions as FilterCondition[]) || [{ field: '', operator: 'equals', value: '', combineWith: 'AND' }]
  );
  const [keepOnlyMatched, setKeepOnlyMatched] = useState((config.keepOnlyMatched as boolean | undefined) !== false);

  const addCondition = () => {
    const newConditions = [...conditions, { field: '', operator: 'equals' as const, value: '', combineWith: 'AND' as const }];
    setConditions(newConditions);
    onChange({ ...config, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
    onChange({ ...config, conditions: newConditions });
  };

  const updateCondition = (index: number, field: keyof FilterCondition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
    onChange({ ...config, conditions: newConditions });
  };

  const operatorDescriptions: Record<string, string> = {
    equals: '==',
    notEquals: '!=',
    contains: 'contains',
    notContains: 'not contains',
    greaterThan: '>',
    lessThan: '<',
    greaterOrEqual: '>=',
    lessOrEqual: '<=',
    exists: 'exists',
    notExists: 'not exists',
    regex: 'matches regex'
  };

  return (
    <div className="filter-config space-y-4">
      <div className="font-semibold text-lg mb-4">Filter Conditions</div>

      <div className="space-y-3">
        {conditions.map((condition, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
            {index > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-600">Combine with previous:</span>
                <select
                  value={condition.combineWith || 'AND'}
                  onChange={(e) => updateCondition(index, 'combineWith', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Field</label>
                <input
                  type="text"
                  value={condition.field}
                  onChange={(e) => updateCondition(index, 'field', e.target.value)}
                  placeholder="field.name or {{ $json.field }}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Operator</label>
                <select
                  value={condition.operator}
                  onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="equals">Equals (==)</option>
                  <option value="notEquals">Not Equals (!=)</option>
                  <option value="contains">Contains</option>
                  <option value="notContains">Not Contains</option>
                  <option value="greaterThan">Greater Than (&gt;)</option>
                  <option value="lessThan">Less Than (&lt;)</option>
                  <option value="greaterOrEqual">Greater or Equal (≥)</option>
                  <option value="lessOrEqual">Less or Equal (≤)</option>
                  <option value="exists">Exists</option>
                  <option value="notExists">Not Exists</option>
                  <option value="regex">Matches Regex</option>
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Value</label>
                  <input
                    type="text"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, 'value', e.target.value)}
                    placeholder={condition.operator === 'exists' || condition.operator === 'notExists' ? 'Not required' : 'value or expression'}
                    disabled={condition.operator === 'exists' || condition.operator === 'notExists'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm disabled:bg-gray-100"
                  />
                </div>
                {conditions.length > 1 && (
                  <button
                    onClick={() => removeCondition(index)}
                    className="mt-6 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 self-start"
                    title="Remove condition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addCondition}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        + Add Condition
      </button>

      <div className="mt-4 p-3 border-t border-gray-200">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="keepOnlyMatched"
            checked={keepOnlyMatched}
            onChange={(e) => {
              setKeepOnlyMatched(e.target.checked);
              onChange({ ...config, keepOnlyMatched: e.target.checked });
            }}
            className="mr-2"
          />
          <label htmlFor="keepOnlyMatched" className="text-sm">
            Keep only matched items (discard non-matching)
          </label>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Examples:</strong></div>
        <div className="space-y-1">
          <div><code className="bg-white px-2 py-1 rounded">status</code> equals <code className="bg-white px-2 py-1 rounded">active</code></div>
          <div><code className="bg-white px-2 py-1 rounded">price</code> greater than <code className="bg-white px-2 py-1 rounded">100</code></div>
          <div><code className="bg-white px-2 py-1 rounded">email</code> contains <code className="bg-white px-2 py-1 rounded">@example.com</code></div>
          <div><code className="bg-white px-2 py-1 rounded">tags</code> exists</div>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>⚠️ Note:</strong> Use expressions like <code className="bg-white px-1 rounded">{'{{ $json.field }}'}</code> for dynamic field names or values.
      </div>
    </div>
  );
};
