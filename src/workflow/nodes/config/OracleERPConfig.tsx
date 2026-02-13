/**
 * Oracle ERP Node Configuration
 */

import React, { useState } from 'react';

interface OracleERPConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const OracleERP: React.FC<OracleERPConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getInvoices');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500">
          <option value="getInvoices">Get Invoices</option>
          <option value="createInvoice">Create Invoice</option>
          <option value="getCustomers">Get Customers</option>
        </select>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-md p-3">
        <p className="text-sm text-red-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-red-700">Requires Oracle ERP API credentials.</p>
      </div>
    </div>
  );
};
