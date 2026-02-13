/**
 * Aggregate Node Configuration
 * Group and aggregate data with various operations
 * PROJET SAUVÉ - Phase 5.5: Data Processing Nodes
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface AggregationRule {
  inputField: string;
  operation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'countUnique' | 'first' | 'last' | 'concat' | 'array';
  outputField: string;
}

interface AggregateConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const AggregateConfig: React.FC<AggregateConfigProps> = ({ config, onChange }) => {
  const [groupByFields, setGroupByFields] = useState<string[]>(
    (config.groupByFields as string[] | undefined) || []
  );
  const [aggregations, setAggregations] = useState<AggregationRule[]>(
    (config.aggregations as AggregationRule[] | undefined) || [{ inputField: '', operation: 'sum', outputField: '' }]
  );
  const [keepGroupFields, setKeepGroupFields] = useState<boolean>((config.keepGroupFields as boolean | undefined) !== false);

  const addGroupByField = () => {
    const newFields = [...groupByFields, ''];
    setGroupByFields(newFields);
    onChange({ ...config, groupByFields: newFields });
  };

  const removeGroupByField = (index: number) => {
    const newFields = groupByFields.filter((_, i) => i !== index);
    setGroupByFields(newFields);
    onChange({ ...config, groupByFields: newFields });
  };

  const updateGroupByField = (index: number, value: string) => {
    const newFields = [...groupByFields];
    newFields[index] = value;
    setGroupByFields(newFields);
    onChange({ ...config, groupByFields: newFields });
  };

  const addAggregation = () => {
    const newAggregations = [...aggregations, { inputField: '', operation: 'sum' as const, outputField: '' }];
    setAggregations(newAggregations);
    onChange({ ...config, aggregations: newAggregations });
  };

  const removeAggregation = (index: number) => {
    const newAggregations = aggregations.filter((_, i) => i !== index);
    setAggregations(newAggregations);
    onChange({ ...config, aggregations: newAggregations });
  };

  const updateAggregation = (index: number, field: keyof AggregationRule, value: string) => {
    const newAggregations = [...aggregations];
    newAggregations[index] = { ...newAggregations[index], [field]: value };
    setAggregations(newAggregations);
    onChange({ ...config, aggregations: newAggregations });
  };

  const operationDescriptions: Record<string, string> = {
    sum: 'Sum all values',
    avg: 'Calculate average',
    min: 'Find minimum value',
    max: 'Find maximum value',
    count: 'Count all items',
    countUnique: 'Count unique values',
    first: 'Take first value',
    last: 'Take last value',
    concat: 'Concatenate strings',
    array: 'Collect all values in array'
  };

  return (
    <div className="aggregate-config space-y-4">
      <div className="font-semibold text-lg mb-4">Aggregate Configuration</div>

      <div className="space-y-3">
        <div className="font-medium">Group By Fields (Optional)</div>
        <p className="text-sm text-gray-600">
          Group items by these fields before aggregating. Leave empty to aggregate all items together.
        </p>

        {groupByFields.length === 0 ? (
          <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 italic">
            No grouping - all items will be aggregated together
          </div>
        ) : (
          <div className="space-y-2">
            {groupByFields.map((field, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={field}
                  onChange={(e) => updateGroupByField(index, e.target.value)}
                  placeholder="field.name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                />
                <button
                  onClick={() => removeGroupByField(index)}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={addGroupByField}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          + Add Group By Field
        </button>
      </div>

      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div className="font-medium">Aggregation Operations</div>
        <p className="text-sm text-gray-600">
          Define how to aggregate the data
        </p>

        <div className="space-y-3">
          {aggregations.map((agg, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Input Field</label>
                  <input
                    type="text"
                    value={agg.inputField}
                    onChange={(e) => updateAggregation(index, 'inputField', e.target.value)}
                    placeholder="price"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Operation</label>
                  <select
                    value={agg.operation}
                    onChange={(e) => updateAggregation(index, 'operation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="sum">Sum (Σ)</option>
                    <option value="avg">Average (μ)</option>
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                    <option value="count">Count</option>
                    <option value="countUnique">Count Unique</option>
                    <option value="first">First</option>
                    <option value="last">Last</option>
                    <option value="concat">Concatenate</option>
                    <option value="array">Collect Array</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-1">Output Field</label>
                    <input
                      type="text"
                      value={agg.outputField}
                      onChange={(e) => updateAggregation(index, 'outputField', e.target.value)}
                      placeholder="totalPrice"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    />
                  </div>
                  {aggregations.length > 1 && (
                    <button
                      onClick={() => removeAggregation(index)}
                      className="mt-6 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 self-start"
                      title="Remove aggregation"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-2">
                {operationDescriptions[agg.operation]}
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={addAggregation}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Add Aggregation
        </button>
      </div>

      <div className="flex items-center pt-4 border-t border-gray-200">
        <input
          type="checkbox"
          id="keepGroupFields"
          checked={keepGroupFields}
          onChange={(e) => {
            setKeepGroupFields(e.target.checked);
            onChange({ ...config, keepGroupFields: e.target.checked });
          }}
          className="mr-2"
        />
        <label htmlFor="keepGroupFields" className="text-sm">
          Include group by fields in output
        </label>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-3">
        <div><strong>💡 Aggregation Examples:</strong></div>

        <div className="space-y-2">
          <div className="font-medium">Example 1: Sales by Category</div>
          <div className="bg-white p-2 rounded text-xs">
            <strong>Group By:</strong> category<br/>
            <strong>Aggregation:</strong> Sum of 'price' → 'totalSales'<br/>
            <strong>Input:</strong><br/>
            <code className="text-xs">
              [&#123;category:"A", price:10&#125;, &#123;category:"A", price:20&#125;, &#123;category:"B", price:15&#125;]
            </code><br/>
            <strong>Output:</strong><br/>
            <code className="text-xs">
              [&#123;category:"A", totalSales:30&#125;, &#123;category:"B", totalSales:15&#125;]
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Example 2: Overall Statistics</div>
          <div className="bg-white p-2 rounded text-xs">
            <strong>Group By:</strong> (none)<br/>
            <strong>Aggregations:</strong><br/>
            - Count of items → 'total'<br/>
            - Average of 'price' → 'avgPrice'<br/>
            - Max of 'price' → 'maxPrice'<br/>
            <strong>Output:</strong> Single object with all statistics
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium">Example 3: User Activity</div>
          <div className="bg-white p-2 rounded text-xs">
            <strong>Group By:</strong> userId<br/>
            <strong>Aggregations:</strong><br/>
            - Count → 'activityCount'<br/>
            - Array of 'action' → 'actions'<br/>
            - Last of 'timestamp' → 'lastActive'
          </div>
        </div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>⚠️ Note:</strong> Aggregation operations like sum, avg, min, max work on numeric fields. Use count, concat, or array for non-numeric data.
      </div>
    </div>
  );
};
