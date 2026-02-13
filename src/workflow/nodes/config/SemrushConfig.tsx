/**
 * Semrush Node Configuration
 * SEO and digital marketing analytics
 */

import React, { useState } from 'react';

interface SemrushConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const SemrushConfig: React.FC<SemrushConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'domainOverview');
  const [domain, setDomain] = useState(config.domain as string || '');
  const [keyword, setKeyword] = useState(config.keyword as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
          <option value="domainOverview">Domain Overview</option>
          <option value="keywordResearch">Keyword Research</option>
          <option value="backlinks">Backlinks Analysis</option>
          <option value="organicResearch">Organic Research</option>
          <option value="rankTracking">Rank Tracking</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
        <input type="text" value={domain} onChange={(e) => { setDomain(e.target.value); onChange({ ...config, domain: e.target.value }); }}
          placeholder="example.com" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
      </div>
      {(operation === 'keywordResearch' || operation === 'rankTracking') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
          <input type="text" value={keyword} onChange={(e) => { setKeyword(e.target.value); onChange({ ...config, keyword: e.target.value }); }}
            placeholder="digital marketing" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">Requires Semrush API key.</p>
      </div>
    </div>
  );
};
