/**
 * Adafruit IO Node Configuration
 */

import React, { useState } from 'react';

interface AdafruitIOConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const AdafruitIO: React.FC<AdafruitIOConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'sendData');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black-500">
          <option value="sendData">Send Data</option>
          <option value="getData">Get Data</option>
          <option value="updateDevice">Update Device</option>
        </select>
      </div>
      <div className="bg-black-50 border border-black-200 rounded-md p-3">
        <p className="text-sm text-black-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-black-700">Requires Adafruit IO API credentials.</p>
      </div>
    </div>
  );
};
