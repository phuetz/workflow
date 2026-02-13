/**
 * Moz Node Configuration
 * SEO software and data
 */

import React, { useState } from 'react';

interface MozConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MozConfig: React.FC<MozConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'urlMetrics');
  const [url, setUrl] = useState(config.url as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500">
          <option value="urlMetrics">URL Metrics</option>
          <option value="linkMetrics">Link Metrics</option>
          <option value="keywordDifficulty">Keyword Difficulty</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL/Target</label>
        <input type="text" value={url} onChange={(e) => { setUrl(e.target.value); onChange({ ...config, url: e.target.value }); }}
          placeholder="https://example.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-md p-3">
        <p className="text-sm text-indigo-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-indigo-700">Requires Moz API access ID and secret key.</p>
      </div>
    </div>
  );
};
