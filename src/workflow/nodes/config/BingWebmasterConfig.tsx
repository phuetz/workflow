/**
 * Bing Webmaster Tools Node Configuration
 */

import React, { useState } from 'react';

interface BingWebmasterConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const BingWebmasterConfig: React.FC<BingWebmasterConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getStats');
  const [siteUrl, setSiteUrl] = useState(config.siteUrl as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500">
          <option value="getStats">Get Stats</option>
          <option value="getKeywords">Get Keywords</option>
          <option value="submitUrl">Submit URL</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Site URL</label>
        <input type="text" value={siteUrl} onChange={(e) => { setSiteUrl(e.target.value); onChange({ ...config, siteUrl: e.target.value }); }}
          placeholder="https://example.com/" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500" />
      </div>
      <div className="bg-teal-50 border border-teal-200 rounded-md p-3">
        <p className="text-sm text-teal-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-teal-700">Requires Bing Webmaster API key.</p>
      </div>
    </div>
  );
};
