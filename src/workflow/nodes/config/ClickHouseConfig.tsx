/**
 * ClickHouse Node Configuration
 * Fast open-source columnar database
 */

import React, { useState } from 'react';

interface ClickHouseConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ClickHouseConfig: React.FC<ClickHouseConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'executeQuery');
  const [query, setQuery] = useState(config.query as string || '');
  const [format, setFormat] = useState(config.format as string || 'JSONEachRow');

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
        >
          <option value="executeQuery">Execute Query</option>
          <option value="insert">Insert Data</option>
          <option value="bulkInsert">Bulk Insert</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data Format
        </label>
        <select
          value={format}
          onChange={(e) => { setFormat(e.target.value); handleChange('format', e.target.value); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
        >
          <option value="JSONEachRow">JSON Each Row</option>
          <option value="CSV">CSV</option>
          <option value="TabSeparated">Tab Separated</option>
          <option value="Parquet">Parquet</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SQL Query
        </label>
        <textarea
          value={query}
          onChange={(e) => { setQuery(e.target.value); handleChange('query', e.target.value); }}
          placeholder="SELECT * FROM events WHERE date >= today() - INTERVAL 7 DAY"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
        />
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-yellow-700">
          Requires ClickHouse host, port, database, username, and password.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600">
          <div><strong>Performance:</strong> Sub-second query responses</div>
          <div><strong>Scale:</strong> Petabyte-scale analytics</div>
        </p>
      </div>
    </div>
  );
};
