/**
 * FaunaDB Node Configuration
 * Serverless distributed database
 */

import React, { useState } from 'react';

interface FaunaDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const FaunaDBConfig: React.FC<FaunaDBConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'query');
  const [query, setQuery] = useState(config.query as string || '');
  const [collection, setCollection] = useState(config.collection as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500">
          <option value="query">FQL Query</option>
          <option value="create">Create Document</option>
          <option value="update">Update Document</option>
          <option value="delete">Delete Document</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
        <input type="text" value={collection} onChange={(e) => { setCollection(e.target.value); onChange({ ...config, collection: e.target.value }); }}
          placeholder="users" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">FQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="Map(Paginate(Documents(Collection('users'))), Lambda('ref', Get(Var('ref'))))" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 font-mono text-sm" />
      </div>
      <div className="bg-violet-50 border border-violet-200 rounded-md p-3">
        <p className="text-sm text-violet-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-violet-700">Requires Fauna secret key.</p>
      </div>
    </div>
  );
};
