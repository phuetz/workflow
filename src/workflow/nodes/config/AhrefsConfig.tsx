/**
 * Ahrefs Node Configuration
 * SEO toolset and backlink analysis
 */

import React, { useState } from 'react';

interface AhrefsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const AhrefsConfig: React.FC<AhrefsConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'domainRating');
  const [target, setTarget] = useState(config.target as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500">
          <option value="domainRating">Domain Rating</option>
          <option value="backlinks">Backlinks</option>
          <option value="organicKeywords">Organic Keywords</option>
          <option value="topPages">Top Pages</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target (Domain or URL)</label>
        <input type="text" value={target} onChange={(e) => { setTarget(e.target.value); onChange({ ...config, target: e.target.value }); }}
          placeholder="example.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500" />
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">Requires Ahrefs API token.</p>
      </div>
    </div>
  );
};
