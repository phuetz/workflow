/**
 * TimescaleDB Node Configuration
 * Time-series database built on PostgreSQL
 */

import React, { useState } from 'react';

interface TimescaleDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const TimescaleDBConfig: React.FC<TimescaleDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'executeQuery');
  const [query, setQuery] = useState(config.query as string || '');

  const handleChange = (key: string, value: string) => {
    onChange({ ...config, [key]: value });
  };

  const loadExample = (example: string) => {
    if (example === 'timeBucket') {
      handleChange('query', `SELECT time_bucket('1 hour', time) AS hour, AVG(temperature) FROM conditions GROUP BY hour`);
    } else if (example === 'insert') {
      handleChange('query', `INSERT INTO conditions (time, location, temperature) VALUES (NOW(), '{{ $json.location }}', {{ $json.temp }})`);
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
          onChange={(e) => { setOperation(e.target.value); handleChange('operation', e.target.value); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
        >
          <option value="executeQuery">Execute Query</option>
          <option value="insert">Insert Time-Series Data</option>
          <option value="createHypertable">Create Hypertable</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          SQL Query
        </label>
        <textarea
          value={query}
          onChange={(e) => { setQuery(e.target.value); handleChange('query', e.target.value); }}
          placeholder="SELECT * FROM metrics WHERE time > NOW() - INTERVAL '1 day'"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
        />
      </div>

      <div className="border-t pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Examples
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => loadExample('timeBucket')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Time Bucket Query
          </button>
          <button
            onClick={() => loadExample('insert')}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Insert Time-Series
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">
          PostgreSQL-compatible connection (host, port, database, username, password).
        </p>
      </div>
    </div>
  );
};
