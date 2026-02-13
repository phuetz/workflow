/**
 * Avalanche Node Configuration
 */

import React, { useState } from 'react';

interface AvalancheConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const Avalanche: React.FC<AvalancheConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getBalance');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500">
          <option value="getBalance">Get Balance</option>
          <option value="sendTransaction">Send Transaction</option>
          <option value="getTransactionHistory">Get Transaction History</option>
        </select>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-red-700">Requires Avalanche API credentials.</p>
      </div>
    </div>
  );
};
