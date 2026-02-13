/**
 * InfluxDB Node Configuration
 * Time-series database for metrics and events
 */

import React, { useState } from 'react';

interface InfluxDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const InfluxDBConfig: React.FC<InfluxDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'write');
  const [bucket, setBucket] = useState(config.bucket as string || '');
  const [measurement, setMeasurement] = useState(config.measurement as string || '');
  const [query, setQuery] = useState(config.query as string || '');

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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
        >
          <option value="write">Write Data Point</option>
          <option value="query">Query (Flux)</option>
          <option value="querySQL">Query (SQL)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bucket
        </label>
        <input
          type="text"
          value={bucket}
          onChange={(e) => { setBucket(e.target.value); handleChange('bucket', e.target.value); }}
          placeholder="my-bucket"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {operation === 'write' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Measurement
          </label>
          <input
            type="text"
            value={measurement}
            onChange={(e) => { setMeasurement(e.target.value); handleChange('measurement', e.target.value); }}
            placeholder="temperature"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
          />
        </div>
      )}

      {(operation === 'query' || operation === 'querySQL') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {operation === 'query' ? 'Flux Query' : 'SQL Query'}
          </label>
          <textarea
            value={query}
            onChange={(e) => { setQuery(e.target.value); handleChange('query', e.target.value); }}
            placeholder={operation === 'query' ?
              'from(bucket: "my-bucket")\n  |> range(start: -1h)' :
              'SELECT * FROM measurement WHERE time > now() - 1h'}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          />
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-700">
          Requires InfluxDB URL, organization, and API token.
        </p>
      </div>
    </div>
  );
};
