/**
 * Amazon Redshift Node Configuration
 * Cloud data warehouse
 */

import React, { useState } from 'react';

interface RedshiftConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const RedshiftConfig: React.FC<RedshiftConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'executeQuery');
  const [query, setQuery] = useState(config.query as string || '');
  const [database, setDatabase] = useState(config.database as string || 'dev');

  const handleChange = (key: string, value: string) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => { setOperation(e.target.value); handleChange('operation', e.target.value); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        >
          <option value="executeQuery">Execute Query</option>
          <option value="insert">Insert Rows</option>
          <option value="update">Update Rows</option>
          <option value="delete">Delete Rows</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Database
        </label>
        <input
          type="text"
          value={database}
          onChange={(e) => { setDatabase(e.target.value); handleChange('database', e.target.value); }}
          placeholder="dev"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SQL Query
        </label>
        <textarea
          value={query}
          onChange={(e) => { setQuery(e.target.value); handleChange('query', e.target.value); }}
          placeholder="SELECT * FROM sales ORDER BY date DESC LIMIT 1000"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 font-mono text-sm"
        />
      </div>

      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-red-700">
          Requires AWS credentials, cluster endpoint, database name, and user credentials.
        </p>
      </div>
    </div>
  );
};
