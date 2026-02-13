/**
 * LinkedIn Ads Node Configuration
 */

import React, { useState } from 'react';

interface LinkedInAdsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const LinkedInAdsConfig: React.FC<LinkedInAdsConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getCampaigns');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-600">
          <option value="getCampaigns">Get Campaigns</option>
          <option value="createCampaign">Create Campaign</option>
          <option value="getAnalytics">Get Analytics</option>
        </select>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">Requires LinkedIn OAuth 2.0 access token.</p>
      </div>
    </div>
  );
};
