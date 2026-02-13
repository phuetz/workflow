/**
 * ArangoDB Node Configuration
 * Multi-model database
 */

import React, { useState } from 'react';

interface ArangoDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const ArangoDBConfig: React.FC<ArangoDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'query');
  const [query, setQuery] = useState(config.query as string || '');
  const [collection, setCollection] = useState(config.collection as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500">
          <option value="query">AQL Query</option>
          <option value="insert">Insert Document</option>
          <option value="update">Update Document</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
        <input type="text" value={collection} onChange={(e) => { setCollection(e.target.value); onChange({ ...config, collection: e.target.value }); }}
          placeholder="users" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">AQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="FOR doc IN users RETURN doc" rows={5}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 font-mono text-sm" />
      </div>
      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-700">Requires ArangoDB URL, database, username, and password.</p>
      </div>
    </div>
  );
};
