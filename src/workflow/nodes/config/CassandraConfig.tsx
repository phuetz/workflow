/**
 * Apache Cassandra Node Configuration
 * Distributed NoSQL database
 */

import React, { useState } from 'react';

interface CassandraConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const CassandraConfig: React.FC<CassandraConfigProps> = ({ config, onChange }) => {
  const [query, setQuery] = useState(config.query as string || '');
  const [keyspace, setKeyspace] = useState(config.keyspace as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keyspace</label>
        <input type="text" value={keyspace} onChange={(e) => { setKeyspace(e.target.value); onChange({ ...config, keyspace: e.target.value }); }}
          placeholder="system" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT * FROM users WHERE id = ?" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm" />
      </div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
        <p className="text-sm text-indigo-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-indigo-700">Requires contact points, port, username, and password.</p>
      </div>
    </div>
  );
};
