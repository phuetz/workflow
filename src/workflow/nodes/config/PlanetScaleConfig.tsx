/**
 * PlanetScale Node Configuration
 * MySQL-compatible serverless database
 */

import React, { useState } from 'react';

interface PlanetScaleConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const PlanetScaleConfig: React.FC<PlanetScaleConfigProps> = ({ config, onChange }) => {
  const [query, setQuery] = useState(config.query as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black font-mono text-sm" />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-sm text-gray-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-gray-700">MySQL-compatible connection. Requires host, database, username, and password.</p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600">
          <div><strong>Branching:</strong> Database branches for development</div>
          <div><strong>Scale:</strong> Automatic horizontal sharding</div>
        </p>
      </div>
    </div>
  );
};
