/**
 * Databricks Node Configuration
 * Unified analytics platform for data and AI
 */

import React, { useState } from 'react';

interface DatabricksConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const DatabricksConfig: React.FC<DatabricksConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'executeQuery');
  const [query, setQuery] = useState(config.query as string || '');
  const [clusterId, setClusterId] = useState(config.clusterId as string || '');
  const [warehouseId, setWarehouseId] = useState(config.warehouseId as string || '');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onChange({ ...config, query: value });
  };

  const handleClusterIdChange = (value: string) => {
    setClusterId(value);
    onChange({ ...config, clusterId: value });
  };

  const handleWarehouseIdChange = (value: string) => {
    setWarehouseId(value);
    onChange({ ...config, warehouseId: value });
  };

  const loadExample = (example: string) => {
    if (example === 'query') {
      handleQueryChange('SELECT * FROM delta.`/mnt/data/table` LIMIT 100');
    } else if (example === 'aggregation') {
      handleQueryChange('SELECT category, COUNT(*) as count FROM sales GROUP BY category');
    } else if (example === 'join') {
      handleQueryChange('SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        >
          <option value="executeQuery">Execute SQL Query</option>
          <option value="runNotebook">Run Notebook</option>
          <option value="createTable">Create Table</option>
          <option value="readDelta">Read Delta Table</option>
          <option value="writeDelta">Write Delta Table</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SQL Warehouse ID
        </label>
        <input
          type="text"
          value={warehouseId}
          onChange={(e) => handleWarehouseIdChange(e.target.value)}
          placeholder="abc123def456"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Databricks SQL Warehouse ID for query execution
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cluster ID (Optional)
        </label>
        <input
          type="text"
          value={clusterId}
          onChange={(e) => handleClusterIdChange(e.target.value)}
          placeholder="1234-567890-abc123"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          For notebook execution or compute operations
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SQL Query / Command
        </label>
        <textarea
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="SELECT * FROM table_name"
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 font-mono text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Supports Spark SQL, Delta Lake queries, and expressions
        </p>
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('query')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Delta Query
          </button>
          <button
            onClick={() => loadExample('aggregation')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Aggregation
          </button>
          <button
            onClick={() => loadExample('join')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Join Query
          </button>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires Databricks workspace URL and personal access token.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Delta Lake:</strong> ACID transactions on data lakes</div>
          <div><strong>Spark SQL:</strong> Distributed query engine</div>
          <div><strong>Documentation:</strong> docs.databricks.com</div>
        </p>
      </div>
    </div>
  );
};
