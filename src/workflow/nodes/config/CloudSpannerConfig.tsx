/**
 * Google Cloud Spanner Node Configuration
 * Globally distributed relational database
 */

import React, { useState } from 'react';

interface CloudSpannerConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const CloudSpannerConfig: React.FC<CloudSpannerConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'query');
  const [query, setQuery] = useState(config.query as string || '');
  const [instance, setInstance] = useState(config.instance as string || '');
  const [database, setDatabase] = useState(config.database as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
          <option value="query">Execute Query</option>
          <option value="insert">Insert Data</option>
          <option value="update">Update Data</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instance ID</label>
        <input type="text" value={instance} onChange={(e) => { setInstance(e.target.value); onChange({ ...config, instance: e.target.value }); }}
          placeholder="my-instance" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Database ID</label>
        <input type="text" value={database} onChange={(e) => { setDatabase(e.target.value); onChange({ ...config, database: e.target.value }); }}
          placeholder="my-database" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT * FROM users WHERE active = true" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">Requires Google Cloud service account credentials.</p>
      </div>
    </div>
  );
};
