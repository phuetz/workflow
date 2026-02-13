/**
 * Snowflake Node Configuration
 * Cloud data warehouse integration
 */

import React, { useState } from 'react';

interface SnowflakeConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SnowflakeConfig: React.FC<SnowflakeConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'executeQuery');
  const [query, setQuery] = useState(config.query as string || '');
  const [database, setDatabase] = useState(config.database as string || '');
  const [schema, setSchema] = useState(config.schema as string || 'PUBLIC');
  const [warehouse, setWarehouse] = useState(config.warehouse as string || '');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onChange({ ...config, query: value });
  };

  const handleDatabaseChange = (value: string) => {
    setDatabase(value);
    onChange({ ...config, database: value });
  };

  const handleSchemaChange = (value: string) => {
    setSchema(value);
    onChange({ ...config, schema: value });
  };

  const handleWarehouseChange = (value: string) => {
    setWarehouse(value);
    onChange({ ...config, warehouse: value });
  };

  const loadExample = (example: string) => {
    if (example === 'select') {
      handleQueryChange('SELECT * FROM CUSTOMERS LIMIT 100');
    } else if (example === 'insert') {
      handleQueryChange(`INSERT INTO CUSTOMERS (name, email) VALUES ('{{ $json.name }}', '{{ $json.email }}')`);
    } else if (example === 'update') {
      handleQueryChange(`UPDATE CUSTOMERS SET status = 'active' WHERE id = {{ $json.id }}`);
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        >
          <option value="executeQuery">Execute Query</option>
          <option value="insert">Insert Data</option>
          <option value="bulkInsert">Bulk Insert</option>
          <option value="executeStoredProcedure">Execute Stored Procedure</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Database
        </label>
        <input
          type="text"
          value={database}
          onChange={(e) => handleDatabaseChange(e.target.value)}
          placeholder="MY_DATABASE"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Schema
        </label>
        <input
          type="text"
          value={schema}
          onChange={(e) => handleSchemaChange(e.target.value)}
          placeholder="PUBLIC"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Warehouse
        </label>
        <input
          type="text"
          value={warehouse}
          onChange={(e) => handleWarehouseChange(e.target.value)}
          placeholder="COMPUTE_WH"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SQL Query
        </label>
        <textarea
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="SELECT * FROM table_name"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('select')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            SELECT Query
          </button>
          <button
            onClick={() => loadExample('insert')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            INSERT Query
          </button>
          <button
            onClick={() => loadExample('update')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            UPDATE Query
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Snowflake account, username, password, and account identifier.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>Cloud Platform:</strong> AWS, Azure, GCP</div>
          <div><strong>Security:</strong> OAuth 2.0, Key Pair, SSO</div>
          <div><strong>Documentation:</strong> docs.snowflake.com</div>
        </p>
      </div>
    </div>
  );
};
