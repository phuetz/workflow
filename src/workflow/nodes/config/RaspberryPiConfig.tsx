/**
 * Raspberry Pi Node Configuration
 */

import React, { useState } from 'react';

interface RaspberryPiConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const RaspberryPi: React.FC<RaspberryPiConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'sendData');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500">
          <option value="sendData">Send Data</option>
          <option value="getData">Get Data</option>
          <option value="updateDevice">Update Device</option>
        </select>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-red-700">Requires Raspberry Pi API credentials.</p>
      </div>
    </div>
  );
};
