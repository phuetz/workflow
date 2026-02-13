/**
 * Google Analytics 4 Node Configuration
 */

import React, { useState } from 'react';

interface GA4ConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const GA4Config: React.FC<GA4ConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'runReport');
  const [propertyId, setPropertyId] = useState(config.propertyId as string || '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500">
          <option value="runReport">Run Report</option>
          <option value="trackEvent">Track Event</option>
          <option value="getRealtimeData">Get Realtime Data</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Property ID</label>
        <input type="text" value={propertyId} onChange={(e) => { setPropertyId(e.target.value); onChange({ ...config, propertyId: e.target.value }); }}
          placeholder="properties/123456789" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500" />
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">Requires Google OAuth 2.0 or service account.</p>
      </div>
    </div>
  );
};
