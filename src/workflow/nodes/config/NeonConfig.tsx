/**
 * Neon Node Configuration
 * Serverless PostgreSQL
 */

import React, { useState } from 'react';

interface NeonConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const NeonConfig: React.FC<NeonConfigProps> = ({ config, onChange }) => {
  const [query, setQuery] = useState(config.query as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">SQL Query</label>
        <textarea value={query} onChange={(e) => { setQuery(e.target.value); onChange({ ...config, query: e.target.value }); }}
          placeholder="SELECT * FROM analytics WHERE date >= CURRENT_DATE - INTERVAL '7 days'" rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm" />
      </div>
      <div className="bg-green-50 border border-green-200 rounded-md p-3">
        <p className="text-sm text-green-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-green-700">PostgreSQL-compatible connection string with SSL.</p>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600">
          <div><strong>Autoscaling:</strong> Scale to zero when idle</div>
          <div><strong>Branching:</strong> Instant database branches</div>
        </p>
      </div>
    </div>
  );
};
