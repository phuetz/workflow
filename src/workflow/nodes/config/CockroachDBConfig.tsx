/**
 * CockroachDB Node Configuration
 * Distributed SQL database
 */

import React, { useState } from 'react';

interface CockroachDBConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const CockroachDBConfig: React.FC<CockroachDBConfigProps> = ({ config, onChange }) => {
  const [query, setQuery] = useState(config.query as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 font-mono text-sm" />
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">PostgreSQL-compatible connection string with SSL.</p>
      </div>
    </div>
  );
};
