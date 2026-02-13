/**
 * Bill.com Node Configuration
 */

import React, { useState } from 'react';

interface BillConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const Bill: React.FC<BillConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getInvoices');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-cyan-500">
          <option value="getInvoices">Get Invoices</option>
          <option value="createInvoice">Create Invoice</option>
          <option value="getCustomers">Get Customers</option>
        </select>
      </div>
      <div className="bg-cyan-50 border border-cyan-200 rounded-md p-3">
        <p className="text-sm text-cyan-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-cyan-700">Requires Bill.com API credentials.</p>
      </div>
    </div>
  );
};
