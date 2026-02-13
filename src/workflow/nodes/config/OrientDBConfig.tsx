/**
 * OrientDB Node Configuration
 * Multi-model database (graph, document, key-value)
 */

import React, { useState } from 'react';

interface OrientDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const OrientDBConfig: React.FC<OrientDBConfigProps> = ({ config, onChange }) => {
  const [query, setQuery] = useState(config.query as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT FROM V WHERE name = 'John'" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 font-mono text-sm" />
      </div>
      <div className="bg-pink-50 border border-pink-200 rounded-md p-3">
        <p className="text-sm text-pink-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-pink-700">Requires OrientDB server URL, database, username, and password.</p>
      </div>
    </div>
  );
};
