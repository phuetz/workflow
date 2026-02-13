/**
 * Twitter Ads Node Configuration
 */

import React, { useState } from 'react';

interface TwitterAdsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const TwitterAdsConfig: React.FC<TwitterAdsConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getCampaigns');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-sky-500">
          <option value="getCampaigns">Get Campaigns</option>
          <option value="createCampaign">Create Campaign</option>
          <option value="getAnalytics">Get Analytics</option>
        </select>
      </div>
      <div className="bg-sky-50 border border-sky-200 rounded-md p-3">
        <p className="text-sm text-sky-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-sky-700">Requires Twitter Ads API credentials.</p>
      </div>
    </div>
  );
};
