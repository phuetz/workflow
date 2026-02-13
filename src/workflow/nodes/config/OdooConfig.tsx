/**
 * Odoo Node Configuration
 */

import React, { useState } from 'react';

interface OdooConfigProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
}

export const Odoo: React.FC<OdooConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState(config.operation as string || 'getInvoices');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
        <select value={operation} onChange={(e) => { setOperation(e.target.value); onChange({ ...config, operation: e.target.value }); }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500">
          <option value="getInvoices">Get Invoices</option>
          <option value="createInvoice">Create Invoice</option>
          <option value="getCustomers">Get Customers</option>
        </select>
      </div>
      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
        <p className="text-sm text-purple-900 font-medium mb-1">Authentication</p>
        <p className="text-xs text-purple-700">Requires Odoo API credentials.</p>
      </div>
    </div>
  );
};
