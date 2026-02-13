/**
 * Google Analytics Node Configuration
 * Web analytics and reporting
 */

import React, { useState } from 'react';

interface GoogleAnalyticsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const GoogleAnalyticsConfig: React.FC<GoogleAnalyticsConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getReport');
  const [viewId, setViewId] = useState(config.viewId as string || '');
  const [startDate, setStartDate] = useState(config.startDate as string || '30daysAgo');
  const [endDate, setEndDate] = useState(config.endDate as string || 'today');

  const handleOperationChange = (value: string) => {
    setOperation(value);
    onChange({ ...config, operation: value });
  };

  const handleViewIdChange = (value: string) => {
    setViewId(value);
    onChange({ ...config, viewId: value });
  };

  const loadExample = () => {
    handleOperationChange('getReport');
    handleViewIdChange('123456789');
    setStartDate('30daysAgo');
    setEndDate('today');
    onChange({
      ...config,
      operation: 'getReport',
      viewId: '123456789',
      metrics: ['ga:sessions', 'ga:users', 'ga:pageviews'],
      dimensions: ['ga:country', 'ga:deviceCategory']
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        >
          <option value="getReport">Get Report</option>
          <option value="getRealtime">Get Realtime Data</option>
          <option value="trackEvent">Track Event</option>
          <option value="trackPageview">Track Pageview</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          View ID
        </label>
        <input
          type="text"
          value={viewId}
          onChange={(e) => handleViewIdChange(e.target.value)}
          placeholder="123456789"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          Google Analytics View ID (found in Admin settings)
        </p>
      </div>

      <button
        onClick={loadExample}
        className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
      >
        Load Example Report
      </button>

      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">
          Requires OAuth 2.0 access token. Configure in Credentials Manager.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
        <p className="text-xs text-gray-600 space-y-1">
          <div><strong>API Version:</strong> v4 Reporting API</div>
          <div><strong>Metrics:</strong> ga:sessions, ga:users, ga:pageviews, ga:bounceRate</div>
          <div><strong>Dimensions:</strong> ga:country, ga:deviceCategory, ga:source</div>
          <div><strong>Documentation:</strong> developers.google.com/analytics/devguides/reporting</div>
        </p>
      </div>
    </div>
  );
};
