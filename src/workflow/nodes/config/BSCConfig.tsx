/**
 * Binance Smart Chain Node Configuration
 */

import React, { useState } from 'react';

interface BSCConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const BSC: React.FC<BSCConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getBalance');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500">
          <option value="getBalance">Get Balance</option>
          <option value="sendTransaction">Send Transaction</option>
          <option value="getTransactionHistory">Get Transaction History</option>
        </select>
      </div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <p className="text-sm text-yellow-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-yellow-700">Requires Binance Smart Chain API credentials.</p>
      </div>
    </div>
  );
};
