/**
 * Google Maps Node Configuration
 * Google Maps geocoding and directions
 * AGENT 9: Node Library Expansion
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface GoogleMapsConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

export const GoogleMapsConfig: React.FC<GoogleMapsConfigProps> = ({ config, onChange }) => {
  const [apiKey, setApiKey] = useState((config.apiKey as string) || '');
  const [operation, setOperation] = useState((config.operation as string) || 'geocode');

  return (
    <div className="googlemaps-config space-y-4">
      <div className="font-semibold text-lg mb-4">Google Maps</div>

      <div className="p-3 bg-blue-50 rounded text-sm mb-4">
        <strong>🔐 Authentication</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            onChange({ ...config, apiKey: e.target.value });
          }}
          placeholder=""
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
        />
        
      </div>


      <div className="p-3 bg-green-50 rounded text-sm mb-4 mt-6">
        <strong>⚙️ Configuration</strong>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => {
            setOperation(e.target.value);
            onChange({ ...config, operation: e.target.value });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="geocode">Geocode Address</option>
          <option value="reverseGeocode">Reverse Geocode</option>
          <option value="directions">Get Directions</option>
          <option value="distance">Calculate Distance</option>
        </select>
        
      </div>

      <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
        <strong>📝 Note:</strong> Google Maps geocoding and directions. Configure your credentials above.
      </div>
    </div>
  );
};
