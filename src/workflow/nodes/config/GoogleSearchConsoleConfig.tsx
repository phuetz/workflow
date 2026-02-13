/**
 * Google Search Console Node Configuration
 * Website performance in Google Search
 */

import React, { useState } from 'react';

interface GoogleSearchConsoleConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const GoogleSearchConsoleConfig: React.FC<GoogleSearchConsoleConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'searchAnalytics');
  const [siteUrl, setSiteUrl] = useState(config.siteUrl as string || '');
  const [startDate, setStartDate] = useState(config.startDate as string || '');
  const [endDate, setEndDate] = useState(config.endDate as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
          <option value="searchAnalytics">Search Analytics</option>
          <option value="sitemaps">Sitemaps</option>
          <option value="urlInspection">URL Inspection</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Site URL</label>
        <input type="text" value={siteUrl} onChange={(e) => { setSiteUrl(e.target.value); onChange({ ...config, siteUrl: e.target.value }); }}
          placeholder="https://example.com/" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); onChange({ ...config, startDate: e.target.value }); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); onChange({ ...config, endDate: e.target.value }); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">Requires Google OAuth 2.0 authorization.</p>
      </div>
    </div>
  );
};
