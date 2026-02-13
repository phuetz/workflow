/**
 * TikTok Ads Node Configuration
 */

import React, { useState } from 'react';

interface TikTokAdsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const TikTokAdsConfig: React.FC<TikTokAdsConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getCampaigns');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500">
          <option value="getCampaigns">Get Campaigns</option>
          <option value="createCampaign">Create Campaign</option>
          <option value="getReports">Get Reports</option>
        </select>
      </div>
      <div className="bg-pink-50 border border-pink-200 rounded-md p-3">
        <p className="text-sm text-pink-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-pink-700">Requires TikTok for Business API access token.</p>
      </div>
    </div>
  );
};
