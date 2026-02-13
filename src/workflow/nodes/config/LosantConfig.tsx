/**
 * Losant Node Configuration
 */

import React, { useState } from 'react';

interface LosantConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const Losant: React.FC<LosantConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'sendData');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500">
          <option value="sendData">Send Data</option>
          <option value="getData">Get Data</option>
          <option value="updateDevice">Update Device</option>
        </select>
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
        <p className="text-sm text-orange-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-orange-700">Requires Losant API credentials.</p>
      </div>
    </div>
  );
};
