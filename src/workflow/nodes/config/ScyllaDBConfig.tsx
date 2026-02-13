/**
 * ScyllaDB Node Configuration
 * Cassandra-compatible NoSQL database
 */

import React, { useState } from 'react';

interface ScyllaDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ScyllaDBConfig: React.FC<ScyllaDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'query');
  const [query, setQuery] = useState(config.query as string || '');
  const [keyspace, setKeyspace] = useState(config.keyspace as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500">
          <option value="query">Execute CQL</option>
          <option value="insert">Insert Data</option>
          <option value="batch">Batch Insert</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keyspace</label>
        <input type="text" value={keyspace} onChange={(e) => { setKeyspace(e.target.value); onChange({ ...config, keyspace: e.target.value }); }}
          placeholder="my_keyspace" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT * FROM users WHERE user_id = ?" rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 font-mono text-sm" />
      </div>
      <div className="bg-teal-50 border border-teal-200 rounded-md p-3">
        <p className="text-sm text-teal-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-teal-700">Requires contact points, datacenter, and credentials.</p>
      </div>
    </div>
  );
};
