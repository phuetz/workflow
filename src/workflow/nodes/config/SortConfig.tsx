/**
 * Sort Node Configuration
 * Sort items by one or multiple fields
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SortRule {
  field: string;
  direction: 'asc' | 'desc';
  type: 'string' | 'number' | 'date' | 'boolean';
}

interface SortConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const SortConfig: React.FC<SortConfigProps> = ({ config, onChange }) => {
  const [sortRules, setSortRules] = useState<SortRule[]>(
    (config.sortRules as SortRule[] | undefined) || [{ field: '', direction: 'asc', type: 'string' }]
  );
  const [randomize, setRandomize] = useState((config.randomize as boolean | undefined) || false);

  const addSortRule = () => {
    const newRules = [...sortRules, { field: '', direction: 'asc' as const, type: 'string' as const }];
    setSortRules(newRules);
    onChange({ ...config, sortRules: newRules });
  };

  const removeSortRule = (index: number) => {
    const newRules = sortRules.filter((_, i) => i !== index);
    setSortRules(newRules);
    onChange({ ...config, sortRules: newRules });
  };

  const updateSortRule = (index: number, field: keyof SortRule, value: string) => {
    const newRules = [...sortRules];
    newRules[index] = { ...newRules[index], [field]: value } as SortRule;
    setSortRules(newRules);
    onChange({ ...config, sortRules: newRules });
  };

  const handleRandomizeChange = (checked: boolean) => {
    setRandomize(checked);
    onChange({ ...config, randomize: checked });
  };

  return (
    <div className="sort-config space-y-4">
      <div className="font-semibold text-lg mb-4">Sort Configuration</div>

      <div className="flex items-center mb-4">
        <input
          type="checkbox"
          id="randomize"
          checked={randomize}
          onChange={(e) => handleRandomizeChange(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="randomize" className="text-sm">
          Randomize order (shuffle items)
        </label>
      </div>

      {!randomize && (
        <>
          <div className="text-sm text-gray-600 mb-3">
            Items will be sorted by the fields below in order. First rule takes priority.
          </div>

          <div className="space-y-3">
            {sortRules.map((rule, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {index === 0 ? 'Primary Sort' : `Then by (${index + 1})`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Field</label>
                    <input
                      type="text"
                      value={rule.field}
                      onChange={(e) => updateSortRule(index, 'field', e.target.value)}
                      placeholder="field.name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={rule.type}
                      onChange={(e) => updateSortRule(index, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="string">String (A-Z)</option>
                      <option value="number">Number (0-9)</option>
                      <option value="date">Date</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Direction</label>
                      <select
                        value={rule.direction}
                        onChange={(e) => updateSortRule(index, 'direction', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="asc">Ascending ↑</option>
                        <option value="desc">Descending ↓</option>
                      </select>
                    </div>
                    {sortRules.length > 1 && (
                      <button
                        onClick={() => removeSortRule(index)}
                        className="mt-6 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 self-start"
                        title="Remove sort rule"
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
            onClick={addSortRule}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + Add Sort Rule
          </button>
        </>
      )}

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Sort Examples:</strong></div>
        <div className="space-y-1">
          <div>• <code className="bg-white px-2 py-1 rounded">price</code> (number, ascending) - Sort by price low to high</div>
          <div>• <code className="bg-white px-2 py-1 rounded">createdAt</code> (date, descending) - Most recent first</div>
          <div>• <code className="bg-white px-2 py-1 rounded">name</code> (string, ascending) - Alphabetical A-Z</div>
          <div>• Multiple rules: First by status, then by priority</div>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>⚠️ Performance:</strong> Sorting large datasets (1000+ items) may impact performance. Consider using pagination or filtering first.
      </div>
    </div>
  );
};
