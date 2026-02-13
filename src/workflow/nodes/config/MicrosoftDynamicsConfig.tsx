/**
 * Microsoft Dynamics Node Configuration
 */

import React, { useState } from 'react';

interface MicrosoftDynamicsConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const MicrosoftDynamics: React.FC<MicrosoftDynamicsConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getInvoices');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
          <option value="getInvoices">Get Invoices</option>
          <option value="createInvoice">Create Invoice</option>
          <option value="getCustomers">Get Customers</option>
        </select>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-blue-700">Requires Microsoft Dynamics API credentials.</p>
      </div>
    </div>
  );
};
