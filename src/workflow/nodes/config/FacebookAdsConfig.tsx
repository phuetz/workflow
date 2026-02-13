/**
 * Facebook Ads Node Configuration
 * Advertising platform for campaigns
 */

import React, { useState } from 'react';

interface FacebookAdsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const FacebookAdsConfig: React.FC<FacebookAdsConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'createCampaign');
  const [campaignName, setCampaignName] = useState(config.campaignName as string || '');
  const [objective, setObjective] = useState(config.objective as string || 'TRAFFIC');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const loadExample = () => {
    handleOperationChange('createCampaign');
    setCampaignName('Summer Sale 2024');
    setObjective('CONVERSIONS');
    onChange({
      ...config,
      operation: 'createCampaign',
      name: 'Summer Sale 2024',
      objective: 'CONVERSIONS',
      status: 'PAUSED',
      special_ad_categories: []
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-800"
        >
          <option value="createCampaign">Create Campaign</option>
          <option value="getCampaign">Get Campaign</option>
          <option value="updateCampaign">Update Campaign</option>
          <option value="getInsights">Get Insights</option>
          <option value="createAdSet">Create Ad Set</option>
          <option value="getAdSet">Get Ad Set</option>
        </select>
      </div>

      {operation === 'createCampaign' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Summer Sale 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-800"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objective
            </label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-800"
            >
              <option value="TRAFFIC">Traffic</option>
              <option value="CONVERSIONS">Conversions</option>
              <option value="LEAD_GENERATION">Lead Generation</option>
              <option value="BRAND_AWARENESS">Brand Awareness</option>
              <option value="REACH">Reach</option>
              <option value="VIDEO_VIEWS">Video Views</option>
            </select>
          </div>
        </>
      )}

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Campaign
      </button>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">
          Requires Access Token and Ad Account ID (act_XXXXXXXXX). Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v18.0 Marketing API</div>
          <div><strong>Rate Limits:</strong> 200 calls per hour per user</div>
          <div><strong>Documentation:</strong> developers.facebook.com/docs/marketing-apis</div>
        </p>
      </div>
    </div>
  );
};
