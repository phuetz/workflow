/**
 * ItemLists Node Configuration
 * Combine, limit, remove duplicates, sort items
 */

import React from 'react';

interface ItemListsConfigProps {
  config: {
    operation?: 'concatenate' | 'limit' | 'removeDuplicates' | 'sort' | 'split' | 'summarize';
    // Limit options
    maxItems?: number;
    keepFirst?: boolean;
    // Sort options
    sortField?: string;
    sortOrder?: 'ascending' | 'descending';
    sortType?: 'string' | 'number' | 'date';
    // Remove duplicates
    compareField?: string;
    keepWhen?: 'first' | 'last';
    // Summarize
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
    aggregateField?: string;
    groupByField?: string;
  };
  onChange: (config: ItemListsConfigProps['config']) => void;
}

export const ItemListsConfig: React.FC<ItemListsConfigProps> = ({
  config,
  onChange,
}) => {
  const updateConfig = (updates: Partial<ItemListsConfigProps['config']>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'concatenate'}
          onChange={(e) => updateConfig({ operation: e.target.value as ItemListsConfigProps['config']['operation'] })}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="concatenate">Concatenate Items</option>
          <option value="limit">Limit</option>
          <option value="removeDuplicates">Remove Duplicates</option>
          <option value="sort">Sort</option>
          <option value="split">Split Out Items</option>
          <option value="summarize">Summarize</option>
        </select>
      </div>

      {config.operation === 'limit' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Items
            </label>
            <input
              type="number"
              value={config.maxItems || 10}
              onChange={(e) => updateConfig({ maxItems: parseInt(e.target.value, 10) })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="keepFirst"
              checked={config.keepFirst ?? true}
              onChange={(e) => updateConfig({ keepFirst: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="keepFirst" className="ml-2 text-sm text-gray-700">
              Keep first items (uncheck to keep last)
            </label>
          </div>
        </>
      )}

      {config.operation === 'sort' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By Field
            </label>
            <input
              type="text"
              value={config.sortField || ''}
              onChange={(e) => updateConfig({ sortField: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="field.path"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                value={config.sortOrder || 'ascending'}
                onChange={(e) => updateConfig({ sortOrder: e.target.value as 'ascending' | 'descending' })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="ascending">Ascending</option>
                <option value="descending">Descending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={config.sortType || 'string'}
                onChange={(e) => updateConfig({ sortType: e.target.value as 'string' | 'number' | 'date' })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
            </div>
          </div>
        </>
      )}

      {config.operation === 'removeDuplicates' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compare Field
            </label>
            <input
              type="text"
              value={config.compareField || ''}
              onChange={(e) => updateConfig({ compareField: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="field.path (leave empty for entire object)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              When Duplicate
            </label>
            <select
              value={config.keepWhen || 'first'}
              onChange={(e) => updateConfig({ keepWhen: e.target.value as 'first' | 'last' })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="first">Keep First</option>
              <option value="last">Keep Last</option>
            </select>
          </div>
        </>
      )}

      {config.operation === 'summarize' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aggregation
            </label>
            <select
              value={config.aggregation || 'count'}
              onChange={(e) => updateConfig({ aggregation: e.target.value as ItemListsConfigProps['config']['aggregation'] })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="count">Count</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
            </select>
          </div>
          {config.aggregation !== 'count' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field to Aggregate
              </label>
              <input
                type="text"
                value={config.aggregateField || ''}
                onChange={(e) => updateConfig({ aggregateField: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="field.path"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group By (optional)
            </label>
            <input
              type="text"
              value={config.groupByField || ''}
              onChange={(e) => updateConfig({ groupByField: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="field.path"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ItemListsConfig;
