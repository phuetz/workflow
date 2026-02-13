/**
 * Neo4j Node Configuration
 * Graph database
 */

import React, { useState } from 'react';

interface Neo4jConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const Neo4jConfig: React.FC<Neo4jConfigProps> = ({ config, onChange }) => {
  const [query, setQuery] = useState(config.query as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cypher Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="MATCH (n:Person) RETURN n LIMIT 25" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm" />
      </div>
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">Requires Neo4j bolt URL, username, and password.</p>
      </div>
    </div>
  );
};
