/**
 * SurrealDB Node Configuration
 * Modern multi-model database
 */

import React, { useState } from 'react';

interface SurrealDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SurrealDBConfig: React.FC<SurrealDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'query');
  const [query, setQuery] = useState(config.query as string || '');
  const [namespace, setNamespace] = useState(config.namespace as string || 'test');
  const [database, setDatabase] = useState(config.database as string || 'test');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500">
          <option value="query">SurrealQL Query</option>
          <option value="create">Create Record</option>
          <option value="update">Update Record</option>
          <option value="delete">Delete Record</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
          <input type="text" value={namespace} onChange={(e) => { setNamespace(e.target.value); onChange({ ...config, namespace: e.target.value }); }}
            placeholder="test" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
          <input type="text" value={database} onChange={(e) => { setDatabase(e.target.value); onChange({ ...config, database: e.target.value }); }}
            placeholder="test" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SurrealQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT * FROM users WHERE age > 18" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500 font-mono text-sm" />
      </div>
      <div className="bg-cyan-50 border border-cyan-200 rounded-md p-3">
        <p className="text-sm text-cyan-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-cyan-700">Requires SurrealDB URL, namespace, database, and credentials.</p>
      </div>
    </div>
  );
};
